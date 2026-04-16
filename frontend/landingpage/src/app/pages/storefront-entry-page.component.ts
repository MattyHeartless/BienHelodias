import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-storefront-entry-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex min-h-screen items-center justify-center px-6 text-on-surface">
      <div class="max-w-xl rounded-[2rem] bg-surface-container-low p-8 text-center shadow-[0_35px_100px_rgba(0,0,0,0.35)]">
        <p class="eyebrow">Landing</p>
        <h1 class="mt-4 font-display text-4xl font-bold tracking-[-0.05em]">Falta el enlace de la licoreria.</h1>
        <p class="mt-4 leading-8 text-on-surface-variant">
          Abre esta pagina usando la URL personalizada de una tienda, por ejemplo con su slug publico.
        </p>
      </div>
    </div>
  `
})
export class StorefrontEntryPageComponent {}
