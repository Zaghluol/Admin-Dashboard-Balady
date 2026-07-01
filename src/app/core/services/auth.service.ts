import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError, timeout } from 'rxjs';
import { environment } from '@env/environment';
import type { LoginRequest, LoginResponse, AuthUser } from '@core/interfaces/Index';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';
const REMEMBER_KEY = 'admin_remember';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _token = signal<string | null>(this.loadToken());
  private _user  = signal<AuthUser | null>(this.loadUser());

  readonly token    = this._token.asReadonly();
  readonly user     = this._user.asReadonly();
  readonly isLoggedIn = computed(() => !!this._token());
  readonly isAdmin    = computed(() =>
    this._user()?.roles?.some(role => role.toLowerCase() === 'admin') ?? false
  );

  login(req: LoginRequest, rememberMe: boolean) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/Auth/login`, req)
      .pipe(
        timeout(15000),
        tap(res => {
          this.persistSession(res, rememberMe);
        }),
        catchError(err => throwError(() => err))
      );
  }

  logout() {
    this.clearSession();
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this._token();
  }

  refreshFromStorage() {
    const token = this.loadToken();
    const user  = this.loadUser();
    this._token.set(token);
    this._user.set(user);
  }

  private persistSession(res: LoginResponse, remember: boolean) {
    const token = this.extractToken(res);
    if (!token) {
      throw new Error('Login response did not include an auth token.');
    }

    const user = this.extractUser(res, token);
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
    storage.setItem(USER_KEY, JSON.stringify(user));
    if (remember) localStorage.setItem(REMEMBER_KEY, '1');
    this._token.set(token);
    this._user.set(user);
  }

  private extractToken(res: LoginResponse): string | null {
    const source = res.data ?? res;
    return (
      this.readString(source, 'token') ||
      this.readString(source, 'accessToken') ||
      this.readString(source, 'jwtToken')
    );
  }

  private extractUser(res: LoginResponse, token: string): AuthUser {
    const source = res.data ?? res;
    const responseUser = source.user;
    const tokenUser = this.decodeUserFromToken(token);

    return {
      id: responseUser?.id || tokenUser.id || '',
      fullName: responseUser?.fullName || tokenUser.fullName || responseUser?.email || tokenUser.email || 'Admin',
      email: responseUser?.email || tokenUser.email || '',
      roles: responseUser?.roles?.length ? responseUser.roles : tokenUser.roles,
    };
  }

  private decodeUserFromToken(token: string): AuthUser {
    const payload = this.decodeJwtPayload(token);

    return {
      id: this.readString(payload, 'nameid') ||
        this.readString(payload, 'sub') ||
        this.readString(payload, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier') ||
        '',
      fullName: this.readString(payload, 'name') ||
        this.readString(payload, 'unique_name') ||
        this.readString(payload, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name') ||
        '',
      email: this.readString(payload, 'email') ||
        this.readString(payload, 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress') ||
        '',
      roles: this.readRoles(payload),
    };
  }

  private decodeJwtPayload(token: string): Record<string, unknown> {
    try {
      const payload = token.split('.')[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
      return JSON.parse(atob(padded));
    } catch {
      return {};
    }
  }

  private readRoles(payload: Record<string, unknown>): string[] {
    const roleValue =
      payload['role'] ??
      payload['roles'] ??
      payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];

    if (Array.isArray(roleValue)) {
      return roleValue.filter((role): role is string => typeof role === 'string');
    }

    if (typeof roleValue === 'string') {
      return roleValue.split(',').map(role => role.trim()).filter(Boolean);
    }

    return [];
  }

  private readString(source: unknown, key: string): string | null {
    if (!source || typeof source !== 'object') return null;
    const value = (source as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : null;
  }

  private clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REMEMBER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
  }

  private loadToken(): string | null {
    return (
      localStorage.getItem(TOKEN_KEY) ||
      sessionStorage.getItem(TOKEN_KEY)
    );
  }

  private loadUser(): AuthUser | null {
    const raw =
      localStorage.getItem(USER_KEY) ||
      sessionStorage.getItem(USER_KEY);
    try { return raw ? JSON.parse(raw) : null; } catch { return null; }
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch { return true; }
  }
}
