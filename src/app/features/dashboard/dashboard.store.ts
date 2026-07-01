import { Injectable, inject, signal } from '@angular/core';
import { AdminService } from '@core/services/adminservice';
import type { DashboardData } from '@core/interfaces/Index';

@Injectable({ providedIn: 'root' })
export class DashboardStore {
  private adminService = inject(AdminService);

  readonly data    = signal<DashboardData | null>(null);
  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.adminService.getDashboard().subscribe({
      next: data => { this.data.set(data); this.loading.set(false); },
      error: err  => { this.error.set(err.message); this.loading.set(false); },
    });
  }
}
