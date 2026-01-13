import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, filter, take, tap } from 'rxjs/operators';
import { throwError, BehaviorSubject, from } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  let token = localStorage.getItem('token');

  // Do not add token for Auth endpoints
  if (req.url.includes('/api/v1/auth/')) {
    return next(req);
  }

  const addToken = (request: typeof req, tokenToAdd: string | null) => {
    if (tokenToAdd) {
      return request.clone({
        setHeaders: {
          Authorization: `Bearer ${tokenToAdd}`
        }
      });
    }
    return request;
  }

  let authReq = addToken(req, token);
  const authService = inject(AuthService);

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return from(authService.refreshToken()).pipe(
            switchMap((newToken) => {
              isRefreshing = false;
              refreshTokenSubject.next(newToken);
              return next(addToken(req, newToken));
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              // Logout handles navigation and storage clearing
              // Pass manual=false to avoid GIS signOut on 401/session expiry
              authService.logout(false); 
              return throwError(() => refreshErr);
            })
          );
        } else {
          // If refreshing, wait for the new token
          return refreshTokenSubject.pipe(
            filter(t => t !== null),
            take(1),
            switchMap(newToken => {
              return next(addToken(req, newToken));
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};
