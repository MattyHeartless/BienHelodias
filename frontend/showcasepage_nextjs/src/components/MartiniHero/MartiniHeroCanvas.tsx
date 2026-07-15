"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Object3D } from "three";
import { applyGlassState, canvasConfig, glassStates } from "./martiniTimeline.config";

type MartiniHeroCanvasProps = {
  glassRef: MutableRefObject<Object3D>;
};

function createFallbackGlass() {
  const group = new THREE.Group();
  const material = new THREE.MeshPhysicalMaterial({
    color: canvasConfig.model.fallbackColor,
    roughness: 0.16,
    metalness: 0,
    transmission: 0.55,
    thickness: 0.65,
    transparent: true,
    opacity: 0.74,
  });

  const bowl = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.9, 64, 1, true), material);
  bowl.rotation.x = Math.PI;
  bowl.position.y = 0.45;

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 1.05, 32), material);
  stem.position.y = -0.35;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.045, 64), material);
  base.position.y = -0.9;

  group.add(bowl, stem, base);
  return group;
}

function normalizeModel(model: Object3D) {
  model.rotation.set(
    canvasConfig.model.rotationOffset.x,
    canvasConfig.model.rotationOffset.y,
    canvasConfig.model.rotationOffset.z
  );

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
}

export function MartiniHeroCanvas({ glassRef }: MartiniHeroCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    const isMobile = window.matchMedia("(max-width: 900px), (pointer: coarse)").matches;
    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      canvasConfig.camera.fov,
      mount.clientWidth / Math.max(mount.clientHeight, 1),
      canvasConfig.camera.near,
      canvasConfig.camera.far
    );
    camera.position.set(
      canvasConfig.camera.position.x,
      canvasConfig.camera.position.y,
      canvasConfig.camera.position.z
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, isMobile ? 1 : canvasConfig.renderer.maxPixelRatio)
    );
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight("#dfffe5", canvasConfig.lighting.ambientIntensity);
    const key = new THREE.DirectionalLight("#ffffff", canvasConfig.lighting.keyIntensity);
    key.position.set(2.8, 3.4, 4.6);
    const rim = new THREE.PointLight("#bfff5b", canvasConfig.lighting.rimIntensity, 9);
    rim.position.set(-2.4, 0.8, 2.2);
    scene.add(ambient, key, rim);

    const glassRoot = glassRef.current;
    glassRoot.clear();
    applyGlassState(glassRoot, glassStates.hidden);
    glassRoot.userData.operationFloatStrength = 0;

    const glassVisual = new THREE.Group();
    glassVisual.name = "martini-glass-visual";
    glassRoot.add(glassVisual);
    scene.add(glassRoot);

    const loader = new GLTFLoader();
    let disposed = false;

    loader.load(
      canvasConfig.model.url,
      (gltf) => {
        if (disposed) {
          return;
        }

        glassVisual.clear();
        const model = gltf.scene;
        normalizeModel(model);
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        glassVisual.add(model);
      },
      undefined,
      () => {
        if (!disposed && glassVisual.children.length === 0) {
          glassVisual.add(createFallbackGlass());
        }
      }
    );

    if (glassVisual.children.length === 0) {
      glassVisual.add(createFallbackGlass());
    }

    const resize = () => {
      const width = mount.clientWidth;
      const height = Math.max(mount.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    const clock = new THREE.Clock();
    const floatSeed = Math.random() * 100;
    const frameDuration = isMobile ? 1000 / 24 : 0;
    let frame: number | null = null;
    let previousRenderTime = 0;
    let isPageVisible = document.visibilityState === "visible";
    let isInViewport = true;
    const overlay = mount.parentElement?.querySelector<HTMLElement>(".hero-overlay");
    let isOverlayVisible = overlay
      ? window.getComputedStyle(overlay).visibility !== "hidden"
      : false;

    const shouldRender = () => isPageVisible && isInViewport && !isOverlayVisible;

    const render = (time: number) => {
      frame = null;
      if (!shouldRender()) {
        return;
      }

      frame = window.requestAnimationFrame(render);

      if (frameDuration && time - previousRenderTime < frameDuration) {
        return;
      }

      previousRenderTime = time;
      const elapsed = clock.getElapsedTime() + floatSeed;
      const strength = THREE.MathUtils.clamp(
        Number(glassRoot.userData.operationFloatStrength ?? 0),
        0,
        1
      );
      const floatConfig = canvasConfig.operationFloat;

      if (strength > 0.001) {
        glassVisual.position.set(
          strength *
            (Math.sin(elapsed * 1.07) * floatConfig.positionAmplitude.x +
              Math.sin(elapsed * 0.53 + 2.1) * floatConfig.positionAmplitude.x * 0.38),
          strength *
            (Math.sin(elapsed * 0.86 + 0.8) * floatConfig.positionAmplitude.y +
              Math.sin(elapsed * 1.34 + 3.2) * floatConfig.positionAmplitude.y * 0.25),
          strength * Math.sin(elapsed * 0.74 + 1.7) * floatConfig.positionAmplitude.z
        );
        glassVisual.rotation.set(
          strength * Math.sin(elapsed * 0.78 + 1.2) * floatConfig.rotationAmplitude.x,
          strength *
            (Math.sin(elapsed * 0.64 + 0.4) * floatConfig.rotationAmplitude.y +
              Math.sin(elapsed * 1.11 + 2.7) * floatConfig.rotationAmplitude.y * 0.28),
          strength * Math.sin(elapsed * 0.92 + 2.4) * floatConfig.rotationAmplitude.z
        );
      } else {
        glassVisual.position.set(0, 0, 0);
        glassVisual.rotation.set(0, 0, 0);
      }
      renderer.render(scene, camera);
    };

    const syncRenderLoop = () => {
      if (!shouldRender()) {
        if (frame !== null) {
          window.cancelAnimationFrame(frame);
          frame = null;
        }
        return;
      }

      if (frame === null) {
        previousRenderTime = 0;
        frame = window.requestAnimationFrame(render);
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
    intersectionObserver.observe(mount);
    overlayObserver?.observe(overlay, { attributes: true, attributeFilter: ["class", "style"] });
    syncRenderLoop();

    return () => {
      disposed = true;
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      observer.disconnect();
      intersectionObserver.disconnect();
      overlayObserver?.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, [glassRef]);

  return <div ref={mountRef} className="martini-canvas" aria-hidden="true" />;
}
