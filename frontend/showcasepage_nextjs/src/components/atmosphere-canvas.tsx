"use client";

import { useEffect, useRef } from "react";

type AtmosphereCanvasProps = {
  className?: string;
  accent?: "lime" | "wine";
};

export function AtmosphereCanvas({
  className = "",
  accent = "lime",
}: AtmosphereCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let pointerX = 0.5;
    let pointerY = 0.35;

    const palette =
      accent === "wine"
        ? {
            primary: "205,255,61",
            secondary: "109,38,72",
            tertiary: "26,70,120",
          }
        : {
            primary: "205,255,61",
            secondary: "18,52,92",
            tertiary: "83,29,56",
          };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const drawBlob = (
      x: number,
      y: number,
      radius: number,
      color: string,
      alpha: number
    ) => {
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${color}, ${alpha})`);
      gradient.addColorStop(0.6, `rgba(${color}, ${alpha * 0.32})`);
      gradient.addColorStop(1, `rgba(${color}, 0)`);
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    };

    const render = (time: number) => {
      const t = time * 0.00028;
      context.clearRect(0, 0, width, height);

      context.fillStyle = "rgba(3, 5, 4, 0.14)";
      context.fillRect(0, 0, width, height);

      drawBlob(
        width * (0.2 + Math.sin(t) * 0.08),
        height * (0.2 + Math.cos(t * 1.2) * 0.05),
        Math.max(width * 0.22, 120),
        palette.secondary,
        0.42
      );

      drawBlob(
        width * (0.74 + Math.cos(t * 1.1) * 0.07),
        height * (0.28 + Math.sin(t * 0.9) * 0.05),
        Math.max(width * 0.2, 120),
        palette.tertiary,
        0.36
      );

      drawBlob(
        width * (pointerX * 0.6 + 0.2),
        height * (pointerY * 0.55 + 0.18),
        Math.max(width * 0.18, 100),
        palette.primary,
        0.28
      );

      drawBlob(
        width * (0.5 + Math.sin(t * 0.8) * 0.04),
        height * (0.82 + Math.cos(t * 0.7) * 0.03),
        Math.max(width * 0.14, 90),
        palette.primary,
        0.13
      );

      frame = requestAnimationFrame(render);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX / window.innerWidth;
      pointerY = event.clientY / window.innerHeight;
    };

    resize();
    frame = requestAnimationFrame(render);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [accent]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
