import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, of } from 'rxjs';
import { environment } from '@env/environment';
import type { SupportConversation, SupportMessage, SendMessageRequest } from '@core/interfaces/Index';

@Injectable({ providedIn: 'root' })
export class SupportService {
  private http = inject(HttpClient);
  private adminBase = `${environment.apiUrl}/admin/support`;
  private supportBase = `${environment.apiUrl}/support`;

  getConversations() {
    return this.http.get<SupportConversation[]>(this.adminBase);
  }

  getConversation(id: string) {
    return this.getConversations().pipe(
      map(conversations => conversations.find(conversation => conversation.id === id) ?? null),
      map(conversation => {
        if (!conversation) {
          throw new Error(`Support conversation ${id} was not found.`);
        }

        return conversation;
      })
    );
  }

  sendMessage(req: SendMessageRequest) {
    return this.http.post<SupportMessage>(`${this.supportBase}/admin/reply`, {
      conversationId: Number(req.conversationId),
      content: req.message,
    });
  }

  markConversationRead(id: string) {
    return of(void 0);
  }

  closeConversation(id: string) {
    return of(void 0);
  }
}
