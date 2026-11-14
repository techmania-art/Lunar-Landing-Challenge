import React from "react";
import { Orbit } from "lucide-react";

export function LandingNavigation() {
  return (
    <header className="w-full border-b border-white/10 bg-[#071321]/40 backdrop-blur-md">
      <nav
        aria-label="Main Navigation"
        className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-12"
      >
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/20">
            <Orbit className="h-5 w-5" aria-hidden="true" />
          </div>
          <span className="text-base font-semibold tracking-tight text-white sm:text-lg">
            Lunar Mission Planner
          </span>
        </div>

        {/* Navigation Links */}
        <div className="flex items-center gap-2 sm:gap-6">
          <button
            type="button"
            className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-medium text-white shadow-sm ring-1 ring-white/20 transition-colors sm:text-sm"
            aria-current="page"
          >
            Mission Planner
          </button>
          <a
            href="#about"
            onClick={(e) => e.preventDefault()}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white transition-colors sm:text-sm"
          >
            About
          </a>
          <a
            href="#docs"
            onClick={(e) => e.preventDefault()}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-white/70 hover:text-white transition-colors sm:text-sm"
          >
            Documentation
          </a>
        </div>
      </nav>
    </header>
  );
}

