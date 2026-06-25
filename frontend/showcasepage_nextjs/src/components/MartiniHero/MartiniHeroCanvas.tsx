"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { Object3D } from "three";
import { applyGlassState, canvasConfig, glassStates } from "./martiniTimeline.config";

type MartiniHeroCanvasProps = {
  glass: Object3D;
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

export function MartiniHeroCanvas({ glass }: MartiniHeroCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
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
      Math.min(window.devicePixelRatio, canvasConfig.renderer.maxPixelRatio)
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

    const glassRoot = glass;
    applyGlassState(glassRoot, glassStates.hidden);
    scene.add(glassRoot);

    const loader = new GLTFLoader();
    let disposed = false;

    loader.load(
      canvasConfig.model.url,
      (gltf) => {
        if (disposed) {
          return;
        }

        glassRoot.clear();
        const model = gltf.scene;
        normalizeModel(model);
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        glassRoot.add(model);
      },
      undefined,
      () => {
        if (!disposed && glassRoot.children.length === 0) {
          glassRoot.add(createFallbackGlass());
        }
      }
    );

    if (glassRoot.children.length === 0) {
      glassRoot.add(createFallbackGlass());
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

    let frame = 0;
    const render = () => {
      frame = window.requestAnimationFrame(render);
      renderer.render(scene, camera);
    };
    render();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
      observer.disconnect();
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
  }, [glass]);

  return <div ref={mountRef} className="martini-canvas" aria-hidden="true" />;
}
