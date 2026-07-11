"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import "./GridScan.css";

type GridScanProps = {
  className?: string;
  style?: React.CSSProperties;
  lineThickness?: number;
  linesColor?: string;
  scanColor?: string;
  gridScale?: number;
  scanOpacity?: number;
  scanDuration?: number;
  lineJitter?: number;
};

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform vec3 iResolution;
uniform float iTime;
uniform float uLineThickness;
uniform vec3 uLinesColor;
uniform vec3 uScanColor;
uniform float uGridScale;
uniform float uScanOpacity;
uniform float uLineJitter;
varying vec2 vUv;

float hash21(vec2 p) {
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

void main() {
  vec2 uv = vUv * 2.0 - 1.0;
  float perspective = 1.0 + uv.y * 1.6;
  vec2 p = vec2(uv.x / max(perspective, 0.2), uv.y + 0.55);
  p *= 1.0 / max(uGridScale, 0.0001);

  float jitter = (hash21(floor(p * 3.0)) - 0.5) * uLineJitter;
  p.x += jitter * 0.25;

  float gx = abs(fract(p.x) - 0.5);
  float gy = abs(fract(p.y) - 0.5);
  float wx = fwidth(p.x) * (1.0 + uLineThickness * 2.0);
  float wy = fwidth(p.y) * (1.0 + uLineThickness * 2.0);
  float lineX = 1.0 - smoothstep(0.0, wx, gx);
  float lineY = 1.0 - smoothstep(0.0, wy, gy);
  float grid = max(lineX, lineY);

  float vignette = smoothstep(1.35, 0.15, length(uv));
  float depthFade = smoothstep(1.2, -0.2, uv.y);

  float scanPhase = mod(iTime /  max(0.2, 2.4), 1.0);
  float scanY = mix(-0.15, 1.15, scanPhase);
  float band = exp(-pow((vUv.y - scanY) * 12.0, 2.0));

  vec3 color = uLinesColor * grid * vignette * depthFade;
  color += uScanColor * band * uScanOpacity * (0.4 + grid * 0.6);

  float noise = (hash21(gl_FragCoord.xy + iTime) - 0.5) * 0.035;
  color += noise;

  gl_FragColor = vec4(color, clamp(max(grid * 0.9, band * 0.7) * vignette, 0.0, 1.0));
}
`;

function srgbColor(hex: string) {
  return new THREE.Color(hex).convertSRGBToLinear();
}

export function GridScan({
  className,
  style,
  lineThickness = 1,
  linesColor = "#c8ff3d",
  scanColor = "#c8ff3d",
  gridScale = 0.12,
  scanOpacity = 0.4,
  lineJitter = 0.08,
}: GridScanProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const uniforms = {
      iResolution: { value: new THREE.Vector3(container.clientWidth, container.clientHeight, renderer.getPixelRatio()) },
      iTime: { value: 0 },
      uLineThickness: { value: lineThickness },
      uLinesColor: { value: srgbColor(linesColor) },
      uScanColor: { value: srgbColor(scanColor) },
      uGridScale: { value: gridScale },
      uScanOpacity: { value: scanOpacity },
      uLineJitter: { value: lineJitter },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    const handleResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      uniforms.iResolution.value.set(container.clientWidth, container.clientHeight, renderer.getPixelRatio());
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    let raf = 0;
    const tick = () => {
      uniforms.iTime.value = performance.now() / 1000;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      material.dispose();
      (quad.geometry as THREE.BufferGeometry).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentElement === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [gridScale, lineJitter, lineThickness, linesColor, scanColor, scanOpacity]);

  return <div ref={containerRef} className={`gridscan ${className ?? ""}`} style={style} />;
}
