import gsap from "gsap";
import type { Object3D } from "three";
import { SCENE_DURATION, SCENE_HOLD, animationPresets, glassStates } from "./martiniTimeline.config";

type MartiniTimeline = gsap.core.Timeline;

function tweenScale(scrollTl: MartiniTimeline, glass: Object3D, scale: number, duration: number, label: string) {
  return scrollTl.to(
    glass.scale,
    {
      x: scale,
      y: scale,
      z: scale,
      duration,
      ease: "power2.out",
    },
    label
  );
}

function addSceneHold(scrollTl: MartiniTimeline, duration: number, label: string) {
  scrollTl.addLabel(label);
  scrollTl.to({}, { duration, ease: "none" }, label);
}

export function addOverlayScene(scrollTl: MartiniTimeline) {
  scrollTl.addLabel("overlayOut");
  scrollTl.to(
    ".hero-overlay",
    {
      opacity: 0,
      duration: SCENE_DURATION.overlayOut,
      ease: "power2.inOut",
      onComplete: () => gsap.set(".hero-overlay", { visibility: "hidden" }),
      onReverseComplete: () => gsap.set(".hero-overlay", { visibility: "visible" }),
    },
    "overlayOut"
  );
}

export function addGlassIntroScene(scrollTl: MartiniTimeline, glass: Object3D) {
  const { fadeUpFrom, fadeUpTo } = animationPresets;

  scrollTl.addLabel("glassIntro");
  scrollTl
    .fromTo(
      glass.scale,
      {
        x: glassStates.hidden.scale,
        y: glassStates.hidden.scale,
        z: glassStates.hidden.scale,
      },
      {
        x: glassStates.centerHero.scale,
        y: glassStates.centerHero.scale,
        z: glassStates.centerHero.scale,
        duration: SCENE_DURATION.glassIntro,
        ease: "power2.out",
      },
      "glassIntro"
    )
    .fromTo(
      glass.rotation,
      { y: glassStates.hidden.rotation.y },
      {
        y: glassStates.centerHero.rotation.y,
        duration: SCENE_DURATION.glassIntro,
        ease: "power2.out",
      },
      "glassIntro"
    )
    .fromTo(
      glass.position,
      glassStates.hidden.position,
      {
        ...glassStates.centerHero.position,
        duration: SCENE_DURATION.glassIntro,
        ease: "power2.out",
      },
      "glassIntro"
    )
    .fromTo(
      ".hero-main-copy",
      fadeUpFrom,
      { ...fadeUpTo, duration: 1 },
      "glassIntro+=0.2"
    );

  addSceneHold(scrollTl, SCENE_HOLD.heroIntro, "heroIntroHold");
}

export function addBrandScene(scrollTl: MartiniTimeline) {
  scrollTl.addLabel("logoIn");
  scrollTl.fromTo(
    ".hero-logo",
    { opacity: 0, y: 40 },
    {
      opacity: 1,
      y: 0,
      duration: SCENE_DURATION.logoIn,
      ease: "power2.out",
    },
    "logoIn"
  );
}

export function addOperationScene(scrollTl: MartiniTimeline, glass: Object3D) {
  const { fadeUpFrom, fadeUpTo, fadeOutUp } = animationPresets;

  scrollTl.addLabel("glassLeft");
  scrollTl
    .to(".hero-main-copy", fadeOutUp, "glassLeft")
    .to(
      glass.position,
      {
        x: glassStates.leftFeature.position.x,
        y: glassStates.leftFeature.position.y,
        z: glassStates.leftFeature.position.z,
        duration: SCENE_DURATION.glassLeft,
        ease: "power2.inOut",
      },
      "glassLeft"
    )
    .to(
      glass.rotation,
      {
        y: glassStates.leftFeature.rotation.y,
        z: glassStates.leftFeature.rotation.z,
        duration: SCENE_DURATION.glassLeft,
        ease: "power2.inOut",
      },
      "glassLeft"
    )
    .to(
      glass.scale,
      {
        x: glassStates.leftFeature.scale,
        y: glassStates.leftFeature.scale,
        z: glassStates.leftFeature.scale,
        duration: SCENE_DURATION.glassLeft,
        ease: "power2.inOut",
      },
      "glassLeft"
    );

  scrollTl.addLabel("operationText");
  scrollTl
    .to(
      glass.userData,
      {
        operationFloatStrength: 1,
        duration: 0.8,
        ease: "power2.out",
      },
      "operationText-=0.2"
    )
    .fromTo(
      ".operation-copy",
      fadeUpFrom,
      { ...fadeUpTo, duration: SCENE_DURATION.copyIn },
      "operationText-=0.4"
    );

  scrollTl.addLabel("indicatorsIn");
  scrollTl
    .to(".operation-indicators", { autoAlpha: 1, duration: 0.2 }, "indicatorsIn")
    .fromTo(
      ".operation-indicator",
      { opacity: 0, y: 24 },
      {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: "power2.out",
      },
      "indicatorsIn"
    );

  addSceneHold(scrollTl, SCENE_HOLD.operation, "operationHold");

  scrollTl.addLabel("operationOut");
  scrollTl
    .to(".operation-copy", fadeOutUp, "operationOut")
    .to(
      glass.userData,
      {
        operationFloatStrength: 0,
        duration: 0.45,
        ease: "power2.inOut",
      },
      "operationOut"
    )
    .to(
      ".operation-indicators",
      {
        autoAlpha: 0,
        duration: 0.5,
        ease: "power2.inOut",
      },
      "operationOut"
    )
    .to(
      ".operation-indicator",
      {
        opacity: 0,
        y: -24,
        duration: 0.5,
        stagger: 0.08,
        ease: "power2.inOut",
      },
      "operationOut"
    )
    .to(
      glass.position,
      {
        y: -0.2,
        duration: SCENE_DURATION.transition,
        ease: "power2.inOut",
      },
      "operationOut"
    )
    .to(
      glass.scale,
      {
        x: 0,
        y: 0,
        z: 0,
        duration: SCENE_DURATION.transition,
        ease: "power2.inOut",
      },
      "operationOut"
    );
}

