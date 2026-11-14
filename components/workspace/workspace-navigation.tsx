import React from "react";
import Link from "next/link";
import { Orbit } from "lucide-react";

export function WorkspaceNavigation() {
  return (
    <header className="w-full border-b border-white/10 bg-[#071321]/60 backdrop-blur-md sticky top-0 z-30">
      <nav
        aria-label="Workspace Navigation"
        className="mx-auto flex max-w-[1700px] items-center justify-between px-6 py-3.5 sm:px-8"
      >
        {/* Brand / Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <Orbit className="h-4 w-4" aria-hidden="true" />
          </div>
          <span className="text-base font-semibold tracking-tight text-white">
            Lunar Mission Planner
          </span>
        </Link>

        {/* Navigation Items */}
        <div className="flex items-center gap-2 sm:gap-5">
          <button
            type="button"
            className="rounded-full bg-sky-500/20 px-3.5 py-1.5 text-xs font-medium text-sky-200 ring-1 ring-sky-400/40 shadow-sm"
            aria-current="page"
          >
            Mission Planner
          </button>
          <Link
            href="/analysis"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Analysis
          </Link>
          <a
            href="#compare"
            onClick={(e) => e.preventDefault()}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Compare
          </a>
          <a
            href="#about"
            onClick={(e) => e.preventDefault()}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            About
          </a>
        </div>
      </nav>
    </header>
  );
}

