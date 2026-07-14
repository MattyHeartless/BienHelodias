"use client";

import { useEffect, useRef, useState } from "react";
import { Group } from "three";
import type { Object3D } from "three";
import { MartiniColorBendsBackground } from "./MartiniColorBendsBackground";
import { MartiniHeroCanvas } from "./MartiniHeroCanvas";
import { MartiniHeroContent } from "./MartiniHeroContent";
import { MartiniIntroOverlay } from "./MartiniIntroOverlay";
import { createMartiniScrollTimeline } from "./martiniTimeline";

export function MartiniHero() {
  const rootRef = useRef<HTMLElement>(null);
  const [glass] = useState<Object3D>(() => new Group());

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const scrollContext = createMartiniScrollTimeline(root, glass);
    return () => scrollContext.revert();
  }, [glass]);

  return (
    <section ref={rootRef} className="martini-hero">
      <div className="martini-hero__backdrop" aria-hidden="true" />
      <MartiniColorBendsBackground
        className="martini-color-bends--scroll"
        rotation={90}
        speed={0.2}
        colors={["#95da08", "#e1ff96", "#72ae02"]}
        transparent
        autoRotate={0}
        scale={1.2}
        frequency={1}
        warpStrength={1}
        mouseInfluence={1}
        parallax={0.5}
        noise={0.15}
        iterations={1}
        intensity={1.5}
        bandWidth={6}
      />
      <MartiniHeroCanvas glass={glass} />
      <MartiniHeroContent />
      <MartiniIntroOverlay />
    </section>
  );
}
