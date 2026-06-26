import type { Object3D } from "three";

const degToRad = (degrees: number) => (degrees * Math.PI) / 180;

export const SCROLL_TRIGGER = {
  start: "top top",
  end: "+=7200",
  scrub: 0.45,
  pin: true,
};

export const SCENE_DURATION = {
  overlayOut: 1,
  glassIntro: 1,
  logoIn: 1,
  glassLeft: 1.5,
  copyIn: 1,
  indicatorsIn: 1,
  transition: 0.8,
  platformIn: 1,
  howItWorksIn: 1.2,
  ecosystemIn: 1,
  formIn: 1.2,
  final: 1.2,
};

export const SCENE_HOLD = {
  heroIntro: 1.2,
  operation: 1.5,
  platform: 1.35,
  howItWorks: 1.4,
  ecosystem: 1.35,
  affiliate: 1.4,
  final: 1.6,
};

export const animationPresets = {
  fadeUpFrom: {
    opacity: 0,
    y: 40,
  },
  fadeUpTo: {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: "power2.out",
  },
  fadeDownFrom: {
    opacity: 0,
    y: -40,
  },
  fadeLeftFrom: {
    opacity: 0,
    x: -40,
  },
  fadeOutUp: {
    opacity: 0,
    y: -40,
    duration: 0.6,
    ease: "power2.inOut",
  },
};

export const glassStates = {
  hidden: {
    scale: 0.4,
    position: { x: 0, y: -0.5, z: 0 },
    rotation: { x: 0, y: -0.8, z: 0 },
  },
  centerHero: {
    scale: 1.5,
    position: { x: 0, y: -0.5, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  },
  leftFeature: {
    scale: 0.69,
    position: { x: -2.35, y: -0.62, z: -0.2 },
    rotation: { x: 0, y: 0.45, z: 0.26 },
  },
  finalCenter: {
    scale: 1.7,
    position: { x: 0, y: -0.5, z: 0.4 },
    rotation: { x: 0, y: 0, z: 0 },
  },
};

export const canvasConfig = {
  renderer: {
    maxPixelRatio: 1.5,
  },
  camera: {
    fov: 38,
    near: 0.1,
    far: 100,
    position: { x: 0, y: 0.15, z: 6 },
  },
  model: {
    url: "/models/copa_martini_verde.glb",
    fallbackColor: "#84f0a2",
    rotationOffset: { x: degToRad(-90), y: degToRad(2.78), z: degToRad(0) },
  },
  operationFloat: {
    positionAmplitude: { x: 0.05, y: 0.07, z: 0.03 },
    rotationAmplitude: { x: degToRad(1.8), y: degToRad(3.2), z: degToRad(2.4) },
  },
  lighting: {
    ambientIntensity: 1.1,
    keyIntensity: 4.2,
    rimIntensity: 2.8,
  },
};

export function applyGlassState(glass: Object3D, state: typeof glassStates.hidden) {
  glass.position.set(state.position.x, state.position.y, state.position.z);
  glass.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
  glass.scale.setScalar(state.scale);
}
