import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupportService } from '@core/services/supportservice';
import { SignalRService } from '@core/services/signalr.service ';
import { ToastService } from '@core/services/toast.service';
import type { SupportConversation, SupportMessage } from '@core/interfaces/Index';

@Component({
  selector: 'app-support',
  imports: [CommonModule, FormsModule],
  template: `
    <section>
      <header class="page-header">
        <div>
          <h1>Support</h1>
          <p>Track conversations, reply to customers, and close resolved threads.</p>
        </div>
        <button type="button" class="btn-secondary" (click)="loadConversations()" [disabled]="loading()">
          {{ loading() ? 'Refreshing...' : 'Refresh' }}
        </button>
      </header>

      <div class="support-grid">
        <aside class="panel conversation-list">
          @if (loading()) {
            <div class="empty-state">Loading conversations...</div>
          } @else if (!conversations().length) {
            <div class="empty-state">No support conversations.</div>
          } @else {
            @for (conversation of conversations(); track conversation.id) {
              <button
                type="button"
                class="conversation"
                [class.active]="selectedConversation()?.id === conversation.id"
                (click)="selectConversation(conversation)"
              >
                <span>
                  <strong>{{ conversation.subject }}</strong>
                  <small>{{ conversation.userFullName }} · {{ conversation.lastMessage || 'No messages yet' }}</small>
                </span>
                @if (conversation.unreadCount) {
                  <em>{{ conversation.unreadCount }}</em>
                }
              </button>
            }
          }
        </aside>

        <main class="panel chat">
          @if (selectedConversation(); as conversation) {
            <header class="chat-head">
              <div>
                <h2>{{ conversation.subject }}</h2>
                <p class="muted">{{ conversation.userFullName }} · {{ conversation.userEmail }}</p>
              </div>
              <button type="button" class="btn-danger" (click)="closeConversation(conversation)" [disabled]="conversation.status === 'Closed'">
                Close
              </button>
            </header>

            <div class="messages">
              @if (conversation.messages?.length) {
                @for (message of conversation.messages; track message.id) {
                  <article class="message" [class.admin]="message.isAdmin">
                    <strong>{{ message.senderName }}</strong>
                    <p>{{ message.message }}</p>
                    <small>{{ message.sentAt | date:'short' }}</small>
                  </article>
                }
              } @else {
                <div class="empty-state">No messages returned for this conversation.</div>
              }
            </div>

            <form class="reply" (ngSubmit)="sendReply(conversation)">
              <input name="reply" [(ngModel)]="replyText" placeholder="Write a reply" [disabled]="conversation.status === 'Closed'" />
              <button type="submit" class="btn-primary" [disabled]="!replyText.trim() || sending() || conversation.status === 'Closed'">
                Send
              </button>
            </form>
          } @else {
            <div class="empty-state">Select a conversation to start replying.</div>
          }
        </main>
      </div>
    </section>
  `,
  styles: [`
    .support-grid {
      display: grid;
      grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr);
      gap: 1rem;
      min-height: 34rem;
    }

    .conversation-list,
    .chat {
      overflow: hidden;
    }

    .conversation {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.85rem;
      border: 0;
      border-bottom: 1px solid var(--border-light);
      background: transparent;
      color: var(--text-primary);
      text-align: left;
      cursor: pointer;
    }

    .conversation.active,
    .conversation:hover {
      background: rgba(99, 102, 241, 0.12);
    }

    .conversation small {
      display: block;
      color: var(--text-secondary);
    }

    .conversation em {
      display: grid;
      min-width: 1.6rem;
      height: 1.6rem;
      place-items: center;
      border-radius: 999px;
      background: var(--accent-rose);
      color: #fff;
      font-style: normal;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .chat {
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
    }

    .chat-head,
    .reply {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid var(--border-light);
    }

    .reply {
      border-top: 1px solid var(--border-light);
      border-bottom: 0;
    }

    h2,
    p {
      margin: 0;
    }

    .messages {
      display: grid;
      align-content: start;
      gap: 0.75rem;
      overflow-y: auto;
      padding: 1rem;
    }

    .message {
      max-width: min(36rem, 86%);
      padding: 0.75rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-surface);
    }

    .message.admin {
      justify-self: end;
      background: rgba(99, 102, 241, 0.16);
    }

    .message small {
      color: var(--text-secondary);
    }

    .reply input {
      flex: 1;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--bg-surface);
      color: var(--text-primary);
      padding: 0.7rem 0.8rem;
    }

    @media (max-width: 900px) {
      .support-grid {
        grid-template-columns: 1fr;
        min-height: auto;
      }

      .conversation-list {
        max-height: 22rem;
        overflow-y: auto;
      }
    }

    @media (max-width: 640px) {
      .chat-head,
      .reply {
        display: grid;
        padding: 0.85rem;
      }

      .message {
        max-width: 94%;
      }

      .reply input,
      .reply .btn-primary,
      .chat-head .btn-danger {
        width: 100%;
      }
    }
  `],
})
export class SupportComponent implements OnInit, OnDestroy {
  private readonly support = inject(SupportService);
  private readonly signalr = inject(SignalRService);
  private readonly toast = inject(ToastService);

