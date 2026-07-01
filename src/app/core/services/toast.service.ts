import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  message: string;
  action?: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly message = signal<ToastMessage | null>(null);

  open(message: string, action = 'Close', options?: { duration?: number }) {
    const toast = { id: this.nextId++, message, action };
    this.message.set(toast);

    window.setTimeout(() => {
      if (this.message()?.id === toast.id) {
        this.message.set(null);
      }
    }, options?.duration ?? 4000);
  }

  close() {
    this.message.set(null);
  }
}
