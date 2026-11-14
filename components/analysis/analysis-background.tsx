import React from "react";

export function AnalysisBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden bg-[#071321] pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* 1. Static fallback image for loading, errors, and prefers-reduced-motion */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat bg-center"
        style={{
          backgroundImage: `url('/images/lunar-mission-background.png')`,
        }}
      />

      {/* 2. Passive, looping decorative MP4 video (suppressed if prefers-reduced-motion) */}
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover object-center motion-reduce:hidden"
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src="/animations/analysis-background.mp4" type="video/mp4" />
        <source src="/animations/background.mp4" type="video/mp4" />
      </video>

      {/* 3. Layered atmosphere and readability gradients */}
      {/* Top integration gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            rgba(7, 19, 33, 0.75) 0%, 
            rgba(7, 19, 33, 0.35) 25%, 
            rgba(7, 19, 33, 0.10) 60%, 
            rgba(7, 19, 33, 0.50) 100%)`,
        }}
      />

      {/* Content contrast gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, 
            rgba(4, 13, 25, 0.65) 0%, 
            rgba(4, 13, 25, 0.30) 50%, 
            rgba(4, 13, 25, 0.45) 100%)`,
        }}
      />
    </div>
  );
}

