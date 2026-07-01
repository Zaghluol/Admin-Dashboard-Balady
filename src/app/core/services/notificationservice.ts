import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { environment } from '@env/environment';
import type { Notification } from '@core/interfaces/Index';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/notifications`;

  readonly unreadCount = signal(0);

  getNotifications() {
    return this.http.get<Notification[]>(this.base).pipe(
      tap(ns => this.unreadCount.set(ns.filter(n => !n.isRead).length))
    );
  }

  markRead(id: string) {
    return this.http.put<void>(`${this.base}/${id}/read`, {}).pipe(
      tap(() => this.unreadCount.update(c => Math.max(0, c - 1)))
    );
  }

  markAllRead() {
    return this.http.put<void>(`${this.base}/read-all`, {}).pipe(
      tap(() => this.unreadCount.set(0))
    );
  }

  deleteNotification(id: string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
