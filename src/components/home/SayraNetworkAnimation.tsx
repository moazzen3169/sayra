"use client";

import React, { useEffect, useId, useRef } from "react";
import gsap from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(MotionPathPlugin);

interface SayraUserConfig {
  id: string;
  inPathIndex: number;
  outPathIndex: number;
  inDuration: number;
  dwellDuration: number;
  outDuration: number;
  restDuration: number;
  phase: number;
  desktopOnly?: boolean;
}

interface DirectUserConfig {
  id: string;
  pathIndex: number;
  duration: number;
  restDuration: number;
  phase: number;
  desktopOnly?: boolean;
}

interface ParticleConfig {
  id: string;
  x: number;
  y: number;
  r: number;
  dx: number;
  dy: number;
  duration: number;
  delay: number;
  color: string;
  desktopOnly?: boolean;
}

const HUB_POS = { x: 242, y: 214 };
const DEST_POS = { x: 196, y: 412 };

const SAYRA_IN_PATHS = [
  "M 94 56 C 134 114, 186 164, 242 214",
  "M 218 40 C 222 104, 232 156, 242 214",
  "M 338 72 C 314 128, 278 172, 242 214",
  "M 366 172 C 324 184, 282 198, 242 214",
  "M 358 274 C 318 262, 280 238, 242 214",
  "M 104 134 C 150 156, 196 184, 242 214",
] as const;

const SAYRA_OUT_PATHS = [
  "M 242 214 C 258 286, 236 352, 196 412",
  "M 242 214 C 216 284, 200 348, 196 412",
] as const;

const DIRECT_PATHS = [
  "M 42 146 C 24 252, 66 356, 196 412",
  "M 46 266 C 54 334, 112 384, 196 412",
  "M 78 354 C 110 388, 150 404, 196 412",
  "M 346 344 C 314 386, 258 404, 196 412",
] as const;

// 7 SAYRA-routed users on desktop (4 on mobile)
const SAYRA_USERS: SayraUserConfig[] = [
  {
    id: "su-0",
    inPathIndex: 0,
    outPathIndex: 1,
    inDuration: 2.8,
    dwellDuration: 0.34,
    outDuration: 2.3,
    restDuration: 0.56,
    phase: 0.08,
  },
  {
    id: "su-1",
    inPathIndex: 2,
    outPathIndex: 0,
    inDuration: 2.6,
    dwellDuration: 0.3,
    outDuration: 2.2,
    restDuration: 0.5,
    phase: 0.36,
  },
  {
    id: "su-2",
    inPathIndex: 3,
    outPathIndex: 0,
    inDuration: 2.5,
    dwellDuration: 0.32,
    outDuration: 2.4,
    restDuration: 0.58,
    phase: 0.64,
  },
  {
    id: "su-3",
    inPathIndex: 5,
    outPathIndex: 1,
    inDuration: 2.7,
    dwellDuration: 0.35,
    outDuration: 2.15,
    restDuration: 0.6,
    phase: 0.85,
  },
  {
    id: "su-4",
    inPathIndex: 1,
    outPathIndex: 1,
    inDuration: 2.9,
    dwellDuration: 0.32,
    outDuration: 2.35,
    restDuration: 0.53,
    phase: 0.22,
    desktopOnly: true,
  },
  {
    id: "su-5",
    inPathIndex: 4,
    outPathIndex: 0,
    inDuration: 2.65,
    dwellDuration: 0.3,
    outDuration: 2.25,
    restDuration: 0.6,
    phase: 0.52,
    desktopOnly: true,
  },
  {
    id: "su-6",
    inPathIndex: 0,
    outPathIndex: 0,
    inDuration: 3.0,
    dwellDuration: 0.34,
    outDuration: 2.45,
    restDuration: 0.51,
    phase: 0.74,
    desktopOnly: true,
  },
];

// 4 Direct-connection users on desktop (3 on mobile)
const DIRECT_USERS: DirectUserConfig[] = [
  {
    id: "du-0",
    pathIndex: 0,
    duration: 4.4,
    restDuration: 0.6,
    phase: 0.14,
  },
  {
    id: "du-1",
    pathIndex: 1,
    duration: 3.9,
    restDuration: 0.55,
    phase: 0.49,
  },
  {
    id: "du-2",
    pathIndex: 3,
    duration: 3.7,
    restDuration: 0.65,
    phase: 0.79,
  },
  {
    id: "du-3",
    pathIndex: 2,
    duration: 3.5,
    restDuration: 0.7,
    phase: 0.31,
    desktopOnly: true,
  },
];

