import { Injectable, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, from, lastValueFrom } from 'rxjs';
import { tap, map } from 'rxjs/operators';
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
  private store = inject(UserStore);

  private readonly apiUrl = `${environment.apiUrl}/api/v1/auth`;

  // ─── Re-export store signals for backward compatibility ─────────────────
  readonly currentUser = this.store.currentUser;
  readonly isAuthenticated = this.store.isAuthenticated;

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

  signInWithGoogle(): void {
    const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    sessionStorage.setItem('google_nonce', nonce);

    const params = new URLSearchParams({
      client_id: environment.googleClientId,
      redirect_uri: window.location.origin,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce,
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
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
  async logout(): Promise<void> {
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

  async updatePassword(password: string, currentPassword?: string): Promise<void> {
    await lastValueFrom(
      this.http.post(`${environment.apiUrl}/api/v1/me/password`, {
        ...(currentPassword ? { currentPassword } : {}),
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