export function addCommissionScene(scrollTl: MartiniTimeline) {
  const panels = gsap.utils.toArray<HTMLElement>(".commission-panel");
  const commissionStepWeights = [1, 1.3, 1, 1];
  const totalCommissionWeight = commissionStepWeights.reduce((sum, weight) => sum + weight, 0);

  gsap.set(panels, { yPercent: 100, autoAlpha: 1 });
  if (panels[0]) {
    gsap.set(panels[0], { yPercent: 0 });
  }

  scrollTl.addLabel("commissionIn");
  scrollTl
    .fromTo(
      ".commission-stack",
      { opacity: 0, y: 48, scale: 0.96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: SCENE_DURATION.commissionIn,
        ease: "power2.out",
      },
      "commissionIn"
    );

  scrollTl.addLabel("commissionPanels");
  panels.slice(1).forEach((panel, index) => {
    const position = index === 0 ? "commissionPanels" : ">";

    scrollTl.to(
      panel,
      {
        yPercent: 0,
        duration: SCENE_DURATION.commissionPanels * (commissionStepWeights[index] / totalCommissionWeight),
        ease: "power1.inOut",
      },
      position
    );

    if (index === 3) {
      scrollTl.to(
        ".hero-logo",
        {
          color: "#ffffff",
          textShadow:
            "0 8px 24px rgba(0, 0, 0, 0.42), 0 0 16px rgba(255, 255, 255, 0.2), 0 0 42px rgba(255, 255, 255, 0.14)",
          duration: 0.45,
          ease: "power2.inOut",
        },
        position
      );
    }
  });

  addSceneHold(scrollTl, SCENE_HOLD.commission, "commissionHold");

  scrollTl.addLabel("commissionOut");
  scrollTl
    .to(
      ".hero-logo",
      {
        color: "var(--martini-lime)",
        textShadow:
          "0 8px 24px rgba(0, 0, 0, 0.42), 0 0 16px rgba(200, 255, 61, 0.18), 0 0 42px rgba(200, 255, 61, 0.12)",
        duration: 0.35,
        ease: "power2.inOut",
      },
      "commissionOut"
    )
    .to(
      ".commission-stack",
      {
        opacity: 0,
        y: -32,
        scale: 0.98,
        duration: SCENE_DURATION.transition,
        ease: "power2.inOut",
      },
      "commissionOut"
    );
}