// Subtle deterministic ambient light particles using project tokens (14 desktop / 7 mobile)
const AMBIENT_PARTICLES: ParticleConfig[] = [
  { id: "p-0", x: 66, y: 96, r: 1.4, dx: 8, dy: -16, duration: 5.4, delay: 0, color: "#C8F78A" },
  { id: "p-1", x: 158, y: 74, r: 1.2, dx: -6, dy: -14, duration: 6.1, delay: 0.8, color: "#B8F34A" },
  { id: "p-2", x: 312, y: 124, r: 1.5, dx: -8, dy: -18, duration: 5.8, delay: 1.4, color: "#D7F8A6" },
  { id: "p-3", x: 344, y: 222, r: 1.2, dx: -10, dy: -12, duration: 6.4, delay: 0.4, color: "#B8F34A" },
  { id: "p-4", x: 64, y: 212, r: 1.3, dx: 6, dy: -16, duration: 5.9, delay: 1.1, color: "#9CA3AF" },
  { id: "p-5", x: 112, y: 318, r: 1.4, dx: 9, dy: -14, duration: 6.2, delay: 0.3, color: "#9CA3AF" },
  { id: "p-6", x: 304, y: 316, r: 1.3, dx: -7, dy: -16, duration: 5.6, delay: 1.7, color: "#C8F78A" },
  { id: "p-7", x: 148, y: 156, r: 1.1, dx: 5, dy: -12, duration: 6.5, delay: 0.9, color: "#B8F34A", desktopOnly: true },
  { id: "p-8", x: 282, y: 54, r: 1.2, dx: -5, dy: -14, duration: 5.5, delay: 2.0, color: "#F4F5EF", desktopOnly: true },
  { id: "p-9", x: 368, y: 118, r: 1.1, dx: -8, dy: -12, duration: 6.8, delay: 1.2, color: "#C8F78A", desktopOnly: true },
  { id: "p-10", x: 36, y: 326, r: 1.2, dx: 8, dy: -14, duration: 6.0, delay: 0.6, color: "#9CA3AF", desktopOnly: true },
  { id: "p-11", x: 274, y: 382, r: 1.1, dx: -6, dy: -12, duration: 5.7, delay: 1.5, color: "#9CA3AF", desktopOnly: true },
  { id: "p-12", x: 146, y: 446, r: 1.2, dx: 6, dy: -10, duration: 6.3, delay: 0.2, color: "#C8F78A", desktopOnly: true },
  { id: "p-13", x: 256, y: 292, r: 1.3, dx: -4, dy: -15, duration: 5.2, delay: 1.9, color: "#B8F34A", desktopOnly: true },
];

export interface SayraNetworkAnimationProps {
  className?: string;
}

