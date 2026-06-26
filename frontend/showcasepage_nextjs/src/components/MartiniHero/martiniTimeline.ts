"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Object3D } from "three";
import { applyGlassState, glassStates, SCROLL_TRIGGER } from "./martiniTimeline.config";
import {
  addAffiliateScene,
  addBrandScene,
  addEcosystemScene,
  addFinalScene,
  addGlassIntroScene,
  addHowItWorksScene,
  addOperationScene,
  addOverlayScene,
  addPlatformScene,
} from "./martiniTimeline.scenes";

gsap.registerPlugin(ScrollTrigger);

export function createMartiniScrollTimeline(root: HTMLElement, glass: Object3D) {
  applyGlassState(glass, glassStates.hidden);

  return gsap.context(() => {
    gsap.set(
      [
        ".hero-logo",
        ".hero-main-copy",
        ".operation-copy",
        ".operation-indicators",
        ".operation-indicator",
        ".platform-copy",
        ".platform-drinks",
        ".platform-stonks",
        ".platform-pin",
        ".how-title",
        ".how-steps",
        ".how-step",
        ".how-reinforce-copy",
        ".ecosystem-app",
        ".ecosystem-copy",
        ".affiliate-title",
        ".affiliate-form-panel",
        ".final-cta",
      ],
      { opacity: 0 }
    );

    const scrollTl = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: SCROLL_TRIGGER.start,
        end: SCROLL_TRIGGER.end,
        scrub: SCROLL_TRIGGER.scrub,
        pin: SCROLL_TRIGGER.pin,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        markers: process.env.NODE_ENV === "development",
      },
    });

    addOverlayScene(scrollTl);
    addGlassIntroScene(scrollTl, glass);
    addBrandScene(scrollTl);
    addOperationScene(scrollTl, glass);
    addPlatformScene(scrollTl);
    addHowItWorksScene(scrollTl);
    addEcosystemScene(scrollTl);
    addAffiliateScene(scrollTl);
    addFinalScene(scrollTl, glass);

    const scrollToAffiliate = () => {
      const scrollTrigger = scrollTl.scrollTrigger;
      if (!scrollTrigger) {
        return;
      }

      window.scrollTo({
        top: scrollTrigger.labelToScroll("affiliateHold"),
        behavior: "smooth",
      });
    };

    window.addEventListener("martini:scroll-to-affiliate", scrollToAffiliate);

    return () => {
      window.removeEventListener("martini:scroll-to-affiliate", scrollToAffiliate);
      scrollTl.scrollTrigger?.kill();
      scrollTl.kill();
    };
  }, root);
}
