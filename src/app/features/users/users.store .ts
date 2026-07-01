import { Injectable, inject, signal } from '@angular/core';
import { AdminService } from '@core/services/adminservice';
import type { AdminUser, PaginatedResult } from '@core/interfaces/Index';

@Injectable({ providedIn: 'root' })
export class UsersStore {
  private adminService = inject(AdminService);

  readonly result  = signal<PaginatedResult<AdminUser> | null>(null);
  readonly loading = signal(false);

  load(params?: Parameters<AdminService['getUsers']>[0]) {
    this.loading.set(true);
    this.adminService.getUsers(params).subscribe({
      next: data => { this.result.set(data); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }
}