export const SayraNetworkAnimation: React.FC<SayraNetworkAnimationProps> = ({
  className = "",
}) => {
  const uid = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);

  const sayraInPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const sayraOutPathRefs = useRef<(SVGPathElement | null)[]>([]);
  const directPathRefs = useRef<(SVGPathElement | null)[]>([]);

  const sayraStreamRefs = useRef<(SVGPathElement | null)[]>([]);
  const directStreamRefs = useRef<(SVGPathElement | null)[]>([]);
  const sayraUserRefs = useRef<(SVGGElement | null)[]>([]);
  const directUserRefs = useRef<(SVGGElement | null)[]>([]);
  const photonRefs = useRef<(SVGCircleElement | null)[]>([]);
  const particleRefs = useRef<(SVGCircleElement | null)[]>([]);

  const hubAuraRef = useRef<SVGCircleElement>(null);
  const hubOrbitOuterRef = useRef<SVGCircleElement>(null);
  const hubOrbitInnerRef = useRef<SVGCircleElement>(null);
  const hubPulseRingRefs = useRef<(SVGCircleElement | null)[]>([]);
  const hubFlashRef = useRef<SVGCircleElement>(null);

  const destPulseRef = useRef<SVGCircleElement>(null);
  const destGlowRef = useRef<SVGCircleElement>(null);

  const animationsRef = useRef<gsap.core.Animation[]>([]);
  const isVisibleRef = useRef<boolean>(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const mm = gsap.matchMedia();

    const syncVisibilityPlayback = () => {
      animationsRef.current.forEach((anim) => {
        if (isVisibleRef.current) {
          anim.resume();
        } else {
          anim.pause();
        }
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isVisibleRef.current = entry.isIntersecting;
        syncVisibilityPlayback();
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    mm.add(
      {
        isDesktop: "(min-width: 640px)",
        isMobile: "(max-width: 639px)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { isMobile = false, reduceMotion = false } =
          context.conditions ?? {};

        animationsRef.current = [];

        if (reduceMotion) {
          // Static, balanced constellation for reduced-motion preference
          SAYRA_USERS.forEach((user, idx) => {
            const el = sayraUserRefs.current[idx];
            if (!el) return;
            if (isMobile && user.desktopOnly) {
              gsap.set(el, { opacity: 0 });
              return;
            }
            const useOutbound = idx % 3 === 1;
            const pathEl = useOutbound
              ? sayraOutPathRefs.current[user.outPathIndex]
              : sayraInPathRefs.current[user.inPathIndex];
            if (!pathEl) return;

            const staticProgress = useOutbound
              ? 0.48 + (idx % 2) * 0.16
              : 0.35 + (idx % 3) * 0.18;

            const tween = gsap.to(el, {
              motionPath: {
                path: pathEl,
                align: pathEl,
                alignOrigin: [0.5, 0.5],
              },
              paused: true,
              duration: 1,
            });
            tween.progress(staticProgress);
            gsap.set(el, { opacity: 1, scale: 1 });
          });

          DIRECT_USERS.forEach((user, idx) => {
            const el = directUserRefs.current[idx];
            const pathEl = directPathRefs.current[user.pathIndex];
            if (!el || !pathEl) return;
            if (isMobile && user.desktopOnly) {
              gsap.set(el, { opacity: 0 });
              return;
            }
            const tween = gsap.to(el, {
              motionPath: {
                path: pathEl,
                align: pathEl,
                alignOrigin: [0.5, 0.5],
              },
              paused: true,
              duration: 1,
            });
            tween.progress(0.32 + idx * 0.16);
            gsap.set(el, { opacity: 1, scale: 1 });
          });

          if (hubAuraRef.current) {
            gsap.set(hubAuraRef.current, { opacity: 0.55, scale: 1 });
          }
          return;
        }

        let hubPulseIndex = 0;
        const triggerHubPulse = () => {
          if (!isVisibleRef.current) return;
          const ring =
            hubPulseRingRefs.current[
              hubPulseIndex % hubPulseRingRefs.current.length
            ];
          hubPulseIndex += 1;

          if (ring) {
            gsap.fromTo(
              ring,
              { scale: 1, opacity: 0.6 },
              {
                scale: 1.56,
                opacity: 0,
                svgOrigin: `${HUB_POS.x} ${HUB_POS.y}`,
                duration: 0.95,
                ease: "power2.out",
                overwrite: "auto",
              }
            );
          }

          if (hubFlashRef.current) {
            gsap.fromTo(
              hubFlashRef.current,
              { opacity: 0.36, scale: 0.96 },
              {
                opacity: 0,
                scale: 1.18,
                svgOrigin: `${HUB_POS.x} ${HUB_POS.y}`,
                duration: 0.7,
                ease: "power2.out",
                overwrite: "auto",
              }
            );
          }
        };

        const triggerDestPulse = (flow: "sayra" | "direct") => {
          if (!isVisibleRef.current) return;
          const color = flow === "sayra" ? "#B8F34A" : "#9CA3AF";

          if (destPulseRef.current) {
            gsap.fromTo(
              destPulseRef.current,
              {
                scale: 1,
                opacity: 0.58,
                stroke: color,
              },
              {
                scale: 1.52,
                opacity: 0,
                svgOrigin: `${DEST_POS.x} ${DEST_POS.y}`,
                duration: 0.85,
                ease: "power2.out",
                overwrite: "auto",
              }
            );
          }

          if (destGlowRef.current) {
            gsap.fromTo(
              destGlowRef.current,
              {
                opacity: 0.34,
                fill: color,
                scale: 0.94,
              },
              {
                opacity: 0.06,
                scale: 1.14,
                svgOrigin: `${DEST_POS.x} ${DEST_POS.y}`,
                duration: 0.75,
                ease: "power2.out",
                overwrite: "auto",
              }
            );
          }
        };

        // 1. SAYRA Hub ambient breathing & orbital rings
        if (hubAuraRef.current) {
          animationsRef.current.push(
            gsap.fromTo(
              hubAuraRef.current,
              {
                scale: 0.94,
                opacity: 0.42,
              },
              {
                scale: 1.09,
                opacity: 0.72,
                svgOrigin: `${HUB_POS.x} ${HUB_POS.y}`,
                duration: 3.4,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
              }
            )
          );
        }

        if (hubOrbitOuterRef.current) {
          animationsRef.current.push(
            gsap.to(hubOrbitOuterRef.current, {
              rotation: 360,
              svgOrigin: `${HUB_POS.x} ${HUB_POS.y}`,
              duration: 38,
              repeat: -1,
              ease: "none",
            })
          );
        }

        if (hubOrbitInnerRef.current) {
          animationsRef.current.push(
            gsap.to(hubOrbitInnerRef.current, {
              rotation: -360,
              svgOrigin: `${HUB_POS.x} ${HUB_POS.y}`,
              duration: 28,
              repeat: -1,
              ease: "none",
            })
          );
        }

        // 2. Path energy stream flows (dashed light current moving toward hub / destination)
        sayraStreamRefs.current.forEach((streamEl, i) => {
          if (!streamEl) return;
          animationsRef.current.push(
            gsap.fromTo(
              streamEl,
              { strokeDashoffset: 0 },
              {
                strokeDashoffset: -32,
                duration: 2.2 + (i % 3) * 0.35,
                repeat: -1,
                ease: "none",
              }
            )
          );
        });

        directStreamRefs.current.forEach((streamEl, i) => {
          if (!streamEl) return;
          animationsRef.current.push(
            gsap.fromTo(
              streamEl,
              { strokeDashoffset: 0 },
              {
                strokeDashoffset: -32,
                duration: 2.6 + (i % 2) * 0.4,
                repeat: -1,
                ease: "none",
              }
            )
          );
        });

        // 3. Tiny light photons cruising along key conduits
        const photonPaths = [
          sayraOutPathRefs.current[0],
          sayraOutPathRefs.current[1],
          directPathRefs.current[0],
          directPathRefs.current[1],
        ];
        photonRefs.current.forEach((photonEl, idx) => {
          const pathEl = photonPaths[idx];
          if (!photonEl || !pathEl) return;
          if (isMobile && idx === 3) {
            gsap.set(photonEl, { opacity: 0 });
            return;
          }
          const tl = gsap.timeline({ repeat: -1 });
          tl.set(photonEl, { opacity: 0, scale: 0.7 }, 0)
            .to(
              photonEl,
              {
                motionPath: {
                  path: pathEl,
                  align: pathEl,
                  alignOrigin: [0.5, 0.5],
                },
                duration: 2.5 + idx * 0.35,
                ease: "sine.inOut",
              },
              0
            )
            .to(photonEl, { opacity: 0.85, scale: 1, duration: 0.3 }, 0.05)
            .to(
              photonEl,
              { opacity: 0, scale: 0.6, duration: 0.35 },
              2.1 + idx * 0.35
            )
            .to({}, { duration: 0.6 });

          const dur = tl.duration();
          tl.totalTime(dur * 2 + ((idx * 0.27) % 1) * dur, true);
          animationsRef.current.push(tl);
        });

        // 4. Background floating light particles
        AMBIENT_PARTICLES.forEach((p, idx) => {
          const el = particleRefs.current[idx];
          if (!el) return;
          if (isMobile && p.desktopOnly) return;

          const tl = gsap.timeline({ repeat: -1, delay: p.delay * 0.5 });
          tl.fromTo(
            el,
            { x: 0, y: 0, opacity: 0.14 },
            {
              x: p.dx,
              y: p.dy,
              opacity: 0.5,
              duration: p.duration * 0.5,
              ease: "sine.inOut",
            }
          ).to(el, {
            x: 0,
            y: 0,
            opacity: 0.14,
            duration: p.duration * 0.5,
            ease: "sine.inOut",
          });
          animationsRef.current.push(tl);
        });

        // 5. SAYRA-Mediated Users (Multi-direction -> SAYRA Hub -> Dwell/Pulse -> Gaming Center)
        SAYRA_USERS.forEach((user, idx) => {
          const userEl = sayraUserRefs.current[idx];
          const inPath = sayraInPathRefs.current[user.inPathIndex];
          const outPath = sayraOutPathRefs.current[user.outPathIndex];
          if (!userEl || !inPath || !outPath) return;
          if (isMobile && user.desktopOnly) return;

          const tl = gsap.timeline({ repeat: -1 });
          const dwellStart = user.inDuration;
          const outStart = dwellStart + user.dwellDuration;
          const arriveTime = outStart + user.outDuration;

          tl.set(
            userEl,
            { opacity: 0, scale: 0.72, transformOrigin: "50% 50%" },
            0
          )
            .to(
              userEl,
              {
                motionPath: {
                  path: inPath,
                  align: inPath,
                  alignOrigin: [0.5, 0.5],
                },
                duration: user.inDuration,
                ease: "sine.inOut",
              },
              0
            )
            .to(
              userEl,
              { opacity: 1, scale: 1, duration: 0.48, ease: "power2.out" },
              0.04
            )
            .to(
              userEl,
              { scale: 0.76, opacity: 0.35, duration: 0.22, ease: "power2.in" },
              Math.max(0, dwellStart - 0.18)
            )
            .call(triggerHubPulse, undefined, dwellStart)
            .to(
              userEl,
              {
                motionPath: {
                  path: outPath,
                  align: outPath,
                  alignOrigin: [0.5, 0.5],
                },
                duration: user.outDuration,
                ease: "power1.inOut",
              },
              outStart
            )
            .to(
              userEl,
              { scale: 1, opacity: 1, duration: 0.26, ease: "power2.out" },
              outStart + 0.02
            )
            .to(
              userEl,
              { scale: 0.74, opacity: 0, duration: 0.36, ease: "power2.in" },
              arriveTime - 0.34
            )
            .call(() => triggerDestPulse("sayra"), undefined, arriveTime - 0.06)
            .to({}, { duration: user.restDuration }, arriveTime);

          const totalDur = tl.duration();
          tl.totalTime(totalDur * 2 + user.phase * totalDur, true);
          animationsRef.current.push(tl);
        });

        // 6. Direct-Connection Users (Outer entry -> Direct path -> Gaming Center, bypassing SAYRA)
        DIRECT_USERS.forEach((user, idx) => {
          const userEl = directUserRefs.current[idx];
          const pathEl = directPathRefs.current[user.pathIndex];
          if (!userEl || !pathEl) return;
          if (isMobile && user.desktopOnly) return;

          const tl = gsap.timeline({ repeat: -1 });
          const arriveTime = user.duration;

          tl.set(
            userEl,
            { opacity: 0, scale: 0.72, transformOrigin: "50% 50%" },
            0
          )
            .to(
              userEl,
              {
                motionPath: {
                  path: pathEl,
                  align: pathEl,
                  alignOrigin: [0.5, 0.5],
                },
                duration: user.duration,
                ease: "sine.inOut",
              },
              0
            )
            .to(
              userEl,
              { opacity: 1, scale: 1, duration: 0.5, ease: "power2.out" },
              0.04
            )
            .to(
              userEl,
              { opacity: 0, scale: 0.74, duration: 0.38, ease: "power2.in" },
              arriveTime - 0.36
            )
            .call(
              () => triggerDestPulse("direct"),
              undefined,
              arriveTime - 0.06
            )
            .to({}, { duration: user.restDuration }, arriveTime);

          const totalDur = tl.duration();
          tl.totalTime(totalDur * 2 + user.phase * totalDur, true);
          animationsRef.current.push(tl);
        });

        syncVisibilityPlayback();

        return () => {
          gsap.killTweensOf([
            ...hubPulseRingRefs.current,
            hubFlashRef.current,
            destPulseRef.current,
            destGlowRef.current,
          ]);
        };
      }
    );

    return () => {
      observer.disconnect();
      mm.revert();
    };
  }, []);

  const sayraHubAuraId = `${uid}-hub-aura`;
  const sayraHubCoreId = `${uid}-hub-core`;
  const sayraHubStrokeId = `${uid}-hub-stroke`;
  const destAuraId = `${uid}-dest-aura`;
  const limeStreamGradId = `${uid}-lime-stream`;
  const directStreamGradId = `${uid}-direct-stream`;

  return (
    <div
      ref={containerRef}
      dir="ltr"
      role="img"
      aria-label="انیمیشن شبکه اتصال گیمرها به گیمنت از طریق هاب سایرا و اتصال مستقیم"
      className={`relative aspect-[4/5] w-full overflow-hidden select-none ${className}`}
    >
      <svg
        viewBox="0 0 400 500"
        className="relative h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={sayraHubAuraId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#B8F34A" stopOpacity="0.34" />
            <stop offset="48%" stopColor="#B8F34A" stopOpacity="0.11" />
            <stop offset="100%" stopColor="#B8F34A" stopOpacity="0" />
          </radialGradient>

          <radialGradient id={sayraHubCoreId} cx="42%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#1F2418" />
            <stop offset="65%" stopColor="#12150E" />
            <stop offset="100%" stopColor="#0D100B" />
          </radialGradient>

          <linearGradient id={sayraHubStrokeId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D7F8A6" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#B8F34A" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#8EBF35" stopOpacity="0.45" />
          </linearGradient>

          <radialGradient id={destAuraId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#B8F34A" stopOpacity="0.2" />
            <stop offset="55%" stopColor="#9CA3AF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#0D100B" stopOpacity="0" />
          </radialGradient>

          <linearGradient id={limeStreamGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8EBF35" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#B8F34A" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#D7F8A6" stopOpacity="0.92" />
          </linearGradient>

          <linearGradient id={directStreamGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6B7280" stopOpacity="0.35" />
            <stop offset="60%" stopColor="#9CA3AF" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#F4F5EF" stopOpacity="0.72" />
          </linearGradient>
        </defs>

        {/* Ambient Floating Light Particles */}
        <g>
          {AMBIENT_PARTICLES.map((p, idx) => (
            <circle
              key={p.id}
              ref={(el) => {
                particleRefs.current[idx] = el;
              }}
              cx={p.x}
              cy={p.y}
              r={p.r}
              fill={p.color}
              opacity="0.22"
              className={p.desktopOnly ? "max-sm:hidden" : undefined}
            />
          ))}
        </g>

        {/* Minimal Route Key (Top-Left, using project lime & muted slate) */}
        <g opacity="0.85">
          <circle cx="24" cy="24" r="2.6" fill="#B8F34A" />
          <text
            x="32"
            y="27"
            fill="#C8F78A"
            fontSize="8.5"
            fontWeight="600"
            letterSpacing="0.16em"
          >
            SAYRA
          </text>
          <circle cx="24" cy="40" r="2.6" fill="#9CA3AF" />
          <text
            x="32"
            y="43"
            fill="#9CA3AF"
            fontSize="8.5"
            fontWeight="600"
            letterSpacing="0.16em"
          >
            DIRECT
          </text>
        </g>

        {/* ==================== DIRECT CONNECTION PATHS (MUTED SILVER / SLATE) ==================== */}
        <g>
          {DIRECT_PATHS.map((d, idx) => (
            <React.Fragment key={`direct-path-${idx}`}>
              <path
                ref={(el) => {
                  directPathRefs.current[idx] = el;
                }}
                d={d}
                fill="none"
                stroke="#9CA3AF"
                strokeOpacity="0.22"
                strokeWidth="1.2"
                strokeDasharray="3 4"
                strokeLinecap="round"
                className={idx === 2 ? "max-sm:hidden" : undefined}
              />
              <path
                ref={(el) => {
                  directStreamRefs.current[idx] = el;
                }}
                d={d}
                fill="none"
                stroke={`url(#${directStreamGradId})`}
                strokeOpacity="0.52"
                strokeWidth="1.25"
                strokeDasharray="6 26"
                strokeLinecap="round"
                className={idx === 2 ? "max-sm:hidden" : undefined}
              />
            </React.Fragment>
          ))}
        </g>

        {/* ==================== SAYRA NETWORK PATHS (PROJECT PRIMARY LIME) ==================== */}
        <g>
          {SAYRA_IN_PATHS.map((d, idx) => (
            <React.Fragment key={`sayra-in-${idx}`}>
              <path
                ref={(el) => {
                  sayraInPathRefs.current[idx] = el;
                }}
                d={d}
                fill="none"
                stroke="#B8F34A"
                strokeOpacity="0.22"
                strokeWidth="1.25"
                strokeLinecap="round"
                className={idx === 1 || idx === 4 ? "max-sm:hidden" : undefined}
              />
              <path
                ref={(el) => {
                  sayraStreamRefs.current[idx] = el;
                }}
                d={d}
                fill="none"
                stroke={`url(#${limeStreamGradId})`}
                strokeOpacity="0.65"
                strokeWidth="1.25"
                strokeDasharray="6 26"
                strokeLinecap="round"
                className={idx === 1 || idx === 4 ? "max-sm:hidden" : undefined}
              />
            </React.Fragment>
          ))}

          {SAYRA_OUT_PATHS.map((d, idx) => (
            <React.Fragment key={`sayra-out-${idx}`}>
              <path
                ref={(el) => {
                  sayraOutPathRefs.current[idx] = el;
                }}
                d={d}
                fill="none"
                stroke="#C8F78A"
                strokeOpacity="0.28"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                ref={(el) => {
                  sayraStreamRefs.current[SAYRA_IN_PATHS.length + idx] = el;
                }}
                d={d}
                fill="none"
                stroke="#B8F34A"
                strokeOpacity="0.82"
                strokeWidth="1.5"
                strokeDasharray="7 25"
                strokeLinecap="round"
              />
            </React.Fragment>
          ))}
        </g>

        {/* Tiny Conduit Energy Photons */}
        <g>
          {[
            { id: "ph-0", color: "#D7F8A6" },
            { id: "ph-1", color: "#B8F34A" },
            { id: "ph-2", color: "#F4F5EF" },
            { id: "ph-3", color: "#9CA3AF" },
          ].map((ph, idx) => (
            <circle
              key={ph.id}
              ref={(el) => {
                photonRefs.current[idx] = el;
              }}
              cx="0"
              cy="0"
              r="2.1"
              fill={ph.color}
              opacity="0"
              className={idx === 3 ? "max-sm:hidden" : undefined}
            />
          ))}
        </g>

        {/* ==================== MOVING USER NODES (DIRECT) ==================== */}
        <g>
          {DIRECT_USERS.map((user, idx) => (
            <g
              key={user.id}
              ref={(el) => {
                directUserRefs.current[idx] = el;
              }}
              opacity="0"
              className={user.desktopOnly ? "max-sm:hidden" : undefined}
            >
              <circle
                cx="0"
                cy="0"
                r="13"
                fill="#9CA3AF"
                fillOpacity="0.14"
              />
              <circle
                cx="0"
                cy="0"
                r="9.2"
                fill="#101014"
                stroke="#9CA3AF"
                strokeWidth="1.25"
              />
              <circle
                cx="0"
                cy="-2.1"
                r="2.1"
                fill="none"
                stroke="#F4F5EF"
                strokeWidth="1.2"
              />
              <path
                d="M -3.9 4 C -3.9 1.6, 3.9 1.6, 3.9 4"
                fill="none"
                stroke="#F4F5EF"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>

        {/* ==================== MOVING USER NODES (SAYRA ROUTE) ==================== */}
        <g>
          {SAYRA_USERS.map((user, idx) => (
            <g
              key={user.id}
              ref={(el) => {
                sayraUserRefs.current[idx] = el;
              }}
              opacity="0"
              className={user.desktopOnly ? "max-sm:hidden" : undefined}
            >
              <circle
                cx="0"
                cy="0"
                r="13.5"
                fill="#B8F34A"
                fillOpacity="0.16"
              />
              <circle
                cx="0"
                cy="0"
                r="9.4"
                fill="#0D100B"
                stroke="#B8F34A"
                strokeWidth="1.25"
              />
              <circle
                cx="0"
                cy="-2.1"
                r="2.1"
                fill="none"
                stroke="#F4F5EF"
                strokeWidth="1.2"
              />
              <path
                d="M -3.9 4 C -3.9 1.6, 3.9 1.6, 3.9 4"
                fill="none"
                stroke="#F4F5EF"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>

        {/* ==================== SAYRA DIGITAL HUB (CENTER-RIGHT) ==================== */}
        <g>
          {/* Breathing Central Aura */}
          <circle
            ref={hubAuraRef}
            cx={HUB_POS.x}
            cy={HUB_POS.y}
            r="86"
            fill={`url(#${sayraHubAuraId})`}
            opacity="0.52"
          />

          {/* Reactive Entry Flash */}
          <circle
            ref={hubFlashRef}
            cx={HUB_POS.x}
            cy={HUB_POS.y}
            r="46"
            fill="#C8F78A"
            opacity="0"
          />

          {/* Reactive Pulse Rings */}
          {[0, 1].map((ringIdx) => (
            <circle
              key={`hub-pulse-${ringIdx}`}
              ref={(el) => {
                hubPulseRingRefs.current[ringIdx] = el;
              }}
              cx={HUB_POS.x}
              cy={HUB_POS.y}
              r="37"
              fill="none"
              stroke="#B8F34A"
              strokeWidth="1.4"
              opacity="0"
            />
          ))}

          {/* Slow Orbital Circuit Rings */}
          <circle
            ref={hubOrbitOuterRef}
            cx={HUB_POS.x}
            cy={HUB_POS.y}
            r="52"
            fill="none"
            stroke="#B8F34A"
            strokeOpacity="0.32"
            strokeWidth="1"
            strokeDasharray="3 8"
          />
          <circle
            ref={hubOrbitInnerRef}
            cx={HUB_POS.x}
            cy={HUB_POS.y}
            r="44"
            fill="none"
            stroke="#D7F8A6"
            strokeOpacity="0.38"
            strokeWidth="0.9"
            strokeDasharray="20 12 6 12"
          />

          {/* Hub Core Disc */}
          <circle
            cx={HUB_POS.x}
            cy={HUB_POS.y}
            r="36"
            fill={`url(#${sayraHubCoreId})`}
            stroke={`url(#${sayraHubStrokeId})`}
            strokeWidth="1.6"
          />
          <circle
            cx={HUB_POS.x}
            cy={HUB_POS.y}
            r="31"
            fill="none"
            stroke="#D7F8A6"
            strokeOpacity="0.16"
            strokeWidth="0.75"
          />

          {/* SAYRA Logotype & Emblem */}
          <text
            x={HUB_POS.x}
            y={HUB_POS.y + 3}
            textAnchor="middle"
            fill="#F4F5EF"
            fontSize="13.5"
            fontWeight="800"
            letterSpacing="0.18em"
          >
            SAYRA
          </text>
          <line
            x1={HUB_POS.x - 14}
            y1={HUB_POS.y + 11}
            x2={HUB_POS.x + 14}
            y2={HUB_POS.y + 11}
            stroke="#B8F34A"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx={HUB_POS.x} cy={HUB_POS.y - 13} r="2" fill="#B8F34A" />
        </g>

        {/* ==================== GAMING CENTER DESTINATION ==================== */}
        <g>
          {/* Ambient & Reactive Arrival Glow */}
          <circle
            cx={DEST_POS.x}
            cy={DEST_POS.y}
            r="56"
            fill={`url(#${destAuraId})`}
          />
          <circle
            ref={destGlowRef}
            cx={DEST_POS.x}
            cy={DEST_POS.y}
            r="34"
            fill="#B8F34A"
            opacity="0.06"
          />
          <circle
            ref={destPulseRef}
            cx={DEST_POS.x}
            cy={DEST_POS.y}
            r="27"
            fill="none"
            stroke="#B8F34A"
            strokeWidth="1.35"
            opacity="0"
          />

          {/* Destination Node Core */}
          <circle
            cx={DEST_POS.x}
            cy={DEST_POS.y}
            r="26"
            fill="#101014"
            stroke="#2E2E35"
            strokeWidth="1.25"
          />
          {/* Dual-stream accent arcs (Muted Slate Direct + Lime SAYRA) */}
          <path
            d={`M ${DEST_POS.x} ${DEST_POS.y - 26} A 26 26 0 0 0 ${DEST_POS.x} ${DEST_POS.y + 26}`}
            fill="none"
            stroke="#9CA3AF"
            strokeOpacity="0.68"
            strokeWidth="1.4"
          />
          <path
            d={`M ${DEST_POS.x} ${DEST_POS.y - 26} A 26 26 0 0 1 ${DEST_POS.x} ${DEST_POS.y + 26}`}
            fill="none"
            stroke="#B8F34A"
            strokeOpacity="0.82"
            strokeWidth="1.4"
          />

          {/* Minimal Gaming Monitor Icon */}
          <g transform={`translate(${DEST_POS.x}, ${DEST_POS.y})`}>
            <rect
              x="-10.5"
              y="-8.5"
              width="21"
              height="13.5"
              rx="2.2"
              fill="none"
              stroke="#F4F5EF"
              strokeWidth="1.4"
            />
            <path
              d="M -5.5 -1.8 L -2.2 -1.8 L -0.2 -4.5 L 1.8 0.6 L 3.6 -1.8 L 5.8 -1.8"
              fill="none"
              stroke="#B8F34A"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M 0 5 L 0 8.5 M -5 8.5 L 5 8.5"
              fill="none"
              stroke="#F4F5EF"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </g>

          {/* GAMING CENTER Label */}
          <rect
            x={DEST_POS.x - 56}
            y={DEST_POS.y + 34}
            width="112"
            height="20"
            rx="10"
            fill="#1F1F23"
            fillOpacity="0.92"
            stroke="#2E2E35"
            strokeWidth="1"
          />
          <text
            x={DEST_POS.x}
            y={DEST_POS.y + 47}
            textAnchor="middle"
            fill="#F4F5EF"
            fontSize="8.5"
            fontWeight="700"
            letterSpacing="0.2em"
          >
            GAMING CENTER
          </text>
        </g>
      </svg>
    </div>
  );
};
