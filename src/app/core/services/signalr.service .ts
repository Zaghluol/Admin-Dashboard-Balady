import { Injectable, inject, signal } from '@angular/core';
import { environment } from '@env/environment';
import { AuthService } from './auth.service';
import type { Notification, SupportMessage } from '@core/interfaces/Index';
import type { HubConnection, HubConnectionBuilder } from '@microsoft/signalr';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private auth = inject(AuthService);

  private notificationHub: HubConnection | null = null;
  private supportHub: HubConnection | null = null;

  readonly newNotification = signal<Notification | null>(null);
  readonly newSupportMessage = signal<SupportMessage | null>(null);
  readonly isConnected = signal(false);

  async startNotificationHub() {
    const HubConnectionBuilder = await this.loadHubConnectionBuilder();
    if (!HubConnectionBuilder) return;

    this.notificationHub = new HubConnectionBuilder()
      .withUrl(`${environment.signalrUrl}/notifications`, {
        accessTokenFactory: () => this.auth.getToken() ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.notificationHub.on('ReceiveNotification', (notification: Notification) => {
      this.newNotification.set(notification);
    });

    this.notificationHub
      .start()
      .then(() => this.isConnected.set(true))
      .catch((err: unknown) => console.error('SignalR notification hub error:', err));
  }

  async startSupportHub() {
    const HubConnectionBuilder = await this.loadHubConnectionBuilder();
    if (!HubConnectionBuilder) return;

    this.supportHub = new HubConnectionBuilder()
      .withUrl(`${environment.signalrUrl}/support`, {
        accessTokenFactory: () => this.auth.getToken() ?? '',
      })
      .withAutomaticReconnect()
      .build();

    this.supportHub.on('ReceiveMessage', (message: SupportMessage) => {
      this.newSupportMessage.set(message);
    });

    this.supportHub.start().catch((err: unknown) =>
      console.error('SignalR support hub error:', err)
    );
  }

  stopAll() {
    this.notificationHub?.stop();
    this.supportHub?.stop();
    this.isConnected.set(false);
  }

  private async loadHubConnectionBuilder(): Promise<typeof HubConnectionBuilder | null> {
    try {
      const signalR = await import('@microsoft/signalr');
      return signalR.HubConnectionBuilder;
    } catch (err) {
      console.error('SignalR package could not be loaded; real-time updates are disabled.', err);
      return null;
    }
  }
}
