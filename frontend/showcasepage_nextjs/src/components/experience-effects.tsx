"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

export function ExperienceEffects() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((node) => {
        node.classList.add("is-visible");
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.15,
      smoothWheel: true,
      lerp: 0.08,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);

    lenis.on("scroll", ScrollTrigger.update);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((node) => {
        gsap.fromTo(
          node,
          { opacity: 0, y: 40 },
          {
            opacity: 1,
            y: 0,
            duration: 1.05,
            ease: "power3.out",
            scrollTrigger: {
              trigger: node,
              start: "top 84%",
              once: true,
            },
            onStart: () => node.classList.add("is-visible"),
          }
        );
      });

      gsap.fromTo(
        ".hero__watermark",
        { opacity: 0, y: 48 },
        {
          opacity: 1,
          y: 0,
          duration: 1.4,
          ease: "power3.out",
          delay: 0.45,
        }
      );

      gsap.fromTo(
        ".hero-stage__panel--phone",
        { y: 24, rotate: 4 },
        {
          y: -20,
          rotate: -3,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: 1.2,
          },
        }
      );

      gsap.fromTo(
        ".hero-stage__panel--business",
        { y: 0, rotate: -4 },
        {
          y: 36,
          rotate: 3,
          ease: "none",
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: 1.1,
          },
        }
      );

      gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((node) => {
        const distance = Number(node.dataset.parallax || 40);
        gsap.fromTo(
          node,
          { y: -distance * 0.3 },
          {
            y: distance,
            ease: "none",
            scrollTrigger: {
              trigger: node,
              start: "top bottom",
              end: "bottom top",
              scrub: 1.2,
            },
          }
        );
      });

      gsap.utils.toArray<HTMLElement>("[data-count-target]").forEach((node) => {
        const target = Number(node.dataset.countTarget || 0);
        const suffix = node.dataset.countSuffix || "";
        const decimals = Number(node.dataset.countDecimals || 0);
        const state = { value: 0 };

        gsap.to(state, {
          value: target,
          duration: 1.8,
          ease: "power2.out",
          scrollTrigger: {
            trigger: node,
            start: "top 85%",
            once: true,
          },
          onUpdate: () => {
            const value =
              decimals > 0
                ? state.value.toFixed(decimals)
                : Math.round(state.value).toString();
            node.textContent = `${value}${suffix}`;
          },
        });
      });
    });

    return () => {
      ctx.revert();
      cancelAnimationFrame(frame);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  return null;
}