  protected readonly conversations = signal<SupportConversation[]>([]);
  protected readonly selectedConversation = signal<SupportConversation | null>(null);
  protected readonly loading = signal(false);
  protected readonly sending = signal(false);
  protected replyText = '';

  constructor() {
    effect(() => {
      const message = this.signalr.newSupportMessage();
      if (message) this.handleIncomingMessage(message);
    });
  }

  ngOnInit() {
    this.loadConversations();
    void this.signalr.startSupportHub();
  }

  ngOnDestroy() {
    this.signalr.stopAll();
  }

  protected loadConversations() {
    this.loading.set(true);
    this.support.getConversations().subscribe({
      next: conversations => {
        this.conversations.set(conversations);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.open('Support conversations could not be loaded.');
      },
    });
  }

  protected selectConversation(conversation: SupportConversation) {
    this.support.getConversation(conversation.id).subscribe({
      next: detail => {
        this.selectedConversation.set(detail);
        this.markRead(detail.id);
      },
      error: () => this.toast.open('Conversation could not be loaded.'),
    });
  }

  protected sendReply(conversation: SupportConversation) {
    const message = this.replyText.trim();
    if (!message) return;

    this.sending.set(true);
    this.support.sendMessage({ conversationId: conversation.id, message }).subscribe({
      next: sent => {
        this.replyText = '';
        this.sending.set(false);
        this.appendMessage(sent);
      },
      error: () => {
        this.sending.set(false);
        this.toast.open('Reply could not be sent.');
      },
    });
  }

  protected closeConversation(conversation: SupportConversation) {
    this.support.closeConversation(conversation.id).subscribe({
      next: () => {
        const updated = { ...conversation, status: 'Closed' as const };
        this.selectedConversation.set(updated);
        this.conversations.update(items => items.map(item => item.id === updated.id ? updated : item));
        this.toast.open('Conversation closed.');
      },
      error: () => this.toast.open('Conversation could not be closed.'),
    });
  }

  private markRead(id: string) {
    this.support.markConversationRead(id).subscribe({
      next: () => this.conversations.update(items => items.map(item => item.id === id ? { ...item, unreadCount: 0 } : item)),
    });
  }

  private handleIncomingMessage(message: SupportMessage) {
    this.appendMessage(message);
    this.conversations.update(items => items.map(item => item.id === message.conversationId
      ? { ...item, lastMessage: message.message, lastMessageAt: message.sentAt, unreadCount: item.unreadCount + (message.isAdmin ? 0 : 1) }
      : item
    ));
    if (!message.isAdmin) this.toast.open(`New support message from ${message.senderName}.`);
  }

  private appendMessage(message: SupportMessage) {
    const selected = this.selectedConversation();
    if (!selected || selected.id !== message.conversationId) return;

    this.selectedConversation.set({
      ...selected,
      messages: [...(selected.messages ?? []), message],
      lastMessage: message.message,
      lastMessageAt: message.sentAt,
    });
  }
}
