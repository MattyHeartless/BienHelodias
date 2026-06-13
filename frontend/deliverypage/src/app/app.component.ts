import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, ToastModule],
  template: `
    <p-toast key="app" position="top-right" [baseZIndex]="10000" styleClass="brand-toast-shell">
      <ng-template #headless let-message let-closeFn="closeFn">
        <article class="brand-toast-card" [ngClass]="message.styleClass">
          <div class="brand-toast-card__glow"></div>
          <div class="brand-toast-card__media">
            <img src="/icons/app-icon.svg" alt="Bien Helodias" />
          </div>
          <div class="brand-toast-card__copy">
            <p class="brand-toast-card__eyebrow">Bien Helodias</p>
            <h3 class="brand-toast-card__title">{{ message.summary }}</h3>
          </div>
          <button class="brand-toast-card__close" type="button" (click)="closeFn($event)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </article>
      </ng-template>
    </p-toast>

    <router-outlet />
  `,
  styleUrl: './app.component.css'
})
export class AppComponent {
}
