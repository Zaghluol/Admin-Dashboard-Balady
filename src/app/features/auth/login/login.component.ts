import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '@core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  template: `
    <main class="login page-shell">
      <form class="panel" (ngSubmit)="submit()">
        <h1>Admin Login</h1>
        <label>
          Email
          <input name="email" type="email" [(ngModel)]="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" [(ngModel)]="password" required />
        </label>
        <label class="remember">
          <input name="rememberMe" type="checkbox" [(ngModel)]="rememberMe" />
          Remember me
        </label>
        @if (error()) {
          <p class="error">{{ error() }}</p>
        }
        <button class="btn-primary" type="submit" [disabled]="loading()">
          {{ loading() ? 'Signing in...' : 'Sign in' }}
        </button>
      </form>
    </main>
  `,
  styles: [`
    .login {
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 1rem;
    }

    form {
      display: grid;
      gap: 1rem;
      width: min(100%, 380px);
      padding: 1.5rem;
    }

    h1 {
      margin: 0 0 0.5rem;
      font-size: 1.5rem;
    }

    label {
      display: grid;
      gap: 0.35rem;
      color: var(--text-secondary);
    }

    input {
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-surface);
      color: var(--text-primary);
      padding: 0.7rem 0.8rem;
    }

    .remember {
      grid-template-columns: auto 1fr;
      align-items: center;
    }

    .remember input {
      width: auto;
    }

    .error {
      margin: 0;
      color: var(--accent-rose);
    }
  `],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected email = '';
  protected password = '';
  protected rememberMe = false;
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  submit() {
    this.loading.set(true);
    this.error.set(null);
   this.auth.login(
  { email: this.email, password: this.password },
  this.rememberMe
).subscribe({
      next: () => this.router.navigate(['/dashboard']),
      error: (err: unknown) => {
        this.error.set(this.getLoginErrorMessage(err));
        this.loading.set(false);
      },
    });
  }

  private getLoginErrorMessage(err: unknown): string {
    if (err instanceof Error && err.name === 'TimeoutError') {
      return 'Login request timed out. Please check your connection or try again.';
    }

    if (!(err instanceof HttpErrorResponse)) {
      return 'Unable to sign in. Please try again.';
    }

    if (err.status === 0) {
      return 'Cannot connect to the API server. Check the backend URL or start the backend.';
    }

    if (err.status === 401 || err.status === 400) {
      return 'Invalid email or password.';
    }

    if (err.error?.message) {
      return err.error.message;
    }

    return `Sign in failed. Server returned ${err.status}.`;
  }
}
