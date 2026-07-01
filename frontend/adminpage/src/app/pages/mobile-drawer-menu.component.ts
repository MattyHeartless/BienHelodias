import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import gsap from 'gsap';

export type MobileNavigationItem = {
  label: string;
  route: string;
  icon: string;
};

@Component({
  selector: 'app-mobile-drawer-menu',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './mobile-drawer-menu.component.html',
  styleUrl: './mobile-drawer-menu.component.css'
})
export class MobileDrawerMenuComponent {
  @Input({ required: true }) open = false;
  @Input({ required: true }) title = '';
  @Input({ required: true }) description = '';
  @Input({ required: true }) navigation: MobileNavigationItem[] = [];
  @Input() storeUrl: string | null = null;

  @Output() readonly closeMenu = new EventEmitter<void>();
  @Output() readonly logout = new EventEmitter<void>();

  @ViewChild('drawerRoot') private readonly drawerRoot?: ElementRef<HTMLElement>;
  @ViewChild('drawerOverlay') private readonly drawerOverlay?: ElementRef<HTMLElement>;
  @ViewChild('drawerPanel') private readonly drawerPanel?: ElementRef<HTMLElement>;
  @ViewChildren('drawerItem') private readonly drawerItems?: QueryList<ElementRef<HTMLElement>>;

  rendered = false;

  private timeline: gsap.core.Timeline | null = null;
  private openTimer: number | null = null;
  private previousBodyOverflow: string | null = null;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngOnChanges(changes: SimpleChanges): void {
    const openChange = changes['open'];

    if (!openChange) {
      return;
    }

    if (this.open) {
      this.rendered = true;
      this.lockBodyScroll();
      this.queueOpenAnimation();
      return;
    }

    if (!openChange.firstChange && this.rendered) {
      this.animateClose();
    }
  }

  ngOnDestroy(): void {
    this.clearOpenTimer();
    this.timeline?.kill();
    this.unlockBodyScroll();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open) {
      this.close();
    }
  }

  close(): void {
    this.closeMenu.emit();
  }

  requestLogout(): void {
    this.logout.emit();
  }

  private queueOpenAnimation(): void {
    this.clearOpenTimer();
    this.openTimer = window.setTimeout(() => {
      this.openTimer = null;
      this.animateOpen();
    });
  }

  private animateOpen(): void {
    const root = this.drawerRoot?.nativeElement;
    const overlay = this.drawerOverlay?.nativeElement;
    const panel = this.drawerPanel?.nativeElement;

    if (!root || !overlay || !panel) {
      return;
    }

    const items = this.getDrawerItems();
    const prefersReducedMotion = this.prefersReducedMotion();
    const openDuration = prefersReducedMotion ? 0 : 0.48;
    const overlayDuration = prefersReducedMotion ? 0 : 0.24;
    const itemDuration = prefersReducedMotion ? 0 : 0.28;
    const itemStagger = prefersReducedMotion ? 0 : 0.045;

    this.timeline?.kill();

    gsap.set(root, { autoAlpha: 1 });
    gsap.set(overlay, { autoAlpha: 0 });
    gsap.set(panel, { x: 0, xPercent: 100, autoAlpha: 1 });
    gsap.set(items, {
      y: prefersReducedMotion ? 0 : 10,
      autoAlpha: prefersReducedMotion ? 1 : 0,
      filter: prefersReducedMotion ? 'blur(0px)' : 'blur(6px)'
    });

    this.timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
    this.timeline
      .to(overlay, { autoAlpha: 1, duration: overlayDuration, ease: 'power2.out' }, 0)
      .to(panel, { xPercent: 0, duration: openDuration, ease: 'expo.out' }, 0.03)
      .to(
        items,
        {
          y: 0,
          autoAlpha: 1,
          filter: 'blur(0px)',
          duration: itemDuration,
          stagger: itemStagger,
          ease: 'power2.out'
        },
        0.16
      );
  }

  private animateClose(): void {
    this.clearOpenTimer();

    const overlay = this.drawerOverlay?.nativeElement;
    const panel = this.drawerPanel?.nativeElement;

    if (!overlay || !panel) {
      this.rendered = false;
      this.unlockBodyScroll();
      return;
    }

    const items = this.getDrawerItems();
    const prefersReducedMotion = this.prefersReducedMotion();
    const closeDuration = prefersReducedMotion ? 0 : 0.34;
    const overlayDuration = prefersReducedMotion ? 0 : 0.22;

    this.timeline?.kill();
    this.timeline = gsap.timeline({
      defaults: { ease: 'power3.inOut' },
      onComplete: () => {
        this.rendered = false;
        this.timeline = null;
        this.unlockBodyScroll();
        this.cdr.detectChanges();
      }
    });

    this.timeline
      .to(
        items,
        {
          y: prefersReducedMotion ? 0 : 6,
          autoAlpha: 0,
          filter: prefersReducedMotion ? 'blur(0px)' : 'blur(4px)',
          duration: prefersReducedMotion ? 0 : 0.12,
          stagger: prefersReducedMotion ? 0 : { each: 0.018, from: 'end' },
          ease: 'power2.in'
        },
        0
      )
      .to(panel, { xPercent: 100, duration: closeDuration }, 0)
      .to(overlay, { autoAlpha: 0, duration: overlayDuration, ease: 'power2.out' }, 0.06);
  }

  private getDrawerItems(): HTMLElement[] {
    return this.drawerItems?.map((item) => item.nativeElement) ?? [];
  }

  private lockBodyScroll(): void {
    if (this.previousBodyOverflow !== null) {
      return;
    }

    this.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    if (this.previousBodyOverflow === null) {
      return;
    }

    document.body.style.overflow = this.previousBodyOverflow;
    this.previousBodyOverflow = null;
  }

  private clearOpenTimer(): void {
    if (this.openTimer === null) {
      return;
    }

    window.clearTimeout(this.openTimer);
    this.openTimer = null;
  }

  private prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
