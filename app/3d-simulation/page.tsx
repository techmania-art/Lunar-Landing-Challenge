import type { Metadata } from "next";
import { LunarSimulationPage } from "@/components/simulation/lunar-simulation-page";

export const metadata: Metadata = {
  title: "3D Simulation | Lunar Mission Planner",
  description: "3D lunar globe visualization for the Lunar Mission Planner.",
};

export default function SimulationPage() {
  return <LunarSimulationPage />;
}

