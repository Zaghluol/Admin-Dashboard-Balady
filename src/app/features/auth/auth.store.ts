import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from '@core/services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private authService = inject(AuthService);

  readonly user       = this.authService.user;
  readonly isLoggedIn = this.authService.isLoggedIn;
  readonly isAdmin    = this.authService.isAdmin;
  readonly userName   = computed(() => this.user()?.fullName ?? 'Admin');
  readonly userEmail  = computed(() => this.user()?.email ?? '');
}
