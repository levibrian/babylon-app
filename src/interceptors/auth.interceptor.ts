import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { throwError, BehaviorSubject } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { UserStore } from '../services/user.store';

// ─── Module-level Semaphore ───────────────────────────────────────────────────
// Shared across all interceptor invocations in the same app instance.
// This ensures that when multiple requests fail with 401 simultaneously,
// only one refresh call is made and the rest queue here.
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const userStore = inject(UserStore);

  // ── 1. Skip token injection for auth endpoints (they don't need a JWT) ──
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  // ── 2. Attach current access token ──────────────────────────────────────
  const token = localStorage.getItem('token');
  const authorizedReq = withBearerToken(req, token);

  return next(authorizedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        // Pass non-401 errors through unchanged
        return throwError(() => error);
      }

      // ── 3. Handle 401 ────────────────────────────────────────────────────
      if (!isRefreshing) {
        // ── 3a. We are the first request to 401 → trigger refresh ──────────
        isRefreshing = true;
        refreshTokenSubject.next(null); // Signal "refresh in progress" to queued requests

        return authService.refresh().pipe(
          switchMap((newToken) => {
            isRefreshing = false;
            refreshTokenSubject.next(newToken); // Unblock all queued requests
            return next(withBearerToken(req, newToken));
          }),
          catchError((refreshErr) => {
            // Refresh token is expired/revoked → force logout
            isRefreshing = false;
            refreshTokenSubject.next(null);
            userStore.clearUser();
            router.navigate(['/login']);
            return throwError(() => refreshErr);
          })
        );
      } else {
        // ── 3b. A refresh is already in progress → queue this request ───────
        // Wait until refreshTokenSubject emits a real token, then retry.
        return refreshTokenSubject.pipe(
          filter((token): token is string => token !== null),
          take(1),
          switchMap((newToken) => next(withBearerToken(req, newToken)))
        );
      }
    })
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isAuthEndpoint(url: string): boolean {
  return url.includes('/api/v1/auth/');
}

function withBearerToken(
  req: HttpRequest<unknown>,
  token: string | null
): HttpRequest<unknown> {
  if (!token) return req;
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
