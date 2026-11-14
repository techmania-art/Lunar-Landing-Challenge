import React, { Suspense } from "react";
import { MissionWorkspace } from "@/components/workspace/mission-workspace";

function WorkspaceContent() {
  return <MissionWorkspace />;
}

export default function WorkspacePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#071321] text-white p-8">Loading Lunar Workspace...</div>}>
      <WorkspaceContent />
    </Suspense>
  );
}

