"use client";

import React, { useState, useRef } from "react";
import {
  Compass,
  Plus,
  Minus,
  Crosshair,
  Layers,
  ChevronDown,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import {
  LROC_LAYERS,
  buildLrocWmsUrl,
  type LrocLayerDefinition,
} from "@/lib/services/lunar-map/lroc-map-config";
import { formatCoordinateCallout } from "@/lib/coordinates/coordinate-format";
import type { LunarCoordinates } from "@/lib/coordinates/lunar-coordinate-types";

export interface LunarMapPanelProps {
  latitude: number;
  longitude: number;
  rawLatitude?: string;
  rawLongitude?: string;
}

export function LunarMapPanel({
  latitude,
  longitude,
  rawLatitude,
  rawLongitude,
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

        {/* Coordinate Status Indicator (Floating Bottom-Right) */}
        <div className="absolute right-4 bottom-4 z-10 flex items-center gap-1.5 rounded-lg bg-[#0c1524]/90 px-3 py-1.5 border border-sky-400/30 text-xs font-mono text-sky-300 shadow-lg backdrop-blur-sm">
          <Crosshair className="h-3.5 w-3.5 text-sky-400" />
          <span>Selected: {latitude.toFixed(2)}°, {longitude.toFixed(2)}°</span>
        </div>
      </div>
    </section>
  );
}
