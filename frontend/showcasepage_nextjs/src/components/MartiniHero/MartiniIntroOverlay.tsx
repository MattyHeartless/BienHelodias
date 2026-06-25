"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const introLines = ["BIEN", "HELODIAS"];
const spritePaths = [
  "/intro-particles/beer_mug.png",
  "/intro-particles/martini_glass.png",
  "/intro-particles/whiskey_glass.png",
  "/intro-particles/liquor_bottle.png",
  "/intro-particles/ice_cubes.png",
  "/intro-particles/citrus_slice.png",
];
const PARTICLE_COUNT = 34;

type IntroParticle = {
  image: HTMLImageElement;
  x: number;
  y: number;
  scale: number;
  rotate: number;
  size: number;
};

function loadSprite(path: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`No se pudo cargar ${path}`));
    image.src = path;
  });
}

export function MartiniIntroOverlay() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let particleTl: gsap.core.Timeline | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let disposed = false;
    const particles: IntroParticle[] = [];
    const metrics = {
      width: 0,
      height: 0,
      radius: 0,
      scale: 1,
    };

    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;
      if (!canvas || !overlay) {
        return;
      }

      const rect = overlay.getBoundingClientRect();
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
      canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      metrics.width = rect.width;
      metrics.height = rect.height;
      metrics.radius = Math.max(rect.width, rect.height) * 0.78;
      metrics.scale = pixelRatio;

      if (ctx) {
        ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "medium";
      }
    };

    const drawParticles = () => {
      const title = titleRef.current;
      const overlay = overlayRef.current;
      if (!ctx || !title || !overlay) {
        return;
      }

      const overlayRect = overlay.getBoundingClientRect();
      const titleRect = title.getBoundingClientRect();
      const centerX = titleRect.left - overlayRect.left + titleRect.width / 2;
      const centerY = titleRect.top - overlayRect.top + titleRect.height / 2;

      ctx.clearRect(0, 0, metrics.width, metrics.height);
      ctx.save();
      ctx.globalCompositeOperation = "screen";

      particles
        .slice()
        .sort((first, second) => first.scale - second.scale)
        .forEach((particle) => {
          const size = particle.size * particle.scale;
          if (size <= 0.4) {
            return;
          }

          ctx?.save();
          ctx?.translate(centerX, centerY);
          ctx?.rotate(particle.rotate);
          if (ctx) {
            ctx.shadowColor = "rgba(210, 253, 110, 0.95)";
            ctx.shadowBlur = 10 + particle.scale * 14;
            ctx.globalAlpha = Math.min(1, 0.22 + particle.scale);
            ctx.drawImage(particle.image, particle.x, particle.y, size, size);
          }
          ctx?.restore();
        });

      ctx.restore();
    };

    const runIntro = async () => {
      const overlay = overlayRef.current;
      const canvas = canvasRef.current;
      const glow = glowRef.current;
      const title = titleRef.current;
      const letters = Array.from(
        overlay?.querySelectorAll<HTMLElement>(".intro-letter") ?? []
      );

      if (!overlay || !canvas || !glow || !title || letters.length === 0) {
        setHidden(true);
        return;
      }

      const sprites = await Promise.all(spritePaths.map((path) => loadSprite(path)));
      if (disposed) {
        return;
      }

      ctx = canvas.getContext("2d");
      resizeCanvas();
      particles.push(
        ...Array.from({ length: PARTICLE_COUNT }, (_, index) => ({
          image: sprites[index % sprites.length],
          x: 0,
          y: 0,
          scale: 0,
          rotate: 0,
          size: gsap.utils.random(42, 92),
        }))
      );

      particleTl = gsap
        .timeline({ paused: true, onUpdate: drawParticles })
        .fromTo(
          particles,
          {
            x: (index) => {
              const angle = (index / particles.length) * Math.PI * 2 - Math.PI / 2;
              return Math.cos(angle * 10) * metrics.radius;
            },
            y: (index) => {
              const angle = (index / particles.length) * Math.PI * 2 - Math.PI / 2;
              return Math.sin(angle * 10) * metrics.radius;
            },
            scale: () => gsap.utils.random(0.72, 1.18),
            rotate: 0,
          },
          {
            duration: 3.1,
            ease: "sine.inOut",
            x: 0,
            y: 0,
            scale: 0,
            rotate: () => gsap.utils.random(-3.6, -2.4),
            stagger: { each: -0.05, repeat: -1 },
          },
          0
        )
        .seek(62);

      window.addEventListener("resize", resizeCanvas);
      particleTl.play(0);

      gsap
        .timeline({
          defaults: { ease: "power3.out" },
          onComplete: () => {
            particleTl?.kill();
            ctx?.clearRect(0, 0, metrics.width, metrics.height);
            setHidden(true);
          },
        })
        .set(overlay, { autoAlpha: 1 })
        .fromTo(
          glow,
          { scale: 0.78, autoAlpha: 0.18 },
          { scale: 1.08, autoAlpha: 0.92, duration: 0.9 },
          0
        )
        .to({}, { duration: 0.18 })
        .fromTo(
          letters,
          {
            autoAlpha: 0,
            yPercent: 120,
            rotateX: -85,
            transformOrigin: "50% 50% -24px",
          },
          { autoAlpha: 1, yPercent: 0, rotateX: 0, duration: 0.72, stagger: 0.035 },
          "<"
        )
        .to(title, { letterSpacing: "0.02em", duration: 0.4 }, "-=0.42")
        .to({}, { duration: 0.8 })
        .to(particleTl, { timeScale: 1.8, duration: 0.35, ease: "power2.in" }, "-=0.45")
        .to(title, { autoAlpha: 0, y: -14, duration: 0.35, ease: "power2.in" })
        .to(glow, { autoAlpha: 0, scale: 1.2, duration: 0.35 }, "<")
        .to(overlay, { autoAlpha: 0, duration: 0.4 }, "-=0.08");
    };

    void runIntro();

    return () => {
      disposed = true;
      window.removeEventListener("resize", resizeCanvas);
      particleTl?.kill();
    };
  }, []);

  if (hidden) {
    return null;
  }

  return (
    <div ref={overlayRef} className="intro-overlay" aria-hidden="true">
      <canvas ref={canvasRef} className="intro-overlay__canvas" />
      <div ref={glowRef} className="intro-overlay__glow" />
      <div className="intro-overlay__content">
        <h1 ref={titleRef} className="intro-overlay__title">
          {introLines.map((line) => (
            <span className="intro-line" key={line}>
              {Array.from(line).map((char, index) => (
                <span
                  className={`intro-letter ${char === " " ? "intro-letter--space" : ""}`}
                  key={`${line}-${char}-${index}`}
                >
                  {char === " " ? "\u00A0" : char}
                </span>
              ))}
            </span>
          ))}
        </h1>
      </div>
    </div>
  );
}
