"use client";

import React, { useEffect, useRef } from "react";

interface ArcSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface LightningBolt {
  segments: ArcSegment[];
  branches: ArcSegment[][];
  birthTime: number;
  fadeDurationMs: number;
  peakOpacity: number;
}

export function SolarLightning() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check prefers-reduced-motion
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      if (mediaQuery.matches) {
        return; // Do not run animation loop if reduced motion is requested
      }
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let nextStrikeTimeoutId: NodeJS.Timeout;
    let isDisposed = false;

    let width = 0;
    let height = 0;
    let currentBolt: LightningBolt | null = null;

    // Handles container resize and device pixel ratio
    const updateSize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = rect.width;
      height = rect.height;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && canvas.parentElement) {
      resizeObserver = new ResizeObserver(() => {
        updateSize();
      });
      resizeObserver.observe(canvas.parentElement);
      updateSize();
    } else {
      updateSize();
    }

    // Generates a jagged electrical arc with optional short branches
    const generateBolt = (): LightningBolt => {
      const segments: ArcSegment[] = [];
      const branches: ArcSegment[][] = [];

      // Start somewhere along the top or upper edge of the card
      const startX = Math.random() * (width * 0.8) + width * 0.1;
      const startY = Math.random() * (height * 0.2);
      const targetX = startX + (Math.random() - 0.5) * (width * 0.5);
      const targetY = Math.min(height, startY + (Math.random() * 0.6 + 0.3) * height);

      let curX = startX;
      let curY = startY;
      const numSteps = Math.floor(Math.random() * 5) + 6;
      const dx = (targetX - startX) / numSteps;
      const dy = (targetY - startY) / numSteps;

      for (let i = 0; i < numSteps; i++) {
        const nextX = curX + dx + (Math.random() - 0.5) * 24;
        const nextY = curY + dy + (Math.random() - 0.5) * 8;

        segments.push({
          startX: curX,
          startY: curY,
          endX: nextX,
          endY: nextY,
        });

        // Occasional branch
        if (Math.random() < 0.3 && branches.length < 2) {
          const branchSegments: ArcSegment[] = [];
          let bX = nextX;
          let bY = nextY;
          const bAngle = (Math.random() - 0.5) * 0.8 + 0.4;
          for (let b = 0; b < 3; b++) {
            const nbX = bX + Math.cos(bAngle) * 14 + (Math.random() - 0.5) * 10;
            const nbY = bY + Math.sin(bAngle) * 14 + (Math.random() - 0.5) * 6;
            branchSegments.push({ startX: bX, startY: bY, endX: nbX, endY: nbY });
            bX = nbX;
            bY = nbY;
          }
          branches.push(branchSegments);
        }

        curX = nextX;
        curY = nextY;
      }

      return {
        segments,
        branches,
        birthTime: performance.now(),
        fadeDurationMs: Math.random() * 150 + 300, // 300 - 450 ms
        peakOpacity: Math.random() * 0.15 + 0.65, // 0.65 - 0.80
      };
    };

    const scheduleNextStrike = () => {
      if (isDisposed) return;
      const intervalMs = Math.random() * 3500 + 4000; // 4 to 7.5 seconds
      nextStrikeTimeoutId = setTimeout(() => {
        if (!isDisposed && width > 40 && height > 40) {
          currentBolt = generateBolt();
        }
        scheduleNextStrike();
      }, intervalMs);
    };

    // Render loop
    const render = (now: number) => {
      if (isDisposed) return;

      ctx.clearRect(0, 0, width, height);

      if (currentBolt) {
        const elapsed = now - currentBolt.birthTime;
        if (elapsed < currentBolt.fadeDurationMs) {
          const progress = elapsed / currentBolt.fadeDurationMs;
          // Fast attack, exponential decay fade
          const alpha = currentBolt.peakOpacity * (1 - Math.pow(progress, 1.4));

          ctx.save();
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          // 1. Soft Outer Cyan Glow
          ctx.shadowColor = "rgba(56, 189, 248, 0.85)";
          ctx.shadowBlur = 10;
          ctx.strokeStyle = `rgba(56, 189, 248, ${alpha * 0.5})`;
          ctx.lineWidth = 3.5;

          ctx.beginPath();
          currentBolt.segments.forEach((seg) => {
            ctx.moveTo(seg.startX, seg.startY);
            ctx.lineTo(seg.endX, seg.endY);
          });
          currentBolt.branches.forEach((branch) => {
            branch.forEach((seg) => {
              ctx.moveTo(seg.startX, seg.startY);
              ctx.lineTo(seg.endX, seg.endY);
            });
          });
          ctx.stroke();

          // 2. Crisp Center Electrical Core
          ctx.shadowBlur = 0;
          ctx.strokeStyle = `rgba(224, 242, 254, ${alpha})`;
          ctx.lineWidth = 1.6;

          ctx.beginPath();
          currentBolt.segments.forEach((seg) => {
            ctx.moveTo(seg.startX, seg.startY);
            ctx.lineTo(seg.endX, seg.endY);
          });
          currentBolt.branches.forEach((branch) => {
            branch.forEach((seg) => {
              ctx.moveTo(seg.startX, seg.startY);
              ctx.lineTo(seg.endX, seg.endY);
            });
          });
          ctx.stroke();

          ctx.restore();
        } else {
          currentBolt = null;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    // Schedule first strike quickly (1.5s after load)
    nextStrikeTimeoutId = setTimeout(() => {
      if (!isDisposed && width > 40 && height > 40) {
        currentBolt = generateBolt();
      }
      scheduleNextStrike();
    }, 1500);

    animationFrameId = requestAnimationFrame(render);

    return () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      clearTimeout(nextStrikeTimeoutId);
      resizeObserver?.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      role="presentation"
      className="pointer-events-none absolute inset-0 z-0 h-full w-full overflow-hidden rounded-xl motion-reduce:hidden"
    />
  );
}
