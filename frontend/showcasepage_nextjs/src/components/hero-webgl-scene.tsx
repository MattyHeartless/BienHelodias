"use client";

import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

type HeroWebGLSceneProps = {
  className?: string;
};

const vertex = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragment = /* glsl */ `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPointer;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);

  return mix(a, b, u.x) +
         (c - a) * u.y * (1.0 - u.x) +
         (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec2 uv = vUv;
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 centered = (uv - 0.5) * aspect;
  vec2 pointer = (uPointer - 0.5) * vec2(aspect.x, 1.0);
  float time = uTime * 0.14;

  vec2 warp = centered;
  warp += 0.18 * vec2(
    sin(centered.y * 4.5 + time * 3.5),
    cos(centered.x * 5.2 - time * 2.8)
  );

  float field = fbm(warp * 2.8 + vec2(time * 0.7, -time * 0.35));
  float field2 = fbm(warp * 4.4 - vec2(time * 0.45, time * 0.62));

  float beam = smoothstep(0.18, 0.95, 1.0 - length(centered - pointer) * 1.3);
  float ring = smoothstep(0.44, 0.0, abs(length(centered + vec2(0.14, -0.08)) - 0.36));
  float streak = smoothstep(0.72, 0.08, abs(centered.y + 0.14 * sin(centered.x * 3.6 + time * 4.0)));

  vec3 base = vec3(0.02, 0.03, 0.03);
  vec3 charcoal = vec3(0.03, 0.06, 0.05);
  vec3 cobalt = vec3(0.05, 0.18, 0.34);
  vec3 wine = vec3(0.27, 0.10, 0.18);
  vec3 lime = vec3(0.78, 1.00, 0.24);

  vec3 color = base;
  color += charcoal * (0.7 + field * 0.6);
  color += cobalt * smoothstep(0.26, 0.92, field + streak * 0.22);
  color += wine * smoothstep(0.32, 0.96, field2 + ring * 0.25);
  color += lime * beam * 0.42;
  color += lime * streak * 0.08;

  float vignette = smoothstep(1.18, 0.16, length(centered * vec2(0.85, 1.15)));
  color *= vignette;

  gl_FragColor = vec4(color, 0.92);
}
`;

export function HeroWebGLScene({ className = "" }: HeroWebGLSceneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const renderer = new Renderer({
      canvas,
      alpha: true,
      antialias: true,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    });

    const gl = renderer.gl;
    if (!gl) {
      return;
    }

    gl.clearColor(0, 0, 0, 0);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [1, 1] },
        uPointer: { value: [0.52, 0.34] },
      },
      depthTest: false,
      depthWrite: false,
      cullFace: null,
      transparent: true,
    });

    const mesh = new Mesh(gl, { geometry, program });

    let frame = 0;
    let width = 1;
    let height = 1;
    let pointerX = 0.52;
    let pointerY = 0.34;
    let targetX = 0.52;
    let targetY = 0.34;

    const resize = () => {
      const parent = canvas.parentElement;
      const rect = parent?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);

      renderer.dpr = Math.min(window.devicePixelRatio || 1, 2);
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [width, height];
    };

    const onPointerMove = (event: PointerEvent) => {
      targetX = event.clientX / window.innerWidth;
      targetY = 1 - event.clientY / window.innerHeight;
    };

    const render = (time: number) => {
      pointerX += (targetX - pointerX) * 0.06;
      pointerY += (targetY - pointerY) * 0.06;

      program.uniforms.uTime.value = time * 0.001;
      program.uniforms.uPointer.value = [pointerX, pointerY];

      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(render);
    };

    resize();
    frame = requestAnimationFrame(render);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      geometry.remove();
      program.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
