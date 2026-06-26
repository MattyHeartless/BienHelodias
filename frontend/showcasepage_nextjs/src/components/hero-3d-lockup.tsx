"use client";

import { createElement, type HTMLAttributes, useEffect } from "react";

const phoneProps: HTMLAttributes<HTMLElement> & Record<string, unknown> = {
  className: "hero-phone-model",
  src: "/models/bien-helodias-iphone15-front-graphite-cameras.glb",
  alt: "Modelo 3D de iPhone para Bien Helodias",
  "camera-controls": true,
  "interaction-prompt": "none",
  "shadow-intensity": "1",
  exposure: "2.18",
  orientation: "-0.27deg -10.62deg 0.02deg",
  "camera-orbit": "0deg 82deg 110%",
  "field-of-view": "26deg",
  "disable-zoom": true,
};

const martiniProps: HTMLAttributes<HTMLElement> & Record<string, unknown> = {
  className: "hero-martini-model",
  src: "/models/copa_martini_verde.glb",
  alt: "Modelo 3D de copa martini",
  "camera-controls": true,
  "interaction-prompt": "none",
  "shadow-intensity": "0.7",
  exposure: "1.85",
  orientation: "0.72deg -90deg -0.6deg",
  "camera-orbit": "20deg 78deg 120%",
  "field-of-view": "22deg",
  "disable-zoom": true,
};

export function Hero3DLockup() {
  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  return (
    <div className="hero-3d-lockup" aria-hidden="true">
      <div className="hero-3d-lockup__phone-shell">
        <div className="hero-3d-lockup__phone-glow" />
        {createElement("model-viewer", phoneProps)}
      </div>

      <div className="hero-3d-lockup__martini-shell">
        <div className="hero-3d-lockup__martini-glow" />
        {createElement("model-viewer", martiniProps)}
      </div>
    </div>
  );
}
