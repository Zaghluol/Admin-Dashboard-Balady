import { inject } from '@angular/core';
import {
  HttpInterceptorFn, HttpErrorResponse
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth    = inject(AuthService);
  const router  = inject(Router);
  const toast = inject(ToastService);

  // Auto logout if token expired
  if (auth.isTokenExpired() && auth.isLoggedIn()) {
    auth.logout();
    return throwError(() => new Error('Token expired'));
  }

  const token = auth.getToken();
  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      switch (err.status) {
        case 401:
          auth.logout();
          toast.open('Session expired. Please log in.', 'Close', { duration: 4000 });
          break;
        case 403:
          toast.open('Access denied.', 'Close', { duration: 4000 });
          router.navigate(['/dashboard']);
          break;
        case 500:
          toast.open('Server error. Please try again.', 'Close', { duration: 4000 });
          break;
      }
      return throwError(() => err);
    })
  );
};
