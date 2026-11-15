import type { Metadata } from "next";
import { MissionOperationalResultsView } from "@/components/mission-results/mission-operational-results-view";

export const metadata: Metadata = {
  title: "Mission Operational Results | Lunar Mission Planner",
  description:
    "Dedicated executive assessment for lunar rover power situation and terrain & communication situation.",
};

export default function MissionResultsPage() {
  return <MissionOperationalResultsView />;
}

