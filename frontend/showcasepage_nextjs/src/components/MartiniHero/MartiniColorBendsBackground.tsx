"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";

type MartiniColorBendsBackgroundProps = {
  className?: string;
  style?: CSSProperties;
  rotation?: number;
  speed?: number;
  colors?: string[];
  transparent?: boolean;
  autoRotate?: number;
  scale?: number;
  frequency?: number;
  warpStrength?: number;
  mouseInfluence?: number;
  parallax?: number;
  noise?: number;
  iterations?: number;
  intensity?: number;
  bandWidth?: number;
};

const MAX_COLORS = 8 as const;

const fragmentShader = `
#define MAX_COLORS ${MAX_COLORS}
uniform vec2 uCanvas;
uniform float uTime;
uniform float uSpeed;
uniform vec2 uRot;
uniform int uColorCount;
uniform vec3 uColors[MAX_COLORS];
uniform int uTransparent;
uniform float uScale;
uniform float uFrequency;
uniform float uWarpStrength;
uniform vec2 uPointer;
uniform float uMouseInfluence;
uniform float uParallax;
uniform float uNoise;
uniform int uIterations;
uniform float uIntensity;
uniform float uBandWidth;
varying vec2 vUv;

void main() {
  float t = uTime * uSpeed;
  vec2 p = vUv * 2.0 - 1.0;
  p += uPointer * uParallax * 0.1;
  vec2 rp = vec2(p.x * uRot.x - p.y * uRot.y, p.x * uRot.y + p.y * uRot.x);
  vec2 q = vec2(rp.x * (uCanvas.x / uCanvas.y), rp.y);
  q /= max(uScale, 0.0001);
  q /= 0.5 + 0.2 * dot(q, q);
  q += 0.2 * cos(t) - 7.56;
  vec2 toward = (uPointer - rp);
  q += toward * uMouseInfluence * 0.2;

  for (int j = 0; j < 5; j++) {
    if (j >= uIterations - 1) break;
    vec2 rr = sin(1.5 * (q.yx * uFrequency) + 2.0 * cos(q * uFrequency));
    q += (rr - q) * 0.15;
  }

  vec3 col = vec3(0.0);
  float a = 1.0;

  if (uColorCount > 0) {
    vec2 s = q;
    vec3 sumCol = vec3(0.0);
    float cover = 0.0;

    for (int i = 0; i < MAX_COLORS; ++i) {
      if (i >= uColorCount) break;
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(i)) / 4.0);
      float m = mix(m0, m1, kMix);
      float w = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
      sumCol += uColors[i] * w;
      cover = max(cover, w);
    }

    col = clamp(sumCol, 0.0, 1.0);
    a = uTransparent > 0 ? cover : 1.0;
  } else {
    vec2 s = q;
    for (int k = 0; k < 3; ++k) {
      s -= 0.01;
      vec2 r = sin(1.5 * (s.yx * uFrequency) + 2.0 * cos(s * uFrequency));
      float m0 = length(r + sin(5.0 * r.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float kBelow = clamp(uWarpStrength, 0.0, 1.0);
      float kMix = pow(kBelow, 0.3);
      float gain = 1.0 + max(uWarpStrength - 1.0, 0.0);
      vec2 disp = (r - s) * kBelow;
      vec2 warped = s + disp * gain;
      float m1 = length(warped + sin(5.0 * warped.y * uFrequency - 3.0 * t + float(k)) / 4.0);
      float m = mix(m0, m1, kMix);
      col[k] = 1.0 - exp(-uBandWidth / exp(uBandWidth * m));
    }
    a = uTransparent > 0 ? max(max(col.r, col.g), col.b) : 1.0;
  }

  col *= uIntensity;

  if (uNoise > 0.0001) {
    float n = fract(sin(dot(gl_FragCoord.xy + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453123);
    col += (n - 0.5) * uNoise;
    col = clamp(col, 0.0, 1.0);
  }

  vec3 rgb = (uTransparent > 0) ? col * a : col;
  gl_FragColor = vec4(rgb, a);
}
`;

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

function colorToVector(hex: string) {
  const value = hex.replace("#", "").trim();
  const rgb =
    value.length === 3
      ? [
          Number.parseInt(value[0] + value[0], 16),
          Number.parseInt(value[1] + value[1], 16),
          Number.parseInt(value[2] + value[2], 16),
        ]
      : [
          Number.parseInt(value.slice(0, 2), 16),
          Number.parseInt(value.slice(2, 4), 16),
          Number.parseInt(value.slice(4, 6), 16),
        ];

  return new THREE.Vector3(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255);
}

