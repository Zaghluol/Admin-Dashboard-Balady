import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '@core/services/adminservice';
import { ToastService } from '@core/services/toast.service';
import type { AdminUser } from '@core/interfaces/Index';

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule],
  template: `
    <section>
      <header class="page-header">
        <div>
          <h1>Users</h1>
          <p>Browse customers, spending, orders, roles, and account status.</p>
        </div>
        <button type="button" class="btn-secondary" (click)="loadUsers()" [disabled]="loading()">
          {{ loading() ? 'Refreshing...' : 'Refresh' }}
        </button>
      </header>

      <div class="panel toolbar">
        <label class="field">
          Search
          <input type="search" [(ngModel)]="search" (keyup.enter)="loadUsers(1)" placeholder="Name or email" />
        </label>
        <button type="button" class="btn-secondary" (click)="loadUsers(1)">Search</button>
      </div>

      <div class="users-grid">
        <div class="panel table-wrap">
          @if (loading()) {
            <div class="empty-state">Loading users...</div>
          } @else if (!users().length) {
            <div class="empty-state">No users found.</div>
          } @else {
            <table class="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Roles</th>
                  <th>Orders</th>
                  <th>Spending</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr [class.selected]="selectedUser()?.id === user.id">
                    <td>
                      <strong>{{ user.fullName }}</strong>
                      <small>{{ user.email }}</small>
                    </td>
                    <td>{{ user.roles.join(', ') || 'Customer' }}</td>
                    <td>{{ user.totalOrders ?? 0 }}</td>
                    <td>{{ user.totalSpent ?? 0 | currency:'USD':'symbol':'1.2-2' }}</td>
                    <td><span class="badge">{{ user.isActive ? 'Active' : 'Inactive' }}</span></td>
                    <td><button type="button" class="btn-secondary" (click)="selectUser(user)">Details</button></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>

        <aside class="panel details">
          @if (detailsLoading()) {
            <div class="empty-state">Loading user details...</div>
          } @else if (selectedUser(); as user) {
            <h2>{{ user.fullName }}</h2>
            <p class="muted">{{ user.email }}</p>
            <p class="muted">{{ user.phoneNumber || 'No phone number' }}</p>
            <dl>
              <div><dt>Total orders</dt><dd>{{ user.totalOrders ?? 0 }}</dd></div>
              <div><dt>Total spending</dt><dd>{{ user.totalSpent ?? 0 | currency:'USD':'symbol':'1.2-2' }}</dd></div>
              <div><dt>Joined</dt><dd>{{ user.createdAt | date:'mediumDate' }}</dd></div>
              <div><dt>Account</dt><dd>{{ user.isActive ? 'Active' : 'Inactive' }}</dd></div>
            </dl>
          } @else {
            <div class="empty-state">Select a user to review account details.</div>
          }
        </aside>
      </div>

      <div class="pagination">
        <button type="button" class="btn-secondary" (click)="loadUsers(page() - 1)" [disabled]="page() <= 1">Previous</button>
        <span>Page {{ page() }} of {{ totalPages() }}</span>
        <button type="button" class="btn-secondary" (click)="loadUsers(page() + 1)" [disabled]="page() >= totalPages()">Next</button>
      </div>
    </section>
  `,
  styles: [`
    .toolbar {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.75rem;
      align-items: end;
      margin-bottom: 1rem;
      padding: 1rem;
    }

    .users-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem);
      gap: 1rem;
    }

    .table-wrap {
      overflow-x: auto;
    }

    tr.selected {
      background: rgba(99, 102, 241, 0.08);
    }

    td small {
      display: block;
      color: var(--text-secondary);
    }

    .details {
      padding: 1rem;
    }

    h2 {
      margin: 0;
      font-size: 1.15rem;
    }

    dl {
      display: grid;
      gap: 0.75rem;
      margin: 1rem 0 0;
    }

    dl div {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      border-bottom: 1px solid var(--border-light);
      padding-bottom: 0.5rem;
    }

    dt {
      color: var(--text-secondary);
    }

    dd {
      margin: 0;
      font-weight: 700;
    }

    .pagination {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-top: 1rem;
    }

    @media (max-width: 980px) {
      .users-grid,
      .toolbar {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .toolbar,
      .details {
        padding: 0.85rem;
      }

      dl div,
      .pagination {
        display: grid;
      }

      .pagination .btn-secondary {
        width: 100%;
      }
    }
  `],
})
export class UsersComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected search = '';
  protected readonly users = signal<AdminUser[]>([]);
  protected readonly selectedUser = signal<AdminUser | null>(null);
  protected readonly page = signal(1);
  protected readonly totalPages = signal(1);
  protected readonly loading = signal(false);
  protected readonly detailsLoading = signal(false);

  ngOnInit() {
    this.loadUsers();
  }

  protected loadUsers(page = this.page()) {
    this.loading.set(true);
    this.admin.getUsers({ search: this.search, page, pageSize: 10 }).subscribe({
      next: result => {
        this.users.set(result.items);
        this.page.set(result.page);
        this.totalPages.set(Math.max(result.totalPages, 1));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.open('Users could not be loaded.');
      },
    });
  }

  protected selectUser(user: AdminUser) {
    this.detailsLoading.set(true);
    this.admin.getUser(user.id).subscribe({
      next: detail => {
        this.selectedUser.set(detail);
        this.detailsLoading.set(false);
      },
      error: () => {
        this.selectedUser.set(user);
        this.detailsLoading.set(false);
        this.toast.open('Full user details could not be loaded.');
      },
    });
  }
}
