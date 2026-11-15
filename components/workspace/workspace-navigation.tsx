import React from "react";
import Link from "next/link";
import { Orbit, ArrowLeft, Bot } from "lucide-react";

export interface WorkspaceNavigationProps {
  onToggleSis?: () => void;
  isSisOpen?: boolean;
}

export function WorkspaceNavigation({
  onToggleSis,
  isSisOpen = false,
}: WorkspaceNavigationProps) {
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
        <div className="flex items-center gap-2 sm:gap-4">
          <span
            className="rounded-full bg-sky-500/20 px-3.5 py-1.5 text-xs font-semibold text-sky-200 ring-1 ring-sky-400/40 shadow-sm"
            aria-current="page"
          >
            Mission Planner
          </span>
          <a
            href="#mission-analysis-heading"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Analysis
          </a>
          <Link
            href="/mission-results"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-sky-300 hover:text-white hover:bg-sky-500/20 transition-colors"
          >
            Results
          </Link>
          <Link
            href="/3d-simulation"
            className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
          >
            Simulation
          </Link>
          <a
            href="#compare"
            onClick={(e) => e.preventDefault()}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Compare
          </a>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Back to Input</span>
          </Link>

          {/* Compact SIS Assistant Launcher Button at Far Right */}
          <button
            type="button"
            onClick={onToggleSis}
            aria-label="Open SIS Assistant"
            aria-expanded={isSisOpen}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all shadow-sm active:scale-95 cursor-pointer ${
              isSisOpen
                ? "bg-orange-500 text-white ring-2 ring-orange-400 shadow-orange-500/30"
                : "bg-sky-500/20 text-sky-200 ring-1 ring-sky-400/40 hover:bg-sky-500/30 shadow-sky-500/20"
            }`}
          >
            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            <span>SIS</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
