import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Orbit } from "lucide-react";

export const metadata: Metadata = {
  title: "3D Simulation | Lunar Mission Planner",
  description: "3D simulation workspace for lunar landing and surface operations.",
};

export default function SimulationPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#071321] text-white font-sans">
      {/* Top Navigation */}
      <header className="w-full border-b border-white/10 bg-[#071321]/80 backdrop-blur-md sticky top-0 z-30">
        <nav
          aria-label="Simulation Navigation"
          className="mx-auto flex max-w-[1700px] items-center justify-between px-6 py-3.5 sm:px-8"
        >
          {/* Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
              <Orbit className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              Lunar Mission Planner
            </span>
          </Link>

          {/* Return to Workspace Action */}
          <div className="flex items-center gap-3">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Workspace</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content Area: Intentionally Empty with Heading */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          3D Simulation
        </h1>
      </main>
    </div>
  );
}

