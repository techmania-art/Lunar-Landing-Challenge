import { redirect } from "next/navigation";

/**
 * Phase 6: The standalone Analysis page has been merged into the integrated
 * three-panel workspace at /workspace.
 *
 * Direct requests to /analysis are redirected to /workspace.
 */
export default function AnalysisPage() {
  redirect("/workspace");
}
