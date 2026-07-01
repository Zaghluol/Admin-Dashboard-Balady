import { Routes } from '@angular/router';
import { adminGuard, guestGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/orders/orders.component').then(m => m.OrdersComponent),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./features/products/products.component').then(m => m.ProductsComponent),
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./features/categories/categories.component').then(m => m.CategoriesComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users.component').then(m => m.UsersComponent),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/reviews/reviews.component').then(m => m.ReviewsComponent),
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./features/support/support.component').then(m => m.SupportComponent),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(m => m.NotificationsComponent),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(m => m.SettingsComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '/dashboard' },
];
