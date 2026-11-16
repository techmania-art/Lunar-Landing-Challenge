"use client";

import { useEffect, useState } from "react";

import { CesiumLoader } from "./cesium-loader";

const assetCandidates = [
  "/cesium/Assets/Textures/moonSmall.jpg",
  "/cesium/Assets/Textures/waterNormals.jpg",
  "/cesium/Assets/Images/cesium_credit.png",
];

export function CesiumSetupVerification() {
  const [assetStatus, setAssetStatus] = useState<"checking" | "pass" | "fail">("checking");
  const [assetMessage, setAssetMessage] = useState("Checking static asset availability...");

  useEffect(() => {
    let isMounted = true;

    async function verifyAsset() {
      for (const assetUrl of assetCandidates) {
        try {
          const response = await fetch(assetUrl, { cache: "no-store" });

          if (response.ok) {
            if (isMounted) {
              setAssetStatus("pass");
              setAssetMessage(`Static asset available: ${assetUrl} (${response.status})`);
            }
            return;
          }
        } catch (error) {
          console.error(`Asset fetch failed for ${assetUrl}`, error);
        }
      }

      if (isMounted) {
        setAssetStatus("fail");
        setAssetMessage(
          "No expected Cesium asset responded successfully under /cesium/Assets/.",
        );
      }
    }

    void verifyAsset();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <CesiumLoader>
      {(cesium, error) => {
        const hasRequiredExports =
          !!cesium &&
          !!cesium.Viewer &&
          !!cesium.Ellipsoid &&
          !!cesium.WebMapTileServiceImageryProvider;

        const passed = hasRequiredExports && assetStatus === "pass" && !error;

        return (
          <main className="flex min-h-screen items-center justify-center bg-bg-base px-6 py-12 text-text-primary">
            <div className="w-full max-w-2xl rounded-3xl border border-border-default bg-bg-surface p-6 shadow-2xl shadow-black/30">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-text-muted">
                Cesium Setup Verification
              </p>

              <h1 className="text-3xl font-semibold text-text-primary">Client-only Cesium initialization</h1>

              <div className="mt-6 space-y-4 text-sm text-text-secondary">
                <div className="rounded-2xl border border-border-default bg-bg-elevated p-4">
                  <p className="font-medium text-text-primary">Library import check</p>
                  <p className={hasRequiredExports ? "mt-2 text-state-success" : "mt-2 text-state-error"}>
                    {hasRequiredExports
                      ? "PASS: Viewer, Ellipsoid, and WebMapTileServiceImageryProvider are available."
                      : error
                        ? `FAIL: ${error}`
                        : "PENDING: waiting for Cesium client import..."}
                  </p>
                </div>

                <div className="rounded-2xl border border-border-default bg-bg-elevated p-4">
                  <p className="font-medium text-text-primary">Static asset fetch</p>
                  <p className={assetStatus === "pass" ? "mt-2 text-state-success" : assetStatus === "fail" ? "mt-2 text-state-error" : "mt-2 text-text-muted"}>
                    {assetMessage}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-border-default bg-bg-subtle p-4 text-sm text-text-muted">
                <p>
                  Status: <span className={passed ? "text-state-success" : "text-state-error"}>{passed ? "PASS" : "FAIL"}</span>
                </p>
                {!passed && (
                  <p className="mt-2 text-state-error">
                    {error ?? "The Cesium runtime or static asset check did not pass."}
                  </p>
                )}
              </div>
            </div>
          </main>
        );
      }}
    </CesiumLoader>
  );
}
