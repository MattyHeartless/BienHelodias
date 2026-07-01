import { AfterViewInit, DestroyRef, Directive, ElementRef, NgZone, inject } from '@angular/core';

type LiquidGlassOptions = {
  target: string;
  snapshot?: string;
  resolution?: number;
  refraction?: number;
  bevelDepth?: number;
  bevelWidth?: number;
  frost?: number;
  shadow?: boolean;
  specular?: boolean;
  reveal?: 'none' | 'fade';
  tilt?: boolean;
  tiltFactor?: number;
  magnify?: number;
  on?: {
    init?: (instance: unknown) => void;
  };
};

type LiquidGlassGlobal = ((options: LiquidGlassOptions) => unknown) & {
  registerDynamic?: (elements: string | Element | Element[]) => void;
};

declare global {
  interface Window {
    html2canvas?: unknown;
    liquidGL?: LiquidGlassGlobal;
  }
}

const HTML2CANVAS_SCRIPT = '/scripts/html2canvas.min.js';
const LIQUID_GL_SCRIPT = '/scripts/liquidGL.js';
const scriptPromises = new Map<string, Promise<void>>();
let liquidGlassId = 0;

@Directive({
  selector: '[appLiquidGlass]',
  standalone: true
})
export class LiquidGlassDirective implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly targetId = `liquid-glass-${++liquidGlassId}`;
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
    });
  }

  ngAfterViewInit(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    this.elementRef.nativeElement.dataset['liquidGlassId'] = this.targetId;

    this.zone.runOutsideAngular(() => {
      window.setTimeout(() => {
        void this.initialise();
      });
    });
  }

  private async initialise(): Promise<void> {
    if (this.destroyed) {
      return;
    }

    try {
      await loadScript(HTML2CANVAS_SCRIPT);
      await loadScript(LIQUID_GL_SCRIPT);

      if (this.destroyed || !window.liquidGL) {
        return;
      }

      const element = this.elementRef.nativeElement;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.classList.add('liquid-glass-target');
      const fallbackTimeout = window.setTimeout(() => {
        if (element.classList.contains('liquid-glass-ready')) {
          return;
        }

        restoreTargetVisibility(element);
      }, 12000);

      window.liquidGL({
        target: `[data-liquid-glass-id="${this.targetId}"]`,
        snapshot: 'body',
        resolution: 1,
        refraction: 0.045,
        bevelDepth: 0.12,
        bevelWidth: 0.16,
        frost: 1.2,
        shadow: false,
        specular: !reduceMotion,
        reveal: 'none',
        tilt: false,
        magnify: 1,
        on: {
          init: () => {
            window.clearTimeout(fallbackTimeout);
            restoreTargetVisibility(element);
            element.classList.add('liquid-glass-ready');
          }
        }
      });

      restoreTargetVisibility(element);
      window.setTimeout(() => restoreTargetVisibility(element), 250);
      window.setTimeout(() => restoreTargetVisibility(element), 900);
    } catch (error) {
      console.warn('liquidGL navbar effect failed; CSS fallback remains active.', error);
    }
  }
}

function restoreTargetVisibility(element: HTMLElement): void {
  element.style.opacity = '1';
  element.style.pointerEvents = 'auto';
}

function loadScript(src: string): Promise<void> {
  if ((src === HTML2CANVAS_SCRIPT && window.html2canvas) || (src === LIQUID_GL_SCRIPT && window.liquidGL)) {
    return Promise.resolve();
  }

  const existingPromise = scriptPromises.get(src);

  if (existingPromise) {
    return existingPromise;
  }

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error(`Unable to load ${src}.`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Unable to load ${src}.`));
    document.body.appendChild(script);
  });

  scriptPromises.set(src, promise);
  return promise;
}
