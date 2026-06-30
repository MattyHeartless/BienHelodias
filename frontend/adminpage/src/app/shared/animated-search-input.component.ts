import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  computed,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-animated-search-input',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './animated-search-input.component.html',
  styleUrl: './animated-search-input.component.css'
})
export class AnimatedSearchInputComponent implements AfterViewInit, OnChanges {
  @Input() value = '';
  @Input() placeholder = 'Buscar';
  @Input() ariaLabel = 'Buscar';

  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('inputElement') private inputElement?: ElementRef<HTMLInputElement>;
  @ViewChild('mirrorElement') private mirrorElement?: ElementRef<HTMLDivElement>;
  @ViewChild('placeholderElement') private placeholderElement?: ElementRef<HTMLDivElement>;
  @ViewChild('glowElement') private glowElement?: ElementRef<HTMLDivElement>;

  readonly internalValue = signal('');
  readonly mirrorText = signal('');
  readonly isClearing = signal(false);
  readonly hasValue = computed(() => this.internalValue().length > 0);

  private readonly canvas = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
  private viewReady = false;

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.syncValue(this.value ?? '');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['value']) {
      return;
    }

    const previous = changes['value'].previousValue ?? '';
    const next = changes['value'].currentValue ?? '';

    if (this.viewReady && previous && !next && !this.isClearing()) {
      this.clearWithAnimation(false, previous);
      return;
    }

    this.syncValue(next);
  }

  updateValue(value: string): void {
    this.syncValue(value);
    this.valueChange.emit(value);
  }

  preserveFocus(event: Event): void {
    if (document.activeElement === this.inputElement?.nativeElement) {
      event.preventDefault();
    }
  }

  clearWithAnimation(emit = true, fallbackText = ''): void {
    if (this.isReducedMotion()) {
      this.clearImmediately(emit);
      return;
    }

    const input = this.inputElement?.nativeElement;
    const mirror = this.mirrorElement?.nativeElement;
    const phold = this.placeholderElement?.nativeElement;
    const glow = this.glowElement?.nativeElement;

    if (!input || !mirror || !phold || !glow || this.isClearing()) {
      return;
    }

    const text = input.value || this.internalValue() || fallbackText;

    if (!text) {
      return;
    }

    const keepFocus = document.activeElement === input;
    this.mirrorText.set(text.replace(/ /g, '\u00a0'));
    input.value = '';
    this.internalValue.set('');

    if (emit) {
      this.valueChange.emit('');
    }

    this.isClearing.set(true);
    glow.style.background = this.buildGlow(this.mirrorText());
    glow.style.opacity = '0';

    const total = this.num('--clear-dur', 1000);
    const outDur = this.num('--clear-out-dur', 400);
    const inDur = this.num('--clear-in-dur', 400);
    const outFly = this.num('--clear-out-fly', 12);
    const inFly = this.num('--clear-in-fly', 12);
    const blur = this.num('--clear-blur', 2);
    const delay = this.num('--glow-delay', 50);
    const peakAt = this.num('--glow-peak-at', 0.15);
    const glowOpacity = this.num('--glow-opacity', 0.85);
    const easeOut = this.bezier(this.rootStyle('--clear-out-ease'));
    const easeIn = this.bezier(this.rootStyle('--clear-in-ease'));

    phold.style.transform = `translateY(-${inFly}px)`;
    phold.style.opacity = '0.9';
    phold.style.filter = `blur(${blur}px)`;

    const startedAt = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const outProgress = easeOut(Math.min(1, elapsed / outDur));
      mirror.style.transform = `translateY(${(outProgress * outFly).toFixed(1)}px)`;
      mirror.style.opacity = (1 - outProgress).toFixed(3);
      mirror.style.filter = `blur(${(outProgress * blur).toFixed(1)}px)`;

      const inProgress = easeIn(Math.min(1, elapsed / inDur));
      phold.style.transform = `translateY(${(-inFly + inProgress * inFly).toFixed(1)}px)`;
      phold.style.opacity = (0.9 + inProgress * 0.1).toFixed(3);
      phold.style.filter = `blur(${(blur - inProgress * blur).toFixed(1)}px)`;

      let glowProgress = 0;
      if (elapsed > delay) {
        const glowTime = Math.min(1, (elapsed - delay) / Math.max(1, total - delay));
        glowProgress = glowTime < peakAt ? glowTime / peakAt : 1 - (glowTime - peakAt) / (1 - peakAt);
      }
      glow.style.opacity = (glowProgress * glowOpacity).toFixed(3);

      if (elapsed < total) {
        requestAnimationFrame(tick);
        return;
      }

      this.finishClearing(keepFocus);
    };

    requestAnimationFrame(tick);
  }

  private clearImmediately(emit: boolean): void {
    this.syncValue('');

    if (this.inputElement?.nativeElement) {
      this.inputElement.nativeElement.value = '';
    }

    if (emit) {
      this.valueChange.emit('');
    }
  }

  private finishClearing(keepFocus: boolean): void {
    const mirror = this.mirrorElement?.nativeElement;
    const phold = this.placeholderElement?.nativeElement;
    const glow = this.glowElement?.nativeElement;

    this.isClearing.set(false);
    this.mirrorText.set('');

    for (const element of [mirror, phold]) {
      if (element) {
        element.style.cssText = '';
      }
    }

    if (glow) {
      glow.style.opacity = '0';
      glow.style.background = '';
    }

    if (keepFocus && this.inputElement?.nativeElement) {
      requestAnimationFrame(() => this.inputElement?.nativeElement.focus({ preventScroll: true }));
    }
  }

  private syncValue(value: string): void {
    this.internalValue.set(value);
    this.mirrorText.set(value.replace(/ /g, '\u00a0'));

    if (this.inputElement?.nativeElement && this.inputElement.nativeElement.value !== value) {
      this.inputElement.nativeElement.value = value;
    }
  }

  private buildGlow(text: string): string {
    if (!this.canvas || !this.inputElement?.nativeElement) {
      return '';
    }

    const input = this.inputElement.nativeElement;
    const wrap = input.closest('.t-clear') as HTMLElement | null;
    const root = document.documentElement;
    const isDark = root.getAttribute('data-theme') !== 'light';
    const rgb = isDark ? '255,255,255' : '0,0,0';
    const width = wrap?.clientWidth || 280;
    const padLeft = Number.parseFloat(getComputedStyle(input).paddingLeft) || 12;
    const spread = this.num('--glow-spread', 1.5);
    const layers: string[] = [];
    let x = 0;

    this.canvas.font = getComputedStyle(input).font;

    text.split(/(\s+)/).forEach((segment) => {
      const segmentWidth = this.canvas?.measureText(segment).width ?? 0;

      if (segment.trim()) {
        const centerX = padLeft + x + segmentWidth / 2;
        const halfWidth = Math.max(segmentWidth * 0.45, 8) * spread;

        [
          [0, 0.8, 7, 0.22],
          [halfWidth * 0.45, 0.55, 8, 0.18],
          [halfWidth * -0.4, 0.65, 6, 0.16],
          [halfWidth * 0.15, 0.9, 5, 0.14]
        ].forEach(([dx, radiusWidthMultiplier, radiusHeight, alpha]) => {
          const layerX = (((centerX + dx) / width) * 100).toFixed(2);
          layers.push(
            `radial-gradient(ellipse ${Math.max(halfWidth * radiusWidthMultiplier, 2).toFixed(1)}px ${radiusHeight}px at ${layerX}% 100%, rgba(${rgb},${alpha}), transparent)`
          );
        });
      }

      x += segmentWidth;
    });

    return layers.join(', ');
  }

  private num(name: string, fallback: number): number {
    const value = Number.parseFloat(this.rootStyle(name));
    return Number.isFinite(value) ? value : fallback;
  }

  private rootStyle(name: string): string {
    if (typeof document === 'undefined') {
      return '';
    }

    return getComputedStyle(document.documentElement).getPropertyValue(name);
  }

  private bezier(value: string): (t: number) => number {
    const match = String(value).match(/cubic-bezier\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/);

    if (!match) {
      return (t) => t;
    }

    const [x1, y1, x2, y2] = match.slice(1).map(Number.parseFloat);
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;

    return (t) => {
      if (t <= 0) {
        return 0;
      }

      if (t >= 1) {
        return 1;
      }

      let sample = t;
      for (let i = 0; i < 8; i += 1) {
        const dx = ((ax * sample + bx) * sample + cx) * sample - t;
        const derivative = (3 * ax * sample + 2 * bx) * sample + cx;

        if (Math.abs(dx) < 1e-6 || derivative === 0) {
          break;
        }

        sample -= dx / derivative;
      }

      return ((ay * sample + by) * sample + cy) * sample;
    };
  }

  private isReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
