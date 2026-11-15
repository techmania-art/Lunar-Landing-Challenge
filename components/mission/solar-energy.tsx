"use client";

import React, { useState } from "react";
import { ChevronDown, Compass, Radio } from "lucide-react";
import { SolarLightning } from "./solar-lightning";
import type { SolarPanelOrientationKind } from "@/lib/services/solar/solar-types";
import type {
  RadioConfig,
  RelayConfig,
} from "@/lib/services/communication/communication-types";

export interface SolarFormValues {
  panelArea?: string;
  panelEfficiency?: string;
  panelOrientation?: SolarPanelOrientationKind;
  analysisDurationHours?: string;

  // Phase 10: Rover & Traverse Configuration
  roverPreset?: "generic-reference" | "custom";
  batteryCapacityWh?: string;
  maxDodPercent?: string;
  initialSocPercent?: string;
  drivePowerW?: string;
  idlePowerW?: string;
  driveSpeedKmH?: string;
  safetyReservePercent?: string;
  destLatitude?: string;
  destLongitude?: string;

  // Phase 28: Communication Link & Radio Configuration
  radioPreset?: "not-configured" | "s-band-direct" | "custom";
  transmitPowerW?: string;
  carrierFrequencyGhz?: string;
  roverAntennaGainDbi?: string;
  groundStationGainDbi?: string;
  receiverSensitivityDbm?: string;
  requiredMarginDb?: string;
  relayPreset?: "none" | "lunar-gateway-halo" | "custom";
}

/**
 * Extracts a typed RadioConfig from form values.
 */
export function extractRadioConfig(values?: SolarFormValues): RadioConfig {
  if (!values || !values.radioPreset || values.radioPreset === "not-configured") {
    return { isConfigured: false, preset: "not-configured" };
  }
  const transmitPowerW = values.transmitPowerW ? Number(values.transmitPowerW) : undefined;
  const carrierFrequencyGhz = values.carrierFrequencyGhz
    ? Number(values.carrierFrequencyGhz)
    : undefined;
  const roverAntennaGainDbi = values.roverAntennaGainDbi
    ? Number(values.roverAntennaGainDbi)
    : undefined;
  const groundStationGainDbi = values.groundStationGainDbi
    ? Number(values.groundStationGainDbi)
    : undefined;
  const receiverSensitivityDbm = values.receiverSensitivityDbm
    ? Number(values.receiverSensitivityDbm)
    : undefined;
  const requiredMarginDb = values.requiredMarginDb ? Number(values.requiredMarginDb) : undefined;

  return {
    isConfigured: true,
    preset: values.radioPreset,
    transmitPowerW,
    carrierFrequencyGhz,
    roverAntennaGainDbi,
    groundStationGainDbi,
    receiverSensitivityDbm,
    requiredMarginDb,
  };
}

/**
 * Extracts a typed RelayConfig from form values.
 */
export function extractRelayConfig(values?: SolarFormValues): RelayConfig {
  if (!values || !values.relayPreset || values.relayPreset === "none") {
    return { isConfigured: false, preset: "none" };
  }
  return {
    isConfigured: true,
    preset: values.relayPreset,
    relayName: "Lunar Communications Relay Satellite (Halo Orbit)",
    roverToRelayMarginDb: 6.5,
    relayToEarthMarginDb: 12.0,
  };
}

export interface SolarEnergyProps {
  values: SolarFormValues;
  onChange: (field: keyof SolarFormValues, value: string) => void;
  errors?: Partial<Record<keyof SolarFormValues, string>>;
}

