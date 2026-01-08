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
  Username?: string;
  Email?: string;
  UserId?: string;
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
    if (response.token) {
      localStorage.setItem('token', response.token);
      
      const user: User = {
        id: response.id,
        email: response.email,
        firstName: response.firstName,
        lastName: response.lastName,
        name: response.name,
        photoUrl: response.photoUrl
      };
      
      localStorage.setItem('user', JSON.stringify(user));
      this._currentUser.set(user);
      console.log('User state set, navigating to wealth...');
      this.router.navigate(['/wealth']);
    } else {
      console.error('Login failed: Invalid response structure');
    }
  }

  logout(manual: boolean = false): void {
    console.log(`Logging out (manual: ${manual})`);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this._currentUser.set(null);
    
    // Only call social signOut if it was a manual user action
    // Forcefully signing out on 401 can cause GIS (Google Identity Services) to crash or fail re-init
    if (manual) {
      this.socialAuthService.signOut().catch((err) => {
        console.warn('Social sign out failed or already signed out:', err);
      });
    }
    
    this.router.navigate(['/login']);
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
