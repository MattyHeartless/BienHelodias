"use client";

import { useEffect, useRef } from "react";

type MartiniBeamsBackgroundProps = {
  className?: string;
  beamWidth?: number;
  beamHeight?: number;
  beamNumber?: number;
  lightColor?: string;
  speed?: number;
  noiseIntensity?: number;
  scale?: number;
  rotation?: number;
};

type Beam = {
  lane: number;
  phase: number;
  drift: number;
  width: number;
  alpha: number;
};

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split("").map((char) => `${char}${char}`).join("")
    : normalized, 16);

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function createBeam(index: number, total: number, beamWidth: number): Beam {
  return {
    lane: total <= 1 ? 0.5 : index / (total - 1),
    phase: Math.random() * Math.PI * 2,
    drift: -0.18 + Math.random() * 0.36,
    width: beamWidth * (0.78 + Math.random() * 0.52),
    alpha: 0.42 + Math.random() * 0.38,
  };
}

export function MartiniBeamsBackground({
  className = "",
  beamWidth = 1.5,
  beamHeight = 14,
  beamNumber = 13,
  lightColor = "#d2fd6e",
  speed = 1,
  noiseIntensity = 1.75,
  scale = 0.2,
  rotation = 0,
}: MartiniBeamsBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const color = hexToRgb(lightColor);
    const beams = Array.from({ length: beamNumber }, (_, index) =>
      createBeam(index, beamNumber, beamWidth)
    );
    let frame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let elapsed = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const drawBeam = (beam: Beam, index: number) => {
      const shortestSide = Math.min(width, height);
      const spread = shortestSide * 0.86;
      const centerX = width / 2;
      const centerY = height / 2;
      const time = prefersReducedMotion ? 0 : elapsed * 0.001 * speed;
      const wave = Math.sin(time + beam.phase);
      const noise = Math.sin(time * 1.9 + index * 2.17) * noiseIntensity;
      const x = centerX - spread / 2 + spread * beam.lane + wave * 34 * noiseIntensity;
      const y = centerY + beam.drift * shortestSide + noise * 12;
      const length = shortestSide * beamHeight * scale;
      const lineWidth = Math.max(1, shortestSide * 0.006 * beam.width);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotation * Math.PI) / 180 + wave * 0.04);

      const gradient = ctx.createLinearGradient(0, -length / 2, 0, length / 2);
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);
      gradient.addColorStop(0.22, `rgba(${color.r}, ${color.g}, ${color.b}, ${beam.alpha * 0.2})`);
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${beam.alpha})`);
      gradient.addColorStop(0.78, `rgba(${color.r}, ${color.g}, ${color.b}, ${beam.alpha * 0.2})`);
      gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

      ctx.globalCompositeOperation = "lighter";
      ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, 0.72)`;
      ctx.shadowBlur = shortestSide * 0.025 * noiseIntensity;
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(0, -length / 2);
      ctx.lineTo(0, length / 2);
      ctx.stroke();
      ctx.restore();
    };

    const render = (time: number) => {
      elapsed = time;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "rgba(3, 6, 5, 0.06)";
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-width / 2, -height / 2);
      beams.forEach(drawBeam);
      ctx.restore();

      frame = window.requestAnimationFrame(render);
    };

    resize();
    frame = window.requestAnimationFrame(render);

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [beamHeight, beamNumber, beamWidth, lightColor, noiseIntensity, rotation, scale, speed]);

  return <canvas ref={canvasRef} className={`martini-beams ${className}`} aria-hidden="true" />;
}
