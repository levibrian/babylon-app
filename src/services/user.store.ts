import { Injectable, signal, computed } from '@angular/core';
import { User } from '../models/auth.models';

const STORAGE_KEY = 'babylon_user';

@Injectable({ providedIn: 'root' })
export class UserStore {
  // ─── Private writable state ─────────────────────────────────────────────
  private readonly _currentUser = signal<User | null>(this.loadFromStorage());

  // ─── Public readonly signals ────────────────────────────────────────────
  readonly currentUser = this._currentUser.asReadonly();
  readonly isAuthenticated = computed(() => !!this._currentUser());
  readonly authProviders = computed(() => this._currentUser()?.authProviders ?? []);

  // ─── Mutations ──────────────────────────────────────────────────────────
  setUser(user: User): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this._currentUser.set(user);
  }

  clearUser(): void {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    this._currentUser.set(null);
  }

  // ─── Helpers ────────────────────────────────────────────────────────────

  /** Check whether the current user has a specific auth provider linked. */
  hasProvider(provider: string): boolean {
    return this.authProviders().some(
      (p) => p.toLowerCase() === provider.toLowerCase()
    );
  }

  // ─── Private ────────────────────────────────────────────────────────────
  private loadFromStorage(): User | null {
    // Support both old key ('user') and new key for a smooth migration
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('user');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      // Migrate old user shape (no authProviders) to new shape
      if (!parsed.authProviders) {
        parsed.authProviders = ['Local'];
        // Use username fallback from old name field if present
        if (!parsed.username && parsed.name) {
          parsed.username = parsed.name;
        }
      }
      return parsed as User;
    } catch {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('user');
      return null;
    }
  }
}