export function SolarEnergyPin() {
  return (
    <span
      className="solar-pin flex-shrink-0 grid place-items-center rounded-[10px] select-none"
      aria-hidden="true"
      style={{
        width: "36px",
        height: "36px",
        border: "1px solid #36eaff",
        background: "linear-gradient(145deg, #103849, #071b29)",
        boxShadow:
          "0 0 9px rgba(0, 220, 255, 0.62), 0 0 21px rgba(0, 200, 255, 0.44), 0 0 34px rgba(0, 200, 255, 0.21), inset 0 0 12px rgba(0, 220, 255, 0.22)",
      }}
    >
      <svg
        viewBox="0 0 24 24"
        focusable="false"
        style={{
          width: "23px",
          height: "25px",
          fill: "#65f3ff",
          stroke: "#e0fdff",
          strokeWidth: 1,
          strokeLinejoin: "round",
          filter:
            "drop-shadow(0 0 4px #00dfff) drop-shadow(0 0 8px #00cfff) drop-shadow(0 0 12px rgba(0, 210, 255, 0.8))",
        }}
      >
        <path d="M13.2 2.8 5.8 13h5.1l-.7 8.2L18.5 10h-5.2l-.1-7.2Z" />
      </svg>
    </span>
  );
}

export function SolarEnergy({ values, onChange, errors = {} }: SolarEnergyProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-xl border border-sky-500/25 bg-[#091220]/90 shadow-md backdrop-blur-sm transition-all duration-200">
      {/* Decorative Cyan Lightning Effect (Native Canvas) */}
      <SolarLightning />

      {/* Accordion Header Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="solar-energy-panel"
        className="relative z-10 flex w-full items-center justify-between px-3.5 py-3 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50"
      >
        <div className="flex items-center gap-2.5">
          <SolarEnergyPin />
          <div>
            <span className="block text-xs font-semibold text-white">Solar Energy</span>
            <span className="block text-[10px] text-slate-400">
              Configure rover solar panels and duration (optional)
            </span>
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-sky-400" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Accordion Body */}
      {isOpen && (
        <div
          id="solar-energy-panel"
          className="relative z-10 space-y-3 border-t border-white/10 px-3.5 pb-3.5 pt-3"
        >
          {/* Row 1: Panel Area & Panel Efficiency */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label
                htmlFor="solar-panel-area"
                className="block text-[10px] font-medium text-slate-300"
              >
                Panel Area (m²)
              </label>
              <input
                id="solar-panel-area"
                type="number"
                step="0.05"
                min="0.01"
                placeholder="e.g. 1.20"
                value={values.panelArea ?? ""}
                onChange={(e) => onChange("panelArea", e.target.value)}
                className={`mt-1 block w-full rounded-lg border bg-[#060b13]/80 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${
                  errors.panelArea
                    ? "border-red-500/50 focus:ring-red-400"
                    : "border-white/15 focus:border-sky-400 focus:ring-sky-400/30"
                }`}
              />
              {errors.panelArea && (
                <span className="mt-0.5 block text-[9px] text-red-400">{errors.panelArea}</span>
              )}
            </div>

            <div>
              <label
                htmlFor="solar-panel-efficiency"
                className="block text-[10px] font-medium text-slate-300"
              >
                Efficiency (%)
              </label>
              <input
                id="solar-panel-efficiency"
                type="number"
                step="0.5"
                min="1"
                max="100"
                placeholder="e.g. 28.5"
                value={values.panelEfficiency ?? ""}
                onChange={(e) => onChange("panelEfficiency", e.target.value)}
                className={`mt-1 block w-full rounded-lg border bg-[#060b13]/80 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${
                  errors.panelEfficiency
                    ? "border-red-500/50 focus:ring-red-400"
                    : "border-white/15 focus:border-sky-400 focus:ring-sky-400/30"
                }`}
              />
              {errors.panelEfficiency && (
                <span className="mt-0.5 block text-[9px] text-red-400">
                  {errors.panelEfficiency}
                </span>
              )}
            </div>
          </div>

          {/* Row 2: Panel Orientation */}
          <div>
            <label
              htmlFor="solar-panel-orientation"
              className="block text-[10px] font-medium text-slate-300"
            >
              Panel Orientation
            </label>
            <select
              id="solar-panel-orientation"
              value={values.panelOrientation ?? "horizontal"}
              onChange={(e) =>
                onChange("panelOrientation", e.target.value as SolarPanelOrientationKind)
              }
              className="mt-1 block w-full rounded-lg border border-white/15 bg-[#060b13]/90 px-2.5 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/30"
            >
              <option value="horizontal">Horizontal Fixed (Zenith Normal)</option>
              <option value="sun-tracking">Active Sun-Tracking (Direct Normal)</option>
            </select>
          </div>

          {/* Row 3: Analysis Duration */}
          <div>
            <label
              htmlFor="solar-analysis-duration"
              className="block text-[10px] font-medium text-slate-300"
            >
              Analysis Duration (Hours)
            </label>
            <input
              id="solar-analysis-duration"
              type="number"
              step="0.5"
              min="0.1"
              placeholder="e.g. 4.0"
              value={values.analysisDurationHours ?? ""}
              onChange={(e) => onChange("analysisDurationHours", e.target.value)}
              className="mt-1 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/30"
            />
          </div>

          {/* Phase 10: Rover Configuration & Traverse Feasibility Section */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sky-400">
                <Compass className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="text-[11px] font-semibold text-white tracking-wide">
                  Rover Configuration & Traverse
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                Optional
              </span>
            </div>

            {/* Preset Selector */}
            <div>
              <label htmlFor="rover-preset" className="block text-[10px] font-medium text-slate-300">
                Rover Preset
              </label>
              <div className="mt-1">
                <select
                  id="rover-preset"
                  value={values.roverPreset ?? "custom"}
                  onChange={(e) => {
                    const val = e.target.value as "generic-reference" | "custom";
                    onChange("roverPreset", val);
                    if (val === "generic-reference") {
                      onChange("batteryCapacityWh", "600");
                      onChange("maxDodPercent", "80");
                      onChange("initialSocPercent", "100");
                      onChange("drivePowerW", "75");
                      onChange("idlePowerW", "20");
                      onChange("driveSpeedKmH", "0.5");
                      onChange("safetyReservePercent", "15");
                    }
                  }}
                  className="block w-full rounded-lg border border-white/15 bg-[#060b13]/90 px-2.5 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/30"
                >
                  <option value="custom">Custom / Manual Entry</option>
                  <option value="generic-reference">
                    Generic Lunar Rover (Hypothetical Reference)
                  </option>
                </select>
              </div>
              <p className="mt-1 text-[9px] text-slate-400/80">
                * Hypothetical modeling baseline; not an official NASA/ISRO certified specification.
              </p>
            </div>

            {/* Energy Storage Fields */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-medium text-sky-300/90">
                Energy Storage (Battery)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label htmlFor="rover-battery-capacity" className="block text-[9px] text-slate-400">
                    Capacity (Wh)
                  </label>
                  <input
                    id="rover-battery-capacity"
                    type="number"
                    step="50"
                    min="10"
                    placeholder="e.g. 600"
                    value={values.batteryCapacityWh ?? ""}
                    onChange={(e) => onChange("batteryCapacityWh", e.target.value)}
                    className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                  />
                </div>
                <div>
                  <label htmlFor="rover-max-dod" className="block text-[9px] text-slate-400">
                    Max DoD (%)
                  </label>
                  <input
                    id="rover-max-dod"
                    type="number"
                    step="5"
                    min="10"
                    max="100"
                    placeholder="e.g. 80"
                    value={values.maxDodPercent ?? ""}
                    onChange={(e) => onChange("maxDodPercent", e.target.value)}
                    className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                  />
                </div>
                <div>
                  <label htmlFor="rover-initial-soc" className="block text-[9px] text-slate-400">
                    Initial SOC (%)
                  </label>
                  <input
                    id="rover-initial-soc"
                    type="number"
                    step="5"
                    min="1"
                    max="100"
                    placeholder="e.g. 100"
                    value={values.initialSocPercent ?? ""}
                    onChange={(e) => onChange("initialSocPercent", e.target.value)}
                    className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                  />
                </div>
              </div>
            </div>

            {/* Rover Consumption Fields */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-medium text-sky-300/90">
                Rover Consumption & Speed
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="rover-drive-power" className="block text-[9px] text-slate-400">
                    Drive Power (W)
                  </label>
                  <input
                    id="rover-drive-power"
                    type="number"
                    step="5"
                    min="5"
                    placeholder="e.g. 75"
                    value={values.drivePowerW ?? ""}
                    onChange={(e) => onChange("drivePowerW", e.target.value)}
                    className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                  />
                </div>
                <div>
                  <label htmlFor="rover-idle-power" className="block text-[9px] text-slate-400">
                    Idle Power (W)
                  </label>
                  <input
                    id="rover-idle-power"
                    type="number"
                    step="5"
                    min="0"
                    placeholder="e.g. 20"
                    value={values.idlePowerW ?? ""}
                    onChange={(e) => onChange("idlePowerW", e.target.value)}
                    className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                  />
                </div>
                <div>
                  <label htmlFor="rover-drive-speed" className="block text-[9px] text-slate-400">
                    Speed (km/h)
                  </label>
                  <input
                    id="rover-drive-speed"
                    type="number"
                    step="0.1"
                    min="0.05"
                    placeholder="e.g. 0.5"
                    value={values.driveSpeedKmH ?? ""}
                    onChange={(e) => onChange("driveSpeedKmH", e.target.value)}
                    className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                  />
                </div>
                <div>
                  <label htmlFor="rover-safety-reserve" className="block text-[9px] text-slate-400">
                    Safety Reserve (%)
                  </label>
                  <input
                    id="rover-safety-reserve"
                    type="number"
                    step="5"
                    min="0"
                    max="100"
                    placeholder="e.g. 15"
                    value={values.safetyReservePercent ?? ""}
                    onChange={(e) => onChange("safetyReservePercent", e.target.value)}
                    className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                  />
                </div>
              </div>
            </div>

            {/* Traverse Destination Target */}
            <div className="space-y-1.5">
              <span className="block text-[10px] font-medium text-sky-300/90">
                Traverse Destination Target
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="rover-dest-latitude" className="block text-[9px] text-slate-400">
                    Dest Latitude (°)
                  </label>
                  <input
                    id="rover-dest-latitude"
                    type="number"
                    step="0.01"
                    placeholder="e.g. -89.47"
                    value={values.destLatitude ?? ""}
                    onChange={(e) => onChange("destLatitude", e.target.value)}
                    className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                  />
                </div>
                <div>
                  <label htmlFor="rover-dest-longitude" className="block text-[9px] text-slate-400">
                    Dest Longitude (°)
                  </label>
                  <input
                    id="rover-dest-longitude"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 0.00"
                    value={values.destLongitude ?? ""}
                    onChange={(e) => onChange("destLongitude", e.target.value)}
                    className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                  />
                </div>
              </div>
            </div>

            {/* Phase 28: Communication & Radio Link Configuration */}
            <div className="pt-3 border-t border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <Radio className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="text-[11px] font-semibold text-white tracking-wide">
                    Communication & Radio Link
                  </span>
                </div>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 bg-white/5 px-2 py-0.5 rounded-full border border-white/10">
                  Optional
                </span>
              </div>

              {/* Radio Preset Selector */}
              <div>
                <label htmlFor="comm-radio-preset" className="block text-[10px] font-medium text-slate-300">
                  Radio Subsystem Preset
                </label>
                <div className="mt-1">
                  <select
                    id="comm-radio-preset"
                    value={values.radioPreset ?? "not-configured"}
                    onChange={(e) => {
                      const val = e.target.value as "not-configured" | "s-band-direct" | "custom";
                      onChange("radioPreset", val);
                      if (val === "s-band-direct") {
                        onChange("transmitPowerW", "5");
                        onChange("carrierFrequencyGhz", "2.2");
                        onChange("roverAntennaGainDbi", "6");
                        onChange("groundStationGainDbi", "45");
                        onChange("receiverSensitivityDbm", "-130");
                        onChange("requiredMarginDb", "3.0");
                        onChange("relayPreset", "none");
                      } else if (val === "not-configured") {
                        onChange("transmitPowerW", "");
                        onChange("carrierFrequencyGhz", "");
                        onChange("roverAntennaGainDbi", "");
                        onChange("groundStationGainDbi", "");
                        onChange("receiverSensitivityDbm", "");
                        onChange("requiredMarginDb", "");
                        onChange("relayPreset", "none");
                      }
                    }}
                    className="block w-full rounded-lg border border-white/15 bg-[#060b13]/90 px-2.5 py-1.5 text-xs text-white focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/30"
                  >
                    <option value="not-configured">Not Configured (No Radio Hardware)</option>
                    <option value="s-band-direct">
                      Direct-to-Earth S-Band Transceiver (5W, 2.2 GHz, DSN 34m)
                    </option>
                    <option value="custom">Custom / Manual RF Link Entry</option>
                  </select>
                </div>
                <p className="mt-1 text-[9px] text-slate-400/80">
                  * Evaluates Friis transmission link-budget and Free-Space Path Loss (FSPL) against Earth ground station.
                </p>
              </div>

              {/* Editable Fields when Radio is Configured */}
              {(values.radioPreset === "s-band-direct" || values.radioPreset === "custom") && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label htmlFor="comm-tx-power" className="block text-[9px] text-slate-400">
                        Tx Power (W)
                      </label>
                      <input
                        id="comm-tx-power"
                        type="number"
                        step="0.5"
                        min="0.1"
                        placeholder="e.g. 5.0"
                        value={values.transmitPowerW ?? ""}
                        onChange={(e) => onChange("transmitPowerW", e.target.value)}
                        className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="comm-freq" className="block text-[9px] text-slate-400">
                        Freq (GHz)
                      </label>
                      <input
                        id="comm-freq"
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="e.g. 2.2"
                        value={values.carrierFrequencyGhz ?? ""}
                        onChange={(e) => onChange("carrierFrequencyGhz", e.target.value)}
                        className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="comm-ant-gain" className="block text-[9px] text-slate-400">
                        Tx Ant (dBi)
                      </label>
                      <input
                        id="comm-ant-gain"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 6.0"
                        value={values.roverAntennaGainDbi ?? ""}
                        onChange={(e) => onChange("roverAntennaGainDbi", e.target.value)}
                        className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label htmlFor="comm-rx-gain" className="block text-[9px] text-slate-400">
                        Rx Ant (dBi)
                      </label>
                      <input
                        id="comm-rx-gain"
                        type="number"
                        step="1"
                        placeholder="e.g. 45"
                        value={values.groundStationGainDbi ?? ""}
                        onChange={(e) => onChange("groundStationGainDbi", e.target.value)}
                        className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="comm-rx-sens" className="block text-[9px] text-slate-400">
                        Sens (dBm)
                      </label>
                      <input
                        id="comm-rx-sens"
                        type="number"
                        step="1"
                        placeholder="e.g. -130"
                        value={values.receiverSensitivityDbm ?? ""}
                        onChange={(e) => onChange("receiverSensitivityDbm", e.target.value)}
                        className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                      />
                    </div>
                    <div>
                      <label htmlFor="comm-req-margin" className="block text-[9px] text-slate-400">
                        Req Margin (dB)
                      </label>
                      <input
                        id="comm-req-margin"
                        type="number"
                        step="0.5"
                        placeholder="e.g. 3.0"
                        value={values.requiredMarginDb ?? ""}
                        onChange={(e) => onChange("requiredMarginDb", e.target.value)}
                        className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/80 px-2 py-1 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none focus:ring-1"
                      />
                    </div>
                  </div>

                  {/* Relay Option */}
                  <div>
                    <label htmlFor="comm-relay-preset" className="block text-[9px] text-slate-400">
                      Relay Configuration
                    </label>
                    <select
                      id="comm-relay-preset"
                      value={values.relayPreset ?? "none"}
                      onChange={(e) => onChange("relayPreset", e.target.value)}
                      className="mt-0.5 block w-full rounded-lg border border-white/15 bg-[#060b13]/90 px-2 py-1 text-xs text-white focus:border-sky-400 focus:outline-none focus:ring-1"
                    >
                      <option value="none">No Relay Configured (Direct Path Only)</option>
                      <option value="lunar-gateway-halo">
                        Lunar Communications Relay Satellite (Halo Orbit Gateway)
                      </option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <p className="text-[10px] text-slate-400/90 leading-tight">
            * Optional: When left blank, illumination analysis runs without estimating electrical output.
          </p>
        </div>
      )}
    </div>
  );
}
