import React from "react";
import Link from "next/link";
import { Orbit, ArrowLeft, Activity, Radio, Shield } from "lucide-react";
import { AnalysisBackground } from "@/components/analysis/analysis-background";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AnalysisPage() {
  return (
    <div className="relative flex min-h-[100svh] w-full flex-col overflow-x-hidden text-white font-sans">
      {/* 1. Looping MP4 Video Background with Fallback */}
      <AnalysisBackground />

      {/* 2. Top Navigation */}
      <header className="relative z-10 w-full border-b border-white/10 bg-[#071321]/40 backdrop-blur-md">
        <nav
          aria-label="Analysis Navigation"
          className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 sm:px-8 lg:px-12"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/20">
              <Orbit className="h-5 w-5" aria-hidden="true" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white sm:text-lg">
              Lunar Mission Planner
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 hover:bg-white/20 transition-colors sm:text-sm"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Input</span>
            </Link>
          </div>
        </nav>
      </header>

      {/* 3. Analysis Shell Content */}
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 py-10 sm:px-8 lg:px-12">
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-3.5 py-1.5 text-xs font-semibold tracking-wider text-sky-300 backdrop-blur-md">
            <Activity className="h-3.5 w-3.5 text-sky-400" />
            <span>ANALYSIS WORKSPACE SHELL</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl text-white">
            Mission Analysis Workspace
          </h1>

          <p className="text-base text-white/80 sm:text-lg leading-relaxed">
            Decorative looping video background initialized for the analysis view. Scientific calculations and live lunar terrain integrations remain unselected and pending subsequent phases.
          </p>

          <Card className="bg-[#111114]/80 border-white/10 text-white shadow-2xl backdrop-blur-md">
            <CardHeader>
              <div className="flex items-center gap-2 text-sky-400">
                <Radio className="h-5 w-5" />
                <CardTitle className="text-base text-white">
                  Telemetry & Surface Status
                </CardTitle>
              </div>
              <CardDescription className="text-white/60">
                Phase 3 video background demonstration shell.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-xs text-white/70">
                <span>Background Video Mode</span>
                <span className="font-mono text-emerald-400">Looping MP4 (HTML5)</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-3 text-xs text-white/70">
                <span>Reduced Motion Fallback</span>
                <span className="font-mono text-sky-300">Supported (Static Image)</span>
              </div>
              <div className="flex items-center gap-2 pt-2 text-xs text-white/60">
                <Shield className="h-4 w-4 text-amber-400 shrink-0" />
                <span>No mock scientific results or fabricated ephemeris values are rendered in this view.</span>
              </div>
            </CardContent>
          </Card>

          <div>
            <Link href="/">
              <Button className="bg-sky-500 hover:bg-sky-600 text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Mission Configuration
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

