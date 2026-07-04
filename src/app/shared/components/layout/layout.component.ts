import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

type NavItem = {
  label: string;
  route: string;
};

@Component({
  selector: 'app-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <main class="admin-shell page-shell">
      <aside class="sidebar panel">
        <div class="brand">
          <span class="brand-mark">M</span>
          <div>
            <strong>Masr Shop</strong>
            <span>Admin Console</span>
          </div>
        </div>

        <nav aria-label="Admin navigation">
          @for (item of navItems; track item.route) {
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
            >
              {{ item.label }}
            </a>
          }
        </nav>
      </aside>

      <section class="content">
        <header class="topbar panel">
          <div>
            <p>Signed in</p>
            <strong>{{ auth.user()?.email || 'Admin' }}</strong>
          </div>
          <button type="button" class="btn-primary" (click)="auth.logout()">Sign out</button>
        </header>

        <router-outlet />
      </section>
    </main>
  `,
  styles: [`
    .admin-shell {
      display: grid;
      grid-template-columns: 17rem minmax(0, 1fr);
      gap: 1rem;
      min-height: 100vh;
      padding: clamp(0.75rem, 2vw, 1rem);
    }

    .sidebar {
      position: sticky;
      top: 1rem;
      display: grid;
      gap: 1.5rem;
      align-self: start;
      min-height: calc(100vh - 2rem);
      padding: 1rem;
      min-width: 0;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.8rem;
    }

    .brand-mark {
      display: inline-grid;
      width: 2.5rem;
      height: 2.5rem;
      place-items: center;
      border-radius: 8px;
      background: var(--accent-indigo);
      color: #fff;
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 1.35rem;
      font-weight: 800;
    }

    .brand strong,
    .topbar strong {
      display: block;
      line-height: 1.2;
    }

    .brand span:not(.brand-mark),
    .topbar p {
      display: block;
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.82rem;
    }

    nav {
      display: grid;
      gap: 0.35rem;
    }

    nav a {
      display: flex;
      align-items: center;
      min-height: 2.5rem;
      padding: 0.65rem 0.75rem;
      border-radius: 8px;
      color: var(--text-secondary);
      text-decoration: none;
    }

    nav a:hover,
    nav a.active {
      background: var(--bg-hover);
      color: var(--text-primary);
    }

    .content {
      display: grid;
      grid-template-rows: auto 1fr;
      gap: 1rem;
      min-width: 0;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      min-height: 4.5rem;
      padding: 1rem;
    }

    @media (max-width: 980px) {
      .admin-shell {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: static;
        min-height: auto;
      }

      .brand {
        justify-content: space-between;
      }

      nav {
        grid-template-columns: repeat(5, minmax(7rem, 1fr));
        overflow-x: auto;
        padding-bottom: 0.25rem;
        scrollbar-width: thin;
      }
    }

    @media (max-width: 640px) {
      .admin-shell {
        gap: 0.75rem;
        padding: 0.65rem;
      }

      .sidebar,
      .topbar {
        padding: 0.75rem;
      }

      nav {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        overflow-x: visible;
      }

      .topbar {
        display: grid;
      }

      .topbar .btn-primary {
        width: 100%;
      }
    }
  `],
})
export class LayoutComponent {
  protected readonly auth = inject(AuthService);
  protected readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Orders', route: '/orders' },
    { label: 'Products', route: '/products' },
    { label: 'Categories', route: '/categories' },
    { label: 'Users', route: '/users' },
    { label: 'Reviews', route: '/reviews' },
    { label: 'Support', route: '/support' },
    { label: 'Notifications', route: '/notifications' },
    { label: 'Analytics', route: '/analytics' },
    { label: 'Settings', route: '/settings' },
  ];
}