export function addPlatformScene(scrollTl: MartiniTimeline) {
  const { fadeUpFrom, fadeUpTo, fadeDownFrom, fadeLeftFrom } = animationPresets;

  scrollTl.addLabel("platformIn");
  scrollTl
    .fromTo(".platform-copy", fadeUpFrom, { ...fadeUpTo, duration: 0.8 }, "platformIn")
    .fromTo(
      ".platform-drinks",
      fadeDownFrom,
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
      "platformIn+=0.2"
    )
    .fromTo(
      ".platform-stonks",
      fadeUpFrom,
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
      "platformIn+=0.35"
    )
    .fromTo(
      ".platform-pin",
      fadeLeftFrom,
      { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" },
      "platformIn+=0.5"
    );

  addSceneHold(scrollTl, SCENE_HOLD.platform, "platformHold");

  scrollTl.addLabel("platformOut");
  scrollTl.to(
    [".platform-copy", ".platform-drinks", ".platform-stonks", ".platform-pin"],
    {
      opacity: 0,
      y: -40,
      duration: 0.7,
      stagger: 0.05,
      ease: "power2.inOut",
    },
    "platformOut"
  );
}

export function addHowItWorksScene(scrollTl: MartiniTimeline) {
  const { fadeUpFrom, fadeUpTo } = animationPresets;

  scrollTl.addLabel("howItWorksIn");
  scrollTl
    .fromTo(".how-title", fadeUpFrom, { ...fadeUpTo, duration: 0.8 }, "howItWorksIn")
    .to(".how-steps", { autoAlpha: 1, duration: 0.2 }, "howItWorksIn+=0.1")
    .fromTo(
      ".how-step",
      { opacity: 0, y: 32, scale: 0.96 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.18,
        ease: "power2.out",
      },
      "howItWorksIn+=0.2"
    )
    .fromTo(
      ".how-reinforce-copy",
      fadeUpFrom,
      { ...fadeUpTo, duration: 0.8 },
      "howItWorksIn+=0.9"
    );

  addSceneHold(scrollTl, SCENE_HOLD.howItWorks, "howItWorksHold");

  scrollTl.addLabel("howItWorksOut");
  scrollTl.to(
    [".how-title", ".how-reinforce-copy", ".how-steps", ".how-step"],
    {
      opacity: 0,
      y: -32,
      duration: 0.7,
      stagger: 0.04,
      ease: "power2.inOut",
    },
    "howItWorksOut"
  );
}

export function addEcosystemScene(scrollTl: MartiniTimeline) {
  const { fadeUpFrom, fadeUpTo, fadeOutUp } = animationPresets;

  scrollTl.addLabel("ecosystemIn");
  scrollTl.fromTo(
    ".ecosystem-app",
    { opacity: 0, y: -40 },
    {
      opacity: 1,
      y: 0,
      duration: 0.7,
      stagger: 0.16,
      ease: "power2.out",
    },
    "ecosystemIn"
  );

  scrollTl.addLabel("ecosystemCopy");
  scrollTl.fromTo(
    ".ecosystem-copy",
    fadeUpFrom,
    { ...fadeUpTo, duration: 1 },
    "ecosystemCopy"
  );

  addSceneHold(scrollTl, SCENE_HOLD.ecosystem, "ecosystemHold");

  scrollTl.addLabel("ecosystemOut");
  scrollTl
    .to(
      ".ecosystem-app",
      {
        opacity: 0,
        y: -32,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.inOut",
      },
      "ecosystemOut"
    )
    .to(".ecosystem-copy", fadeOutUp, "ecosystemOut");
}

export function addAffiliateScene(scrollTl: MartiniTimeline) {
  scrollTl.addLabel("formIn");
  scrollTl
    .to(
      ".hero-logo",
      {
        autoAlpha: 0,
        y: -24,
        duration: 0.5,
        ease: "power2.inOut",
      },
      "formIn-=0.25"
    )
    .fromTo(
      ".affiliate-title",
      { opacity: 0, y: -40 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power2.out",
      },
      "formIn"
    )
    .fromTo(
      ".affiliate-form-panel",
      { opacity: 0, yPercent: 100 },
      {
        opacity: 1,
        yPercent: 0,
        duration: SCENE_DURATION.formIn,
        ease: "power2.out",
      },
      "formIn+=0.15"
    );

  addSceneHold(scrollTl, SCENE_HOLD.affiliate, "affiliateHold");
}

export function addFinalScene(scrollTl: MartiniTimeline, glass: Object3D) {
  const { fadeUpFrom, fadeUpTo } = animationPresets;

  scrollTl.addLabel("finalCta");
  scrollTl
    .to(
      ".affiliate-form-panel",
      {
        yPercent: -20,
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut",
      },
      "finalCta"
    )
    .to(
      ".affiliate-title",
      {
        opacity: 0,
        y: -24,
        duration: 0.6,
        ease: "power2.inOut",
      },
      "finalCta"
    );

  tweenScale(scrollTl, glass, glassStates.finalCenter.scale, SCENE_DURATION.final, "finalCta");
  scrollTl
    .to(
      glass.position,
      {
        ...glassStates.finalCenter.position,
        duration: SCENE_DURATION.final,
        ease: "power2.out",
      },
      "finalCta"
    )
    .to(
      glass.rotation,
      {
        y: glassStates.finalCenter.rotation.y,
        z: glassStates.finalCenter.rotation.z,
        duration: SCENE_DURATION.final,
        ease: "power2.out",
      },
      "finalCta"
    )
    .fromTo(
      ".final-cta",
      fadeUpFrom,
      { ...fadeUpTo, duration: 1 },
      "finalCta+=0.3"
    );

  addSceneHold(scrollTl, SCENE_HOLD.final, "finalHold");
}
