"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
  }
}

type CesiumModule = typeof import("cesium");

export function CesiumLoader({
  children,
}: {
  children: (cesium: CesiumModule | null, error: string | null) => React.ReactNode;
}) {
  const [cesium, setCesium] = useState<CesiumModule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadCesium() {
      try {
        if (typeof window === "undefined") {
          return;
        }

        window.CESIUM_BASE_URL = "/cesium/";
        const cesiumModule = await import("cesium");

        if (isMounted) {
          setCesium(cesiumModule);
          setError(null);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load the Cesium library.",
          );
          setCesium(null);
        }
      }
    }

    void loadCesium();

    return () => {
      isMounted = false;
    };
  }, []);

  return <>{children(cesium, error)}</>;
}
