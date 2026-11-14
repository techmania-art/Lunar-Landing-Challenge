import React from "react";

export function LandingBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden bg-[#071321] pointer-events-none select-none"
      aria-hidden="true"
    >
      {/* Lunar landscape background image */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat bg-[center_top_20%] md:bg-[center_center]"
        style={{
          backgroundImage: `url('/images/lunar-mission-background.png')`,
        }}
      />

      {/* Layered readability & atmosphere gradients */}
      {/* 1. Upper sky blend & vertical atmosphere */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            rgba(7, 19, 33, 0.75) 0%, 
            rgba(7, 19, 33, 0.35) 25%, 
            rgba(7, 19, 33, 0.05) 55%, 
            rgba(7, 19, 33, 0.40) 100%)`,
        }}
      />

      {/* 2. Left hero text contrast gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, 
            rgba(4, 13, 25, 0.65) 0%, 
            rgba(4, 13, 25, 0.40) 35%, 
            rgba(4, 13, 25, 0.10) 65%, 
            rgba(4, 13, 25, 0.25) 100%)`,
        }}
      />

      {/* 3. Soft radial blend behind the right-hand mission card to seat it naturally */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 48% 65% at 80% 50%, 
            rgba(8, 22, 39, 0.35) 0%, 
            rgba(8, 22, 39, 0.12) 55%, 
            transparent 100%)`,
        }}
      />
    </div>
  );
}

