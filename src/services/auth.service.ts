import { Injectable, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, lastValueFrom } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { environment } from '../environments/environment';
import {
  BackendAuthResponse,
  User,
  RegisterPayload,
  LoginPayload,
  GooglePayload,
  RefreshPayload,
} from '../models/auth.models';
import { UserStore } from './user.store';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private socialAuthService = inject(SocialAuthService);
  private store = inject(UserStore);

  private readonly apiUrl = `${environment.apiUrl}/api/v1/auth`;

  // ─── Re-export store signals for backward compatibility ─────────────────
  readonly currentUser = this.store.currentUser;
  readonly isAuthenticated = this.store.isAuthenticated;

  constructor() {
    // Flows 1 & 2: Google SSO — triggered by the asl-google-signin-button
    this.socialAuthService.authState.subscribe((socialUser) => {
      if (socialUser?.idToken) {
        this.loginWithGoogle(socialUser.idToken);
      }
    });
  }

  // ─── Flow 1 & 2: Social — POST /auth/google ─────────────────────────────
  async loginWithGoogle(idToken: string): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.http.post<BackendAuthResponse>(`${this.apiUrl}/google`, {
          idToken,
        } satisfies GooglePayload)
      );
      this.handleAuthSuccess(response);
    } catch (error) {
      console.error('[AuthService] Google login failed:', error);
      throw error;
    }
  }

  // ─── Flow 3 & 4: Register — POST /auth/register ─────────────────────────
  // If the email already belongs to a Google user, the backend links the
  // accounts (Flow 4) and returns a success response — no special frontend logic needed.
  async register(username: string, email: string, password: string): Promise<void> {
    const response = await lastValueFrom(
      this.http.post<BackendAuthResponse>(`${this.apiUrl}/register`, {
        username,
        email,
        password,
      } satisfies RegisterPayload)
    );
    this.handleAuthSuccess(response);
  }

  // ─── Flow 5: Local Login — POST /auth/login ──────────────────────────────
  async login(emailOrUsername: string, password: string): Promise<void> {
    const response = await lastValueFrom(
      this.http.post<BackendAuthResponse>(`${this.apiUrl}/login`, {
        emailOrUsername,
        password,
      } satisfies LoginPayload)
    );
    this.handleAuthSuccess(response);
  }

  // ─── Flow 6: Silent Refresh — POST /auth/refresh ─────────────────────────
  // Returns an Observable<string> (new access token) so the interceptor
  // can subscribe and chain retry logic within the RxJS pipeline.
  refresh(): Observable<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('[AuthService] No refresh token in storage');
    }

    return this.http
      .post<BackendAuthResponse>(`${this.apiUrl}/refresh`, {
        refreshToken,
      } satisfies RefreshPayload)
      .pipe(
        tap((response) => this.handleAuthSuccess(response)),
        map((response) => response.data.token)
      );
  }

  // ─── Logout — POST /auth/logout ──────────────────────────────────────────
  async logout(manual = false): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await lastValueFrom(
          this.http.post(`${this.apiUrl}/logout`, { refreshToken })
        );
      } catch {
        // Silently ignore — we're logging out regardless
      }
    }

    this.clearSession();

    // Only sign out of Google when the user explicitly clicks "Log out".
    // Calling signOut() on a 401/session-expiry can crash the GIS library.
    if (manual) {
      this.socialAuthService.signOut().catch(() => {});
    }

    this.router.navigate(['/login']);
  }

  // ─── Session helpers ─────────────────────────────────────────────────────

  /** Called directly by the interceptor on refresh failure. */
  clearSession(): void {
    this.store.clearUser();
  }

  /** Whether the current user has a specific auth provider linked. */
  hasProvider(provider: string): boolean {
    return this.store.hasProvider(provider);
  }

  // ─── Profile management (used by ProfileSettingsComponent) ───────────────

  async updateProfile(data: Partial<User>): Promise<void> {
    const user = await lastValueFrom(
      this.http.put<User>(`${environment.apiUrl}/api/v1/users/me`, data)
    );
    this.store.setUser(user);
  }

  async setPassword(password: string): Promise<void> {
    await lastValueFrom(
      this.http.post(`${environment.apiUrl}/api/v1/users/me/password`, {
        password,
      })
    );
  }

  async fetchProfile(): Promise<void> {
    try {
      const user = await lastValueFrom(
        this.http.get<User>(`${environment.apiUrl}/api/v1/users/me`)
      );
      this.store.setUser(user);
    } catch (error) {
      console.error('[AuthService] Failed to fetch profile:', error);
    }
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private handleAuthSuccess(response: BackendAuthResponse): void {
    const { token, refreshToken, userId, username, email, authProvider } =
      response.data;

    // Persist tokens
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);

    // Normalise "Local,Google" → ['Local', 'Google']
    const authProviders = authProvider
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    const user: User = { id: userId, email, username, authProviders };
    this.store.setUser(user);

    this.router.navigate(['/wealth']);
  }
}
