import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  ElementRef,
  QueryList,
  ViewChild,
  ViewChildren,
  inject
} from '@angular/core';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

interface MetricItem {
  label: string;
  suffix: string;
  target: number;
  display: string;
}

interface SolutionCard {
  eyebrow: string;
  title: string;
  chips: string[];
  tone: 'lime' | 'blue' | 'maroon';
}

interface AffiliateCard {
  name: string;
  city: string;
  category: string;
  imagePath: string;
  imageAlt: string;
}

interface IntroParticle {
  image: HTMLImageElement;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  size: number;
}

interface IntroCanvasMetrics {
  width: number;
  height: number;
  radius: number;
  scale: number;
}

const INTRO_PARTICLE_COUNT = 72;

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-showcase-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './showcase-page.component.html',
  styleUrl: './showcase-page.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ShowcasePageComponent implements AfterViewInit {
  private readonly destroyRef = inject(DestroyRef);
  private revealObserver: IntersectionObserver | null = null;
  private counterObserver: IntersectionObserver | null = null;
  private platformContext: gsap.Context | null = null;
  private cinematicContext: gsap.Context | null = null;
  private mediaMatcher: gsap.MatchMedia | null = null;
  private readonly introSprites: HTMLImageElement[] = [];
  private readonly introParticles: IntroParticle[] = [];
  private introParticleTimeline: gsap.core.Timeline | null = null;
  private introCanvasContext: CanvasRenderingContext2D | null = null;
  private introCanvasMetrics: IntroCanvasMetrics = { width: 0, height: 0, radius: 0, scale: 1 };
  private readonly handleIntroResize = () => {
    this.resizeIntroCanvas();
    this.introParticleTimeline?.invalidate();
    this.drawIntroParticles();
  };
  isIntroActive = true;

  @ViewChild('introOverlay', { read: ElementRef }) private readonly introOverlay?: ElementRef<HTMLElement>;
  @ViewChild('introCanvas', { read: ElementRef }) private readonly introCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('introGlow', { read: ElementRef }) private readonly introGlow?: ElementRef<HTMLElement>;
  @ViewChild('introTitle', { read: ElementRef }) private readonly introTitle?: ElementRef<HTMLElement>;
  @ViewChild('heroSection', { read: ElementRef }) private readonly heroSection?: ElementRef<HTMLElement>;
  @ViewChild('heroVisual', { read: ElementRef }) private readonly heroVisual?: ElementRef<HTMLElement>;
  @ViewChild('heroMockup', { read: ElementRef }) private readonly heroMockup?: ElementRef<HTMLElement>;
  @ViewChild('heroWave', { read: ElementRef }) private readonly heroWave?: ElementRef<HTMLElement>;
  @ViewChild('heroOrbit', { read: ElementRef }) private readonly heroOrbit?: ElementRef<HTMLElement>;
  @ViewChild('heroStageCopy', { read: ElementRef }) private readonly heroStageCopy?: ElementRef<HTMLElement>;
  @ViewChild('heroCommandCard', { read: ElementRef }) private readonly heroCommandCard?: ElementRef<HTMLElement>;
  @ViewChild('ecosystemStage', { read: ElementRef }) private readonly ecosystemStage?: ElementRef<HTMLElement>;
  @ViewChildren('ecosystemMockup', { read: ElementRef }) private readonly ecosystemMockups!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('ecosystemChip', { read: ElementRef }) private readonly ecosystemChips!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('affiliateButton', { read: ElementRef }) private readonly affiliateButton?: ElementRef<HTMLElement>;
  @ViewChild('affiliateIcon', { read: ElementRef }) private readonly affiliateIcon?: ElementRef<HTMLElement>;
  @ViewChildren('introLetter', { read: ElementRef }) private readonly introLetters!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('revealEl', { read: ElementRef }) private readonly revealElements!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('counterEl', { read: ElementRef }) private readonly counterElements!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('platformScene', { read: ElementRef }) private readonly platformScenes!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('platformSection', { read: ElementRef }) private readonly platformSection?: ElementRef<HTMLElement>;
  @ViewChild('platformCopy', { read: ElementRef }) private readonly platformCopy?: ElementRef<HTMLElement>;
  @ViewChildren('platformCard', { read: ElementRef }) private readonly platformCards!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('platformIllustration', { read: ElementRef }) private readonly platformIllustrations!: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren('platformPulse', { read: ElementRef }) private readonly platformPulses!: QueryList<ElementRef<HTMLElement>>;
  @ViewChild('metricsSection', { read: ElementRef }) private readonly metricsSection?: ElementRef<HTMLElement>;

  readonly metrics: MetricItem[] = [
    { label: 'Pedidos', suffix: '+', target: 499, display: '0' },
    { label: 'Tiendas', suffix: '', target: 5, display: '0' },
    { label: 'Municipios', suffix: '', target: 3, display: '0' },
    { label: 'Repartidores', suffix: '+', target: 25, display: '0' }
  ];

  readonly solutions: SolutionCard[] = [
    {
      eyebrow: 'Cliente',
      title: 'Catalogo que convierte',
      chips: ['Descubre', 'Promo activa', 'Tracking'],
      tone: 'lime'
    },
    {
      eyebrow: 'Negocio',
      title: 'Operacion centralizada',
      chips: ['Inventario', 'Pedidos', 'Panel'],
      tone: 'blue'
    },
    {
      eyebrow: 'Delivery',
      title: 'Ruta con respuesta',
      chips: ['Disponible', 'Ruta', 'Avisos'],
      tone: 'maroon'
    }
  ];

  readonly affiliates: AffiliateCard[] = [
    {
      name: 'Divino',
      city: 'Guadalajara',
      category: 'Licorería',
      imagePath: '/imgs/divino_logo.jpg',
      imageAlt: 'Logo de Divino Vinos y Licores'
    },
    {
      name: 'El Chilar',
      city: 'Zapopan',
      category: 'Vinos y Licores',
      imagePath: '/imgs/elchilar_logo.jpg',
      imageAlt: 'Logo de El Chilar Vinos y Licores'
    },
    {
      name: 'Aranda',
      city: 'Guadalajara',
      category: 'Vinos y Licores',
      imagePath: '/imgs/aranda_logo.jpg',
      imageAlt: 'Logo de Aranda Vinos, Licores y Market'
    }
  ];

  readonly marqueeItems = ['DELIVERY', 'PROMOS', 'CATALOGO', 'TRACKING', 'PANEL', 'REPARTIDORES'];
  readonly introLineOne = Array.from('Bien');
  readonly introLineTwo = Array.from('Helodias');

  ngAfterViewInit(): void {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      this.isIntroActive = false;
      this.revealElements.forEach((entry) => entry.nativeElement.classList.add('is-visible'));
      this.applyPlatformReducedMotionState();
      this.metrics.forEach((metric) => {
        metric.display = this.formatMetric(metric.target, metric.suffix);
      });
      return;
    }

    void this.playIntro();
    this.setupRevealObserver();
    this.setupCounterObserver();
    this.setupPlatformScrollAnimation();
    this.setupCinematicScrollAnimation();

    this.destroyRef.onDestroy(() => {
      this.revealObserver?.disconnect();
      this.counterObserver?.disconnect();
      this.platformContext?.revert();
      this.cinematicContext?.revert();
      this.mediaMatcher?.revert();
      gsap.killTweensOf([
        this.introOverlay?.nativeElement,
        this.introGlow?.nativeElement,
        this.introTitle?.nativeElement,
        ...this.introLetters.toArray().map((entry) => entry.nativeElement),
        this.heroMockup?.nativeElement,
        this.heroWave?.nativeElement,
        this.heroOrbit?.nativeElement,
        this.heroStageCopy?.nativeElement,
        this.heroCommandCard?.nativeElement,
        ...this.ecosystemMockups.toArray().map((entry) => entry.nativeElement),
        ...this.ecosystemChips.toArray().map((entry) => entry.nativeElement)
      ]);
      this.stopIntroCanvas();
    });
  }

  trackByLabel(_: number, item: MetricItem): string {
    return item.label;
  }

  trackByTitle(_: number, item: SolutionCard): string {
    return item.title;
  }

  trackByName(_: number, item: AffiliateCard): string {
    return item.name;
  }

  trackByChar(index: number, char: string): string {
    return `${index}-${char}`;
  }

  buildAffiliateWhatsAppLink(name: string, business: string, phone: string, email: string): string {
    const details = [
      ['Nombre', name],
      ['Negocio', business],
      ['Telefono', phone],
      ['Correo', email]
    ]
      .map(([label, value]) => [label, value.trim()] as const)
      .filter(([, value]) => value.length > 0)
      .map(([label, value]) => `${label}: ${value}`);

    const message = ['Quiero afiliarme a Bien Helodias', ...details].join('\n');
    return `https://wa.me/523318791893?text=${encodeURIComponent(message)}`;
  }

  animateAffiliateCta(isHovering: boolean): void {
    const button = this.affiliateButton?.nativeElement;
    const icon = this.affiliateIcon?.nativeElement;

    if (!button || !icon) {
      return;
    }

    if (isHovering) {
      gsap.to(button, {
        y: -3,
        scale: 1.035,
        boxShadow: '0 0 46px rgb(210 253 110 / 0.24), 0 20px 36px rgb(0 0 0 / 0.24)',
        filter: 'brightness(1.05)',
        duration: 0.28,
        ease: 'power2.out'
      });
      gsap.to(icon, {
        x: 3,
        rotate: -10,
        scale: 1.12,
        duration: 0.28,
        ease: 'back.out(2.2)'
      });
      return;
    }

    gsap.to(button, {
      y: 0,
      scale: 1,
      boxShadow: '0 0 0 rgb(210 253 110 / 0), 0 0 0 rgb(0 0 0 / 0)',
      filter: 'brightness(1)',
      duration: 0.24,
      ease: 'power2.out'
    });
    gsap.to(icon, {
      x: 0,
      rotate: 0,
      scale: 1,
      duration: 0.24,
      ease: 'power2.out'
    });
  }

  private setupRevealObserver(): void {
    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          this.revealObserver?.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -10% 0px'
      }
    );

    this.revealElements.forEach((entry) => {
      this.revealObserver?.observe(entry.nativeElement);
    });
  }

  private setupCounterObserver(): void {
    if (!this.metricsSection) {
      return;
    }

    this.counterObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (!visible) {
          return;
        }

        this.counterObserver?.disconnect();
        this.animateAllCounters();
      },
      {
        threshold: 0.24
      }
    );

    this.counterObserver.observe(this.metricsSection.nativeElement);
  }

  private animateAllCounters(): void {
    this.metrics.forEach((metric, index) => {
      const duration = 900 + index * 140;
      const startTime = performance.now();

      const update = (currentTime: number) => {
        const progress = Math.min((currentTime - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.floor(metric.target * eased);
        metric.display = this.formatMetric(value, metric.suffix);

        if (progress < 1) {
          requestAnimationFrame(update);
          return;
        }

        metric.display = this.formatMetric(metric.target, metric.suffix);
      };

      requestAnimationFrame(update);
    });
  }

  private formatMetric(value: number, suffix: string): string {
    return `${value.toLocaleString('es-MX')}${suffix}`;
  }

  private applyPlatformReducedMotionState(): void {
    if (this.platformCopy?.nativeElement) {
      this.platformCopy.nativeElement.style.opacity = '1';
    }
    this.platformCopy?.nativeElement.style.removeProperty('filter');
    this.platformCopy?.nativeElement.style.removeProperty('transform');
    this.platformCards.forEach((entry) => {
      entry.nativeElement.style.opacity = '1';
      entry.nativeElement.style.transform = 'none';
      entry.nativeElement.style.filter = 'none';
    });
    this.platformIllustrations.forEach((entry) => {
      entry.nativeElement.style.opacity = '1';
      entry.nativeElement.style.transform = 'none';
    });
    this.platformPulses.forEach((entry) => {
      entry.nativeElement.style.opacity = '1';
      entry.nativeElement.style.transform = 'none';
    });
  }

  private setupPlatformScrollAnimation(): void {
    const section = this.platformSection?.nativeElement;
    const copy = this.platformCopy?.nativeElement;
    const cards = this.platformCards.toArray().map((entry) => entry.nativeElement);
    const illustrations = this.platformIllustrations.toArray().map((entry) => entry.nativeElement);
    const pulses = this.platformPulses.toArray().map((entry) => entry.nativeElement);

    if (!section || !copy || cards.length === 0 || illustrations.length === 0) {
      return;
    }

    this.platformContext = gsap.context(() => {
      const illustrationLoops = new WeakSet<HTMLElement>();
      const pulseLoops = new WeakSet<HTMLElement>();

      const startIllustrationLoop = (illustration: HTMLElement): void => {
        if (illustrationLoops.has(illustration)) {
          return;
        }

        illustrationLoops.add(illustration);

        if (illustration.classList.contains('scene-client__image')) {
          gsap.to(illustration, {
            y: -6,
            rotate: -2.5,
            scale: 1.03,
            duration: 4.8,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
          });
          return;
        }

        if (illustration.classList.contains('scene-admin__image')) {
          gsap.to(illustration, {
            y: -5,
            rotate: 1.8,
            scale: 1.02,
            duration: 5.2,
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true
          });
          return;
        }

        gsap.to(illustration, {
          y: -5,
          rotate: -1.8,
          scale: 1.02,
          duration: 5.6,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true
        });
      };

      const startPulseLoop = (pulse: HTMLElement): void => {
        if (pulseLoops.has(pulse)) {
          return;
        }

        pulseLoops.add(pulse);
        gsap.to(pulse, {
          scale: 1.16,
          autoAlpha: 0.92,
          duration: 1.8,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true
        });
      };

      gsap.set(copy, { opacity: 0, y: 40, filter: 'blur(8px)' });
      gsap.set(cards, { opacity: 0, y: 80, scale: 0.94, filter: 'blur(12px)' });
      gsap.set(illustrations, { opacity: 0, y: 24, scale: 0.82 });
      gsap.set(pulses, { opacity: 0, scale: 0.84 });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 70%',
          once: true,
          markers: false
        }
      });

      timeline.to(copy, {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 0.8,
        ease: 'power3.out'
      });

      cards.forEach((card, index) => {
        const illustration = illustrations[index];
        const pulse = pulses[index - 1] ?? null;
        const cardStart = 0.12 + index * 0.12;

        timeline.to(
          card,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.9,
            ease: 'power4.out'
          },
          cardStart
        );

        timeline.to(
          illustration,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.7,
            ease: 'back.out(1.4)',
            onStart: () => {
              startIllustrationLoop(illustration);
              if (pulse) {
                startPulseLoop(pulse);
              }
            }
          },
          cardStart + 0.22
        );

        if (pulse) {
          timeline.to(
            pulse,
            {
              opacity: 0.7,
              scale: 1,
              duration: 0.45,
              ease: 'power2.out'
            },
            cardStart + 0.28
          );
        }
      });
    }, section);
  }

  private setupCinematicScrollAnimation(): void {
    const heroSection = this.heroSection?.nativeElement;
    const heroVisual = this.heroVisual?.nativeElement;
    const heroMockup = this.heroMockup?.nativeElement;
    const heroWave = this.heroWave?.nativeElement;
    const heroOrbit = this.heroOrbit?.nativeElement;
    const heroStageCopy = this.heroStageCopy?.nativeElement;
    const heroCommandCard = this.heroCommandCard?.nativeElement;
    const ecosystemStage = this.ecosystemStage?.nativeElement;
    const ecosystemMockups = this.ecosystemMockups.toArray().map((entry) => entry.nativeElement);
    const ecosystemChips = this.ecosystemChips.toArray().map((entry) => entry.nativeElement);

    if (
      !heroSection ||
      !heroVisual ||
      !heroMockup ||
      !heroWave ||
      !heroOrbit ||
      !heroStageCopy ||
      !heroCommandCard ||
      !ecosystemStage ||
      ecosystemMockups.length === 0
    ) {
      return;
    }

    this.mediaMatcher = gsap.matchMedia();
    this.cinematicContext = gsap.context(() => {
      this.mediaMatcher?.add(
        {
          isDesktop: '(min-width: 761px)',
          isMobile: '(max-width: 760px)',
          reduceMotion: '(prefers-reduced-motion: reduce)'
        },
        (context) => {
          const conditions = (context.conditions ?? {}) as {
            isDesktop?: boolean;
            reduceMotion?: boolean;
          };
          const isDesktop = conditions.isDesktop ?? false;
          const reduceMotion = conditions.reduceMotion ?? false;

          if (reduceMotion) {
            gsap.set(
              [heroMockup, heroWave, heroOrbit, heroStageCopy, heroCommandCard, ...ecosystemMockups, ...ecosystemChips],
              { clearProps: 'all' }
            );
            return;
          }

          const heroTimeline = gsap.timeline({
            defaults: { ease: 'power3.out' },
            scrollTrigger: {
              trigger: heroSection,
              start: 'top top',
              end: isDesktop ? 'bottom top+=12%' : 'bottom top',
              scrub: isDesktop ? 0.85 : 0.45
            }
          });

          heroTimeline
            .to(heroMockup, { y: isDesktop ? -42 : -18, rotation: isDesktop ? -2.5 : -1.2 }, 0)
            .to(heroWave, { scale: isDesktop ? 1.08 : 1.03, rotate: isDesktop ? 8 : 4, transformOrigin: '50% 50%' }, 0)
            .to(heroOrbit, { rotate: isDesktop ? -10 : -5, scale: isDesktop ? 1.04 : 1.02, transformOrigin: '50% 50%' }, 0)
            .to(heroStageCopy, { y: isDesktop ? -34 : -14, autoAlpha: 0.24 }, 0)
            .to(heroCommandCard, { y: isDesktop ? -22 : -10, rotation: isDesktop ? -3 : -1.5 }, 0);

          ecosystemMockups.forEach((mockup, index) => {
            gsap.fromTo(
              mockup,
              {
                autoAlpha: 0,
                y: 56 + index * 20,
                x: index === 0 ? 0 : index === 1 ? -30 : 30,
                rotate: index === 0 ? 0 : index === 1 ? -7 : 7,
                scale: 0.9
              },
              {
                autoAlpha: 1,
                y: 0,
                x: 0,
                rotate: 0,
                scale: 1,
                duration: 0.9,
                ease: 'power4.out',
                scrollTrigger: {
                  trigger: ecosystemStage,
                  start: 'top 68%',
                  once: true
                },
                delay: index * 0.08
              }
            );

            gsap.to(mockup, {
              y: index === 0 ? -10 : -6,
              x: index === 1 ? -6 : index === 2 ? 6 : 0,
              duration: 4.6 + index * 0.4,
              ease: 'sine.inOut',
              repeat: -1,
              yoyo: true
            });
          });

          gsap.fromTo(
            ecosystemChips,
            { autoAlpha: 0, y: 18, scale: 0.92 },
            {
              autoAlpha: 1,
              y: 0,
              scale: 1,
              duration: 0.42,
              ease: 'back.out(1.5)',
              stagger: 0.08,
              scrollTrigger: {
                trigger: ecosystemStage,
                start: 'top 62%',
                once: true
              }
            }
          );
        }
      );
    });
  }

  private async playIntro(): Promise<void> {
    const overlay = this.introOverlay?.nativeElement;
    const canvas = this.introCanvas?.nativeElement;
    const glow = this.introGlow?.nativeElement;
    const title = this.introTitle?.nativeElement;
    const letters = this.introLetters.toArray().map((entry) => entry.nativeElement);

    if (!overlay || !canvas || !glow || !title || letters.length === 0) {
      this.isIntroActive = false;
      return;
    }

    await this.prepareIntroCanvas(canvas);
    this.introParticleTimeline?.play(0);

    const timeline = gsap.timeline({
      defaults: { ease: 'power3.out' },
      onComplete: () => {
        this.stopIntroCanvas();
        this.isIntroActive = false;
      }
    });

    timeline
      .set(overlay, { autoAlpha: 1 })
      .fromTo(glow, { scale: 0.78, autoAlpha: 0.18 }, { scale: 1.08, autoAlpha: 0.92, duration: 0.9 }, 0)
      .to({}, { duration: 0.18 })
      .fromTo(
        letters,
        { autoAlpha: 0, yPercent: 120, rotateX: -85, transformOrigin: '50% 50% -24px' },
        { autoAlpha: 1, yPercent: 0, rotateX: 0, duration: 0.72, stagger: 0.035 },
        '<'
      )
      .to(title, { letterSpacing: '0.02em', duration: 0.4 }, '-=0.42')
      .to({}, { duration: 0.8 })
      .to(this.introParticleTimeline, { timeScale: 1.8, duration: 0.35, ease: 'power2.in' }, '-=0.45')
      .to(title, { autoAlpha: 0, y: -14, duration: 0.35, ease: 'power2.in' })
      .to(glow, { autoAlpha: 0, scale: 1.2, duration: 0.35 }, '<')
      .to(overlay, { autoAlpha: 0, duration: 0.4 }, '-=0.08');
  }

  private async prepareIntroCanvas(canvas: HTMLCanvasElement): Promise<void> {
    if (this.introSprites.length === 0) {
      const spritePaths = [
        '/intro-particles/beer_mug.png',
        '/intro-particles/martini_glass.png',
        '/intro-particles/whiskey_glass.png',
        '/intro-particles/liquor_bottle.png',
        '/intro-particles/ice_cubes.png',
        '/intro-particles/citrus_slice.png'
      ];

      const loaded = await Promise.all(spritePaths.map((path) => this.loadIntroSprite(path)));
      this.introSprites.push(...loaded);
    }

    this.introCanvasContext = canvas.getContext('2d');
    this.resizeIntroCanvas();
    this.createIntroParticles();
    this.setupIntroParticleTimeline();
    window.addEventListener('resize', this.handleIntroResize);
  }

  private stopIntroCanvas(): void {
    window.removeEventListener('resize', this.handleIntroResize);
    this.introParticleTimeline?.kill();
    this.introParticleTimeline = null;
    this.introParticles.length = 0;
    this.introCanvasContext?.clearRect(0, 0, this.introCanvasMetrics.width, this.introCanvasMetrics.height);
    this.introCanvasContext = null;
  }

  private resizeIntroCanvas(): void {
    const canvas = this.introCanvas?.nativeElement;
    const overlay = this.introOverlay?.nativeElement;

    if (!canvas || !overlay) {
      return;
    }

    const rect = overlay.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
    canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    this.introCanvasMetrics = {
      width: rect.width,
      height: rect.height,
      radius: Math.max(rect.width, rect.height) * 0.78,
      scale: pixelRatio
    };

    if (this.introCanvasContext) {
      this.introCanvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      this.introCanvasContext.imageSmoothingEnabled = true;
      this.introCanvasContext.imageSmoothingQuality = 'medium';
    }
  }

  private createIntroParticles(): void {
    this.introParticles.length = 0;

    for (let index = 0; index < INTRO_PARTICLE_COUNT; index += 1) {
      this.introParticles.push({
        image: this.introSprites[index % this.introSprites.length],
        x: 0,
        y: 0,
        scale: 0,
        rotate: 0,
        size: gsap.utils.random(42, 92)
      });
    }
  }

  private setupIntroParticleTimeline(): void {
    this.introParticleTimeline?.kill();
    this.introParticleTimeline = gsap
      .timeline({ paused: true, onUpdate: this.drawIntroParticles })
      .fromTo(
        this.introParticles,
        {
          x: (index) => {
            const angle = (index / this.introParticles.length) * Math.PI * 2 - Math.PI / 2;
            return Math.cos(angle * 10) * this.introCanvasMetrics.radius;
          },
          y: (index) => {
            const angle = (index / this.introParticles.length) * Math.PI * 2 - Math.PI / 2;
            return Math.sin(angle * 10) * this.introCanvasMetrics.radius;
          },
          scale: () => gsap.utils.random(0.72, 1.18),
          rotate: 0
        },
        {
          duration: 3.1,
          ease: 'sine.inOut',
          x: 0,
          y: 0,
          scale: 0,
          rotate: () => gsap.utils.random(-3.6, -2.4),
          stagger: { each: -0.05, repeat: -1 }
        },
        0
      )
      .seek(62);
  }

  private readonly drawIntroParticles = (): void => {
    if (!this.introCanvasContext) {
      return;
    }

    const title = this.introTitle?.nativeElement;

    if (!title) {
      return;
    }

    const ctx = this.introCanvasContext;
    const overlayRect = this.introOverlay?.nativeElement?.getBoundingClientRect();
    const titleRect = title.getBoundingClientRect();

    if (!overlayRect) {
      return;
    }

    const centerX = titleRect.left - overlayRect.left + titleRect.width / 2;
    const centerY = titleRect.top - overlayRect.top + titleRect.height / 2;

    ctx.clearRect(0, 0, this.introCanvasMetrics.width, this.introCanvasMetrics.height);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    this.introParticles
      .slice()
      .sort((first, second) => first.scale - second.scale)
      .forEach((particle) => {
        const size = particle.size * particle.scale;
        if (size <= 0.4) {
          return;
        }

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(particle.rotate);
        ctx.shadowColor = 'rgba(210, 253, 110, 0.95)';
        ctx.shadowBlur = 10 + particle.scale * 14;
        ctx.globalAlpha = Math.min(1, 0.22 + particle.scale);
        ctx.drawImage(particle.image, particle.x, particle.y, size, size);
        ctx.restore();
      });

    ctx.restore();
  };

  private loadIntroSprite(path: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = 'async';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`No se pudo cargar ${path}`));
      image.src = path;
    });
  }
}
