import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

const overlayId = 'delivery-bootstrap-error-overlay';

function normalizeError(value: unknown): string {
  if (value instanceof Error) {
    return `${value.name}: ${value.message}\n${value.stack ?? ''}`.trim();
  }

  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function renderFatalOverlay(title: string, details: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const existing = document.getElementById(overlayId);
  if (existing) {
    existing.querySelector('pre')!.textContent = details;
    return;
  }

  const overlay = document.createElement('div');
  overlay.id = overlayId;
  overlay.setAttribute(
    'style',
    [
      'position:fixed',
      'inset:0',
      'z-index:99999',
      'overflow:auto',
      'padding:24px',
      'background:#0b0b0b',
      'color:#fff',
      'font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
    ].join(';')
  );

  overlay.innerHTML = `
    <div style="max-width:960px;margin:0 auto">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.2;color:#ff7351">${title}</h1>
      <p style="margin:0 0 16px;font:14px/1.6 system-ui,sans-serif;color:#d8d8d8">
        Safari/iOS lanzó un error al cargar la app. Usa este texto para depurarlo.
      </p>
      <pre style="white-space:pre-wrap;word-break:break-word;background:#151515;border:1px solid #2a2a2a;border-radius:16px;padding:16px;margin:0">${details}</pre>
    </div>
  `;

  document.body.appendChild(overlay);
}

if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const details = [
      `message: ${event.message}`,
      `source: ${event.filename || 'unknown'}`,
      `line: ${event.lineno}:${event.colno}`,
      '',
      normalizeError(event.error ?? event.message)
    ].join('\n');

    renderFatalOverlay('Error global en deliverypage', details);
  });

  window.addEventListener('unhandledrejection', (event) => {
    const details = normalizeError(event.reason);
    renderFatalOverlay('Promise rechazada sin manejar', details);
  });
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => {
    const details = normalizeError(err);
    renderFatalOverlay('Falló el bootstrap de Angular', details);
    console.error(err);
  });
