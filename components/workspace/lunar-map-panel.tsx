"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  Compass,
  Plus,
  Minus,
  Crosshair,
  Layers,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
  Box,
} from "lucide-react";
import {
  LROC_LAYERS,
  buildLrocWmsUrl,
  type LrocLayerDefinition,
} from "@/lib/services/lunar-map/lroc-map-config";
import { formatCoordinateCallout } from "@/lib/coordinates/coordinate-format";
import type { LunarCoordinates } from "@/lib/coordinates/lunar-coordinate-types";
import type { TerrainFeature } from "@/lib/services/terrain/terrain-types";

export interface LunarMapPanelProps {
  latitude: number;
  longitude: number;
  rawLatitude?: string;
  rawLongitude?: string;
  destLatitude?: number;
  destLongitude?: number;
  terrainFeatures?: TerrainFeature[];
}

export function LunarMapPanel({
  latitude,
  longitude,
  rawLatitude,
  rawLongitude,
  destLatitude,
  destLongitude,
  terrainFeatures = [],
}: LunarMapPanelProps) {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedLayerId, setSelectedLayerId] = useState<string>("lroc-wac-global");
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  const activeLayer: LrocLayerDefinition =
    LROC_LAYERS.find((l) => l.id === selectedLayerId) || LROC_LAYERS[0];

  // Recenter when latitude/longitude coordinates change from the mission form
  const [prevTarget, setPrevTarget] = useState({
    latitude,
    longitude,
    selectedLayerId,
    retryNonce,
  });

  if (
    prevTarget.latitude !== latitude ||
    prevTarget.longitude !== longitude ||
    prevTarget.selectedLayerId !== selectedLayerId ||
    prevTarget.retryNonce !== retryNonce
  ) {
    setPrevTarget({ latitude, longitude, selectedLayerId, retryNonce });
    setPanOffset({ x: 0, y: 0 });
    setImageLoading(true);
    setImageError(false);
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.5, 4.0));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.5, 0.5));
  };

  const handleRecenter = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Geographic calculations for BBOX based on user coordinates and zoom
  // Span in degrees shrinks as zoom increases
  const spanDeg = Math.max(2, 25 / zoom);
  const minLon = Math.max(-180, Number((longitude - spanDeg * 1.3).toFixed(4)));
  const maxLon = Math.min(180, Number((longitude + spanDeg * 1.3).toFixed(4)));
  const minLat = Math.max(-90, Number((latitude - spanDeg).toFixed(4)));
  const maxLat = Math.min(90, Number((latitude + spanDeg).toFixed(4)));

  const currentWmsUrl = buildLrocWmsUrl({
    layer: activeLayer.wmsLayer,
    minLon,
    minLat,
    maxLon,
    maxLat,
    width: 900,
    height: 650,
  });

  // Calculate ground scale representation (1 deg latitude on the Moon ≈ 30.33 km)
  // Scale bar width = 64px across container width (~600px)
  const visibleGroundKm = spanDeg * 2 * 30.33;
  const currentScaleKm = Math.max(1, Math.round(visibleGroundKm * (64 / 600)));

  const coordsObject: LunarCoordinates = {
    latitudeDeg: latitude,
    longitudeDeg: longitude,
    rawLatitude: rawLatitude ?? latitude.toString(),
    rawLongitude: rawLongitude ?? longitude.toString(),
  };

  const callout = formatCoordinateCallout(coordsObject, 2);

  return (
    <section
      aria-labelledby="lunar-map-heading"
      className="flex flex-col h-full rounded-2xl border border-sky-500/20 bg-[#0c1524]/85 shadow-2xl backdrop-blur-md overflow-hidden text-white"
    >
      {/* Map Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <h2 id="lunar-map-heading" className="text-sm font-bold tracking-tight text-white">
              Lunar Map
            </h2>
            <p className="text-[11px] text-slate-400">
              Explore terrain, imagery and elevation
            </p>
          </div>
        </div>

        {/* Layer Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/15 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-white/10 transition-colors"
          >
            <Layers className="h-3.5 w-3.5 text-sky-400" />
            <span>{activeLayer.name}</span>
            <ChevronDown className="h-3 w-3 text-slate-400" />
          </button>

          {isLayerMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border border-white/15 bg-[#0c1524] p-1.5 shadow-2xl z-20">
              {LROC_LAYERS.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => {
                    setSelectedLayerId(layer.id);
                    setIsLayerMenuOpen(false);
                  }}
                  className={`flex flex-col w-full px-3 py-2 text-left rounded-lg transition-colors ${
                    selectedLayerId === layer.id
                      ? "bg-sky-500/20 text-sky-300 font-semibold"
                      : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-xs">{layer.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {layer.resolution} • {layer.attribution}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Map Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full overflow-hidden cursor-grab active:cursor-grabbing select-none bg-[#050a12]"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Real LROC Map Image Container */}
        <div
          className="absolute inset-0 transition-transform duration-75 ease-out"
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
            transformOrigin: "center center",
          }}
        >
          {/* Real LROC WMS Layer Rendered from Provider */}
          {!imageError ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={currentWmsUrl}
              alt={`Real Lunar Surface Imagery (${activeLayer.name}) centered at ${latitude}°, ${longitude}°`}
              className={`h-full w-full object-cover select-none transition-opacity duration-300 ${
                imageLoading ? "opacity-30" : "opacity-95"
              }`}
              onLoad={() => setImageLoading(false)}
              onError={() => {
                setImageLoading(false);
                setImageError(true);
              }}
              draggable={false}
            />
          ) : (
            /* Explicit Provider Error State (never substitute fake map tiles!) */
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#080d18] p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  LROC Map Service Unavailable
                </p>
                <p className="max-w-xs text-xs text-slate-400">
                  Could not reach the official LROC WMS endpoint for layer &quot;{activeLayer.wmsLayer}&quot;.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setImageLoading(true);
                  setImageError(false);
                  setRetryNonce((n) => n + 1);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-sky-500/40 bg-sky-500/20 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/30 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Coordinate Grid Overlay */}
          <svg className="absolute inset-0 h-full w-full pointer-events-none opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
                <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(56, 189, 248, 0.4)" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Geographically Anchored Red Selection Target Box & Callout */}
          <div
            className="absolute pointer-events-none"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Red Selection Box */}
            <div className="relative h-14 w-14 rounded-sm border-2 border-red-500 bg-red-500/15 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              {/* Center Crosshair */}
              <div className="absolute inset-0 flex items-center justify-center text-red-500">
                <span className="font-mono text-sm font-bold leading-none">+</span>
              </div>

              {/* Leader Line to Callout */}
              <div
                className="absolute right-0 top-0 h-6 w-8 border-t-2 border-r-2 border-red-500/80 pointer-events-none"
                style={{
                  transform: "translate(100%, -100%)",
                }}
              />

              {/* Red Coordinate Callout Box */}
              <div
                className="absolute left-full bottom-full mb-1 ml-6 min-w-[110px] rounded border border-red-500/80 bg-red-950/90 px-2.5 py-1 text-[11px] font-mono text-white shadow-xl backdrop-blur-sm"
              >
                <div className="text-red-200">
                  {callout.latText}
                </div>
                <div className="text-red-200">
                  {callout.lonText}
                </div>
              </div>
            </div>

            {/* Phase 11: Route Corridor & Hazard Markers Overlay */}
            {destLatitude !== undefined &&
              destLongitude !== undefined &&
              Number.isFinite(destLatitude) &&
              Number.isFinite(destLongitude) &&
              (destLatitude !== latitude || destLongitude !== longitude) && (
                (() => {
                  const dLat = destLatitude - latitude;
                  const dLon = destLongitude - longitude;
                  const destX = Math.max(-140, Math.min(140, dLon * 300));
                  const destY = Math.max(-140, Math.min(140, -dLat * 300));

                  return (
                    <div className="absolute inset-0 pointer-events-auto">
                      {/* Route Line SVG */}
                      <svg
                        className="absolute overflow-visible pointer-events-none"
                        style={{
                          left: "28px",
                          top: "28px",
                          width: "1px",
                          height: "1px",
                        }}
                      >
                        <line
                          x1="0"
                          y1="0"
                          x2={destX}
                          y2={destY}
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                          strokeDasharray="5 4"
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Destination Pin */}
                      <div
                        className="absolute flex items-center gap-1.5"
                        style={{
                          left: `${28 + destX}px`,
                          top: `${28 + destY}px`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <div className="h-4 w-4 rounded-full border-2 border-sky-400 bg-sky-500/40 shadow-[0_0_10px_#38bdf8] flex items-center justify-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                        <div className="whitespace-nowrap rounded border border-sky-400/80 bg-[#071321]/90 px-1.5 py-0.5 text-[9px] font-mono text-sky-200 shadow-md">
                          Dest: {destLatitude.toFixed(2)}°, {destLongitude.toFixed(2)}°
                        </div>
                      </div>

                      {/* Corridor Hazard Markers */}
                      {terrainFeatures
                        .filter((f) => f.intersectsRouteCorridor)
                        .slice(0, 3)
                        .map((feat, idx) => {
                          const midX = destX * (0.3 + idx * 0.25);
                          const midY = destY * (0.3 + idx * 0.25);

                          return (
                            <div
                              key={feat.id}
                              className="group absolute"
                              style={{
                                left: `${28 + midX}px`,
                                top: `${28 + midY}px`,
                                transform: "translate(-50%, -50%)",
                              }}
                            >
                              <div className="flex h-5 w-5 items-center justify-center rounded-full border border-amber-400 bg-amber-500/30 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                                <span className="text-[10px] font-bold leading-none">!</span>
                              </div>
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded border border-amber-400/80 bg-black/90 px-2 py-1 text-[9px] font-mono text-amber-200 shadow-xl">
                                {feat.name || feat.type}:{" "}
                                {feat.diameterMeters
                                  ? `${(feat.diameterMeters / 1000).toFixed(1)}km`
                                  : "Obstacle"}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })()
              )}
          </div>
        </div>

        {/* Loading Overlay */}
        {imageLoading && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none z-10">
            <div className="flex items-center gap-2 rounded-lg bg-[#0c1524]/90 px-3.5 py-2 border border-sky-500/30 text-xs font-mono text-sky-300">
              <span className="h-2 w-2 rounded-full bg-sky-400 animate-ping" />
              <span>Fetching LROC surface imagery...</span>
            </div>
          </div>
        )}

        {/* Map Control Buttons (Floating Top-Right) */}
        <div className="absolute right-4 top-4 flex flex-col gap-1.5 z-10">
          <button
            type="button"
            onClick={handleZoomIn}
            aria-label="Zoom in"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0c1524]/90 border border-white/20 text-white shadow-lg hover:bg-sky-500/20 hover:border-sky-400 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            aria-label="Zoom out"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0c1524]/90 border border-white/20 text-white shadow-lg hover:bg-sky-500/20 hover:border-sky-400 transition-colors"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRecenter}
            aria-label="Recenter on coordinates"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0c1524]/90 border border-white/20 text-white shadow-lg hover:bg-sky-500/20 hover:border-sky-400 transition-colors"
          >
            <Crosshair className="h-4 w-4 text-sky-400" />
          </button>
        </div>

        {/* Dynamic Scale Bar (Floating Bottom-Left) */}
        <div className="absolute left-4 bottom-8 z-10 flex flex-col items-start gap-1 rounded bg-[#0c1524]/85 px-2.5 py-1 border border-white/10 text-[10px] font-mono text-slate-300 backdrop-blur-sm">
          <span>Scale: 0 — {currentScaleKm} km</span>
          <div className="h-1 w-16 bg-white/30 border-l-2 border-r-2 border-white" />
        </div>

        {/* LROC Source Attribution (Floating Bottom-Left below scale bar) */}
        <div className="absolute left-4 bottom-2 z-10 text-[9px] font-sans text-slate-400 pointer-events-none">
          {activeLayer.attribution}
        </div>

        {/* Bottom-Right Controls: Coordinate Status & 3D Simulation Entry Button */}
        <div className="absolute right-4 bottom-4 z-10 flex flex-col sm:flex-row items-end sm:items-center gap-2">
          {/* Coordinate Status Indicator */}
          <div className="flex items-center gap-1.5 rounded-lg bg-[#0c1524]/90 px-3 py-1.5 border border-sky-400/30 text-xs font-mono text-sky-300 shadow-lg backdrop-blur-sm">
            <Crosshair className="h-3.5 w-3.5 text-sky-400" />
            <span>Selected: {latitude.toFixed(2)}°, {longitude.toFixed(2)}°</span>
          </div>

          {/* Phase 12: 3D Simulation Entry Button */}
          <Link
            href="/3d-simulation"
            aria-label="Navigate to 3D Simulation"
            className="flex items-center gap-1.5 rounded-lg bg-[#0c1524]/90 px-3 py-1.5 border border-sky-400/40 text-xs font-semibold text-white shadow-lg backdrop-blur-sm transition-all duration-150 hover:bg-sky-500/25 hover:border-sky-300 hover:text-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 active:scale-95"
          >
            <Box className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
            <span>3D Simulation</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
