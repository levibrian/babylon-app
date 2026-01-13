import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError } from 'rxjs/operators';
import { of, Observable, lastValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { SocialAuthService } from '@abacritt/angularx-social-login';

export interface User {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
}

interface AuthResponse {
  token: string;
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  photoUrl?: string;
  // Make these optional to handle potential PascalCase from some backends
  Token?: string;
  RefreshToken?: string;
  refreshToken?: string;
  Username?: string;
  Email?: string;
  UserId?: string;
  PhotoUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private socialAuthService = inject(SocialAuthService);
  private router = inject(Router);

  private readonly _currentUser = signal<User | null>(this.getUserFromStorage());
  public readonly currentUser = this._currentUser.asReadonly();
  public readonly isAuthenticated = computed(() => !!this._currentUser());

  private readonly apiUrl = `${environment.apiUrl}/api/v1/auth`;

  constructor() {
    this.socialAuthService.authState.subscribe((user) => {
      if (user) {
        this.loginWithGoogle(user.idToken);
      }
    });
  }

  private getUserFromStorage(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      console.error('Error parsing user from storage', e);
      localStorage.removeItem('user');
      return null;
    }
  }

  async loginWithGoogle(idToken: string): Promise<void> {
    try {
      console.log('Logging in with Google, token exists:', !!idToken);
      const response = await lastValueFrom(
        this.http.post<AuthResponse>(`${this.apiUrl}/google`, { idToken })
      );
      console.log('Auth API Response:', response);
      this.handleAuthSuccess(response);
    } catch (error) {
      console.error('Google login failed:', error);
    }
  }

  private handleAuthSuccess(response: AuthResponse): void {
    const token = response.token || response.Token;
    const refreshToken = response.refreshToken || response.RefreshToken;

    if (token) {
      localStorage.setItem('token', token);
      
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }

      const user: User = {
        id: response.id,
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
        name: response.name,
        photoUrl: response.photoUrl || response.PhotoUrl
      };
      
      localStorage.setItem('user', JSON.stringify(user));
      this._currentUser.set(user);
      console.log('User state set, navigating to wealth...');
      this.router.navigate(['/wealth']);
    } else {
      console.error('Login failed: Invalid response structure');
    }
  }

  async logout(manual: boolean = false): Promise<void> {
    console.log(`Logging out (manual: ${manual})`);
    
    // Call backend to revoke refresh token if we have one
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await lastValueFrom(
          this.http.post(`${this.apiUrl}/logout`, { refreshToken })
        );
      } catch (err) {
        console.warn('Backend logout failed', err);
      }
    }

    this.clearSession();
    
    // Only call social signOut if it was a manual user action
    // Forcefully signing out on 401 can cause GIS (Google Identity Services) to crash or fail re-init
    if (manual) {
      this.socialAuthService.signOut().catch((err) => {
        console.warn('Social sign out failed or already signed out:', err);
      });
    }
    
    this.router.navigate(['/login']);
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this._currentUser.set(null);
  }

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await lastValueFrom(
        this.http.post<AuthResponse>(`${this.apiUrl}/refresh`, { refreshToken })
      );
      
      this.handleAuthSuccess(response);
      return response.token || response.Token || '';
    } catch (error) {
      console.error('Refresh token failed:', error);
      this.logout(false);
      throw error;
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password })
      );
      this.handleAuthSuccess(response);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  async register(email: string, password: string, firstName?: string, lastName?: string): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.http.post<AuthResponse>(`${this.apiUrl}/register`, { email, password, firstName, lastName })
      );
      this.handleAuthSuccess(response);
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  async updateProfile(data: Partial<User>): Promise<void> {
    try {
      const user = await lastValueFrom(
        this.http.put<User>(`${environment.apiUrl}/api/v1/users/me`, data)
      );
      this._currentUser.set(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }
  }

  async setPassword(password: string): Promise<void> {
    try {
      await lastValueFrom(
        this.http.post(`${environment.apiUrl}/api/v1/users/me/password`, { password })
      );
    } catch (error) {
      console.error('Failed to set password:', error);
      throw error;
    }
  }

  async fetchProfile(): Promise<void> {
    try {
      const user = await lastValueFrom(
        this.http.get<User>(`${environment.apiUrl}/api/v1/users/me`)
      );
      this._currentUser.set(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  }
}