export function MartiniColorBendsBackground({
  className = "",
  style,
  rotation = 90,
  speed = 0.2,
  colors = [],
  transparent = true,
  autoRotate = 0,
  scale = 1,
  frequency = 1,
  warpStrength = 1,
  mouseInfluence = 1,
  parallax = 0.5,
  noise = 0.15,
  iterations = 1,
  intensity = 1.5,
  bandWidth = 6,
}: MartiniColorBendsBackgroundProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const frameRef = useRef<number | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const rotationRef = useRef(rotation);
  const autoRotateRef = useRef(autoRotate);
  const initialPropsRef = useRef({
    bandWidth,
    frequency,
    intensity,
    iterations,
    mouseInfluence,
    noise,
    parallax,
    scale,
    speed,
    transparent,
    warpStrength,
  });
  const pointerTargetRef = useRef(new THREE.Vector2(0, 0));
  const pointerCurrentRef = useRef(new THREE.Vector2(0, 0));

  useEffect(() => {
    const container = containerRef.current;
    const isMobile = window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
    if (!container) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const colorUniforms = Array.from({ length: MAX_COLORS }, () => new THREE.Vector3(0, 0, 0));
    const initialProps = initialPropsRef.current;

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uCanvas: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uSpeed: { value: initialProps.speed },
        uRot: { value: new THREE.Vector2(1, 0) },
        uColorCount: { value: 0 },
        uColors: { value: colorUniforms },
        uTransparent: { value: initialProps.transparent ? 1 : 0 },
        uScale: { value: initialProps.scale },
        uFrequency: { value: initialProps.frequency },
        uWarpStrength: { value: initialProps.warpStrength },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uMouseInfluence: { value: initialProps.mouseInfluence },
        uParallax: { value: initialProps.parallax },
        uNoise: { value: initialProps.noise },
        uIterations: { value: initialProps.iterations },
        uIntensity: { value: initialProps.intensity },
        uBandWidth: { value: initialProps.bandWidth },
      },
      premultipliedAlpha: true,
      transparent: true,
    });
    materialRef.current = material;

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance",
      alpha: true,
    });
    rendererRef.current = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 0.65 : 1.5));
    renderer.setClearColor(0x000000, initialProps.transparent ? 0 : 1);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    const clock = new THREE.Clock();

    const handleResize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      renderer.setSize(width, height, false);
      (material.uniforms.uCanvas.value as THREE.Vector2).set(width, height);
    };

    handleResize();
    const observer = new ResizeObserver(handleResize);
    observer.observe(container);
    resizeObserverRef.current = observer;

    const frameDuration = isMobile ? 1000 / 18 : 0;
    let previousRenderTime = 0;
    let isPageVisible = document.visibilityState === "visible";
    let isInViewport = true;
    const overlay = container.parentElement?.querySelector<HTMLElement>(".hero-overlay");
    let isOverlayVisible = overlay
      ? window.getComputedStyle(overlay).visibility !== "hidden"
      : false;

    const shouldRender = () => isPageVisible && isInViewport && !isOverlayVisible;

    const loop = (time: number) => {
      frameRef.current = null;
      if (!shouldRender()) {
        return;
      }

      frameRef.current = window.requestAnimationFrame(loop);

      if (frameDuration && time - previousRenderTime < frameDuration) {
        return;
      }

      previousRenderTime = time;
      const delta = clock.getDelta();
      const elapsed = clock.elapsedTime;
      material.uniforms.uTime.value = elapsed;

      const degrees = (rotationRef.current % 360) + autoRotateRef.current * elapsed;
      const radians = (degrees * Math.PI) / 180;
      (material.uniforms.uRot.value as THREE.Vector2).set(Math.cos(radians), Math.sin(radians));

      const pointer = pointerCurrentRef.current;
      pointer.lerp(pointerTargetRef.current, Math.min(1, delta * 8));
      (material.uniforms.uPointer.value as THREE.Vector2).copy(pointer);

      renderer.render(scene, camera);
    };

    const syncRenderLoop = () => {
      if (!shouldRender()) {
        if (frameRef.current !== null) {
          window.cancelAnimationFrame(frameRef.current);
          frameRef.current = null;
        }
        return;
      }

      if (frameRef.current === null) {
        previousRenderTime = 0;
        frameRef.current = window.requestAnimationFrame(loop);
      }
    };

    const handleVisibilityChange = () => {
      isPageVisible = document.visibilityState === "visible";
      syncRenderLoop();
    };

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isInViewport = entry.isIntersecting;
      syncRenderLoop();
    });
    const overlayObserver = overlay
      ? new MutationObserver(() => {
          isOverlayVisible = window.getComputedStyle(overlay).visibility !== "hidden";
          syncRenderLoop();
        })
      : null;

    document.addEventListener("visibilitychange", handleVisibilityChange);
    intersectionObserver.observe(container);
    overlayObserver?.observe(overlay, { attributes: true, attributeFilter: ["class", "style"] });
    syncRenderLoop();

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      resizeObserverRef.current?.disconnect();
      intersectionObserver.disconnect();
      overlayObserver?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const material = materialRef.current;
    const renderer = rendererRef.current;
    if (!material) {
      return;
    }

    rotationRef.current = rotation;
    autoRotateRef.current = autoRotate;
    material.uniforms.uSpeed.value = speed;
    material.uniforms.uScale.value = scale;
    material.uniforms.uFrequency.value = frequency;
    material.uniforms.uWarpStrength.value = warpStrength;
    material.uniforms.uMouseInfluence.value = mouseInfluence;
    material.uniforms.uParallax.value = parallax;
    material.uniforms.uNoise.value = noise;
    material.uniforms.uIterations.value = iterations;
    material.uniforms.uIntensity.value = intensity;
    material.uniforms.uBandWidth.value = bandWidth;

    const vectors = colors.filter(Boolean).slice(0, MAX_COLORS).map(colorToVector);
    const uniforms = material.uniforms.uColors.value as THREE.Vector3[];
    for (let index = 0; index < MAX_COLORS; index += 1) {
      if (index < vectors.length) {
        uniforms[index].copy(vectors[index]);
      } else {
        uniforms[index].set(0, 0, 0);
      }
    }
    material.uniforms.uColorCount.value = vectors.length;
    material.uniforms.uTransparent.value = transparent ? 1 : 0;
    renderer?.setClearColor(0x000000, transparent ? 0 : 1);
  }, [
    autoRotate,
    bandWidth,
    colors,
    frequency,
    intensity,
    iterations,
    mouseInfluence,
    noise,
    parallax,
    rotation,
    scale,
    speed,
    transparent,
    warpStrength,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      const y = -(((event.clientY - rect.top) / (rect.height || 1)) * 2 - 1);
      pointerTargetRef.current.set(x, y);
    };

    container.addEventListener("pointermove", handlePointerMove);
    return () => container.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`martini-color-bends ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}
