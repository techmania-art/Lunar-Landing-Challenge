import React from "react";

export function AnalysisBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 h-screen w-screen overflow-hidden bg-[#071321] pointer-events-none select-none"
      style={{
        backgroundImage: "url('/images/Horizon.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        width: "100vw",
        height: "100vh",
      }}
      aria-hidden="true"
    >
      {/* Existing atmospheric and content contrast gradients preserving workspace readability */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, 
            rgba(7, 19, 33, 0.60) 0%, 
            rgba(7, 19, 33, 0.20) 25%, 
            rgba(7, 19, 33, 0.10) 60%, 
            rgba(7, 19, 33, 0.40) 100%)`,
        }}
      />

      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, 
            rgba(4, 13, 25, 0.55) 0%, 
            rgba(4, 13, 25, 0.20) 50%, 
            rgba(4, 13, 25, 0.35) 100%)`,
        }}
      />
    </div>
  );
}
