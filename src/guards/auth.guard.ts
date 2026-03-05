import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { UserStore } from '../services/user.store';

/**
 * Protects routes that require authentication.
 * Reads from the UserStore's computed isAuthenticated signal.
 */
export const authGuard: CanActivateFn = () => {
  const store = inject(UserStore);
  const router = inject(Router);

  return store.isAuthenticated() ? true : router.parseUrl('/login');
};

/**
 * Redirects authenticated users away from public routes (login, register).
 */
export const publicGuard: CanActivateFn = () => {
  const store = inject(UserStore);
  const router = inject(Router);

  return store.isAuthenticated() ? router.parseUrl('/wealth') : true;
};
