import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnChanges, OnDestroy } from '@angular/core';

type AnimatedDigit = {
  char: string;
  stagger: number | null;
};

@Component({
  selector: 'app-animated-number',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="t-digit-group" [class.is-animating]="animating" [attr.aria-label]="displayValue">
      @for (digit of digits; track $index) {
        <span class="t-digit" [attr.data-stagger]="digit.stagger">{{ digit.char }}</span>
      }
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }

    @keyframes t-digit-pop-in {
      0% {
        transform: translate(
          calc(var(--digit-distance) * var(--digit-dir-x)),
          calc(var(--digit-distance) * var(--digit-dir-y))
        );
        opacity: 0;
        filter: blur(var(--digit-blur));
      }
      100% {
        transform: translate(0, 0);
        opacity: 1;
        filter: blur(0);
      }
    }

    .t-digit-group {
      --digit-dur: 500ms;
      --digit-distance: 8px;
      --digit-stagger: 70ms;
      --digit-blur: 2px;
      --digit-ease: cubic-bezier(0.34, 1.45, 0.64, 1);
      --digit-dir-x: 0;
      --digit-dir-y: 1;
      display: inline-flex;
      align-items: baseline;
    }

    .t-digit {
      display: inline-block;
      will-change: transform, opacity, filter;
    }

    .t-digit-group.is-animating .t-digit {
      animation: t-digit-pop-in var(--digit-dur) var(--digit-ease) both;
    }

    .t-digit-group.is-animating .t-digit[data-stagger="1"] {
      animation-delay: var(--digit-stagger);
    }

    .t-digit-group.is-animating .t-digit[data-stagger="2"] {
      animation-delay: calc(var(--digit-stagger) * 2);
    }

    @media (prefers-reduced-motion: reduce) {
      .t-digit-group .t-digit {
        animation: none !important;
      }
    }
  `
})
export class AnimatedNumberComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) value: number | string = 0;

  digits: AnimatedDigit[] = [];
  displayValue = '0';
  animating = true;

  private animationFrame: number | null = null;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnChanges(): void {
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
    }

    this.displayValue = String(this.value);
    const chars = this.displayValue.split('');

    this.digits = chars.map((char, index) => ({
      char,
      stagger: index === chars.length - 2 ? 1 : index === chars.length - 1 ? 2 : null
    }));

    this.animating = false;
    this.cdr.detectChanges();
    this.animationFrame = window.requestAnimationFrame(() => {
      this.animationFrame = null;
      this.animating = true;
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    if (this.animationFrame !== null) {
      window.cancelAnimationFrame(this.animationFrame);
    }
  }
}
