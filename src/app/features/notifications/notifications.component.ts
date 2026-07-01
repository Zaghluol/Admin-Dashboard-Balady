import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationService } from '@core/services/notificationservice';
import { SignalRService } from '@core/services/signalr.service ';
import { ToastService } from '@core/services/toast.service';
import type { Notification as AdminNotification } from '@core/interfaces/Index';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule, RouterLink],
  template: `
    <section>
      <header class="page-header">
        <div>
          <h1>Notifications</h1>
          <p>Review admin alerts and keep the queue tidy.</p>
        </div>
        <div class="header-actions">
          <button type="button" class="btn-secondary" (click)="markAllRead()" [disabled]="!unreadCount()">Mark all read</button>
          <button type="button" class="btn-secondary" (click)="loadNotifications()" [disabled]="loading()">
            {{ loading() ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>
      </header>

      <div class="panel summary">
        <strong>{{ unreadCount() }}</strong>
        <span>Unread notifications</span>
      </div>

      <div class="list">
        @if (loading()) {
          <div class="panel empty-state">Loading notifications...</div>
        } @else if (!notifications().length) {
          <div class="panel empty-state">No notifications.</div>
        } @else {
          @for (notification of notifications(); track notification.id) {
            <article class="panel notification" [class.unread]="!notification.isRead">
              <div>
                <span class="badge">{{ notification.type }}</span>
                <h2>{{ notification.title }}</h2>
                <p>{{ notification.message }}</p>
                <small>{{ notification.createdAt | date:'medium' }}</small>
              </div>
              <div class="actions">
                @if (notification.link) {
                  <a class="btn-secondary" [routerLink]="notification.link">Open</a>
                }
                <button type="button" class="btn-secondary" (click)="markRead(notification)" [disabled]="notification.isRead">Read</button>
                <button type="button" class="btn-danger" (click)="deleteNotification(notification)">Delete</button>
              </div>
            </article>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    .header-actions,
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .summary {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1rem;
      padding: 1rem;
    }

    .summary strong {
      font-size: 1.75rem;
    }

    .summary span,
    .notification p,
    .notification small {
      color: var(--text-secondary);
    }

    .list {
      display: grid;
      gap: 0.75rem;
    }

    .notification {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem;
      border-color: var(--border-light);
    }

    .notification.unread {
      border-color: var(--accent-cyan);
      background: rgba(34, 211, 238, 0.08);
    }

    h2,
    p {
      margin: 0.35rem 0;
    }

    h2 {
      font-size: 1.05rem;
    }

    a {
      text-decoration: none;
    }

    @media (max-width: 760px) {
      .notification {
        display: grid;
      }
    }
  `],
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private readonly notificationService = inject(NotificationService);
  private readonly signalr = inject(SignalRService);
  private readonly toast = inject(ToastService);

  protected readonly notifications = signal<AdminNotification[]>([]);
  protected readonly loading = signal(false);
  protected readonly unreadCount = this.notificationService.unreadCount;

  constructor() {
    effect(() => {
      const notification = this.signalr.newNotification();
      if (notification) {
        this.notifications.update(items => [notification, ...items]);
        this.notificationService.unreadCount.update(count => count + (notification.isRead ? 0 : 1));
        this.toast.open(notification.title);
      }
    });
  }

  ngOnInit() {
    this.loadNotifications();
    void this.signalr.startNotificationHub();
  }

  ngOnDestroy() {
    this.signalr.stopAll();
  }

  protected loadNotifications() {
    this.loading.set(true);
    this.notificationService.getNotifications().subscribe({
      next: notifications => {
        this.notifications.set(notifications);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.open('Notifications could not be loaded.');
      },
    });
  }

  protected markRead(notification: AdminNotification) {
    this.notificationService.markRead(notification.id).subscribe({
      next: () => this.notifications.update(items => items.map(item => item.id === notification.id ? { ...item, isRead: true } : item)),
      error: () => this.toast.open('Notification could not be marked as read.'),
    });
  }

  protected markAllRead() {
    this.notificationService.markAllRead().subscribe({
      next: () => this.notifications.update(items => items.map(item => ({ ...item, isRead: true }))),
      error: () => this.toast.open('Notifications could not be marked as read.'),
    });
  }

  protected deleteNotification(notification: AdminNotification) {
    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        this.notifications.update(items => items.filter(item => item.id !== notification.id));
        if (!notification.isRead) this.notificationService.unreadCount.update(count => Math.max(0, count - 1));
      },
      error: () => this.toast.open('Notification could not be deleted.'),
    });
  }
}
