import { inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

type NotificationTone = 'success' | 'error' | 'info' | 'warning';

interface NotificationOptions {
  summary: string;
  life?: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationUiService {
  private readonly messages = inject(MessageService);

  success(options: NotificationOptions): void {
    this.show('success', options.summary, options.life ?? 4200);
  }

  error(options: NotificationOptions): void {
    this.show('error', options.summary, options.life ?? 5200);
  }

  info(options: NotificationOptions): void {
    this.show('info', options.summary, options.life ?? 4200);
  }

  warning(options: NotificationOptions): void {
    this.show('warning', options.summary, options.life ?? 4800);
  }

  private show(tone: NotificationTone, summary: string, life: number): void {
    this.messages.add({
      key: 'app',
      severity: tone,
      summary,
      life,
      styleClass: `bh-toast bh-toast--${tone}`
    });
  }
}
