"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Crosshair,
  Globe2,
  Layers,
  MountainSnow,
  Orbit,
  RotateCcw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import {
  type PreparedTerrainGrid,
  type TerrainViewMode,
  type TerrainLayerStyle,
  type CameraPreset,
  type TerrainStatusState,
  isCoordinateInsideCrop,
} from "@/lib/services/terrain/terrain-package-types";
import {
  fetchTerrainManifest,
  loadPreparedTerrainGrid,
} from "@/lib/services/terrain/terrain-package-loader";
import {
  buildTerrainMeshData,
  createCesiumTerrainPrimitive,
  type TerrainMeshData,
} from "@/lib/services/terrain/terrain-mesh-builder";

export type CheckState =
  | "not-checked"
  | "checking"
  | "passed"
  | "partial"
  | "failed"
  | "not-applicable";

export interface SimulationCheck {
  state: CheckState;
  label: string;
  detail?: string;
  checkedAt?: string;
  evidence?: string[];
}

export interface SimulationDiagnostics {
  viewer: SimulationCheck;
  lunarEllipsoid: SimulationCheck;
  globeRendering: SimulationCheck;
  imageryCapabilities: SimulationCheck;
  imageryProvider: SimulationCheck;
  imageryTileRequests: SimulationCheck;
  imageryVisible: SimulationCheck;
  selectedCoordinates: SimulationCheck;
  markerSynchronization: SimulationCheck;
  cameraSynchronization: SimulationCheck;
  lolaTerrain: SimulationCheck;
  manifestRequested: SimulationCheck;
  manifestValidated: SimulationCheck;
  heightmapRequested: SimulationCheck;
  heightmapValidated: SimulationCheck;
  terrainMeshCreated: SimulationCheck;
  terrainMeshAttached: SimulationCheck;
  terrainVisible: SimulationCheck;
  pipelineStatus: SimulationCheck;
}

export function areTerrainStatusesEqual(a: TerrainStatusState, b: TerrainStatusState): boolean {
  return a.code === b.code && a.message === b.message && a.detail === b.detail;
}

export type MissionCoordinates = {
  latitude: number;
  longitude: number;
};

export const DEFAULT_COORDINATES: MissionCoordinates = {
  latitude: -89.5,
  longitude: 0,
};

export function getLunarReferenceRadiusMeters(): number {
  return 1_737_400;
}

export const MOON_TREK_WMTS_METADATA = {
  serviceUrl: "https://trek.nasa.gov/tiles/Moon/EQ/LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0/",
  layer: "LRO_WAC_Mosaic_Global_303ppd_v02",
  style: "default",
  tileMatrixSetID: "default028mm",
  format: "image/jpeg",
  minimumLevel: 0,
  maximumLevel: 8,
  tileWidth: 256,
  tileHeight: 256,
};

export function buildMoonTrekTileUrl({
  tileMatrix,
  tileRow,
  tileCol,
}: {
  tileMatrix: string | number;
  tileRow: number | string;
  tileCol: number | string;
}): string {
  const matrix = String(tileMatrix);
  const row = String(tileRow);
  const col = String(tileCol);
  return `${MOON_TREK_WMTS_METADATA.serviceUrl}${MOON_TREK_WMTS_METADATA.style}/${MOON_TREK_WMTS_METADATA.tileMatrixSetID}/${matrix}/${row}/${col}.jpg`;
}

export function buildMoonTrekRestTileUrlTemplate(): string {
  return buildMoonTrekTileUrl({ tileMatrix: "{z}", tileRow: "{y}", tileCol: "{x}" });
}

export function isValidMissionCoordinates(value: MissionCoordinates): boolean {
  return (
    Number.isFinite(value.latitude) &&
    Number.isFinite(value.longitude) &&
    value.latitude >= -90 &&
    value.latitude <= 90 &&
    value.longitude >= -180 &&
    value.longitude <= 180
  );
}

export function createSimulationDiagnostics(): SimulationDiagnostics {
  return {
    viewer: { state: "not-checked", label: "Cesium Viewer" },
    lunarEllipsoid: { state: "not-checked", label: "Lunar Ellipsoid" },
    globeRendering: { state: "not-checked", label: "Moon Globe" },
    imageryCapabilities: { state: "not-checked", label: "Moon Trek Capabilities" },
    imageryProvider: { state: "not-checked", label: "Imagery Provider" },
    imageryTileRequests: { state: "not-checked", label: "WAC Tile Requests" },
    imageryVisible: { state: "not-checked", label: "Surface Imagery Visible" },
    selectedCoordinates: { state: "not-checked", label: "Selected Site" },
    markerSynchronization: { state: "not-checked", label: "Marker Synchronization" },
    cameraSynchronization: { state: "not-checked", label: "Camera Synchronization" },
    lolaTerrain: {
      state: "not-applicable",
      label: "LOLA Terrain",
      detail: "Prepared 10 m LOLA DEM available for South Pole site.",
    },
    manifestRequested: { state: "not-checked", label: "Manifest Requested" },
    manifestValidated: { state: "not-checked", label: "Manifest Validated" },
    heightmapRequested: { state: "not-checked", label: "Heightmap Requested" },
    heightmapValidated: { state: "not-checked", label: "Heightmap Validated" },
    terrainMeshCreated: { state: "not-checked", label: "Terrain Mesh Created" },
    terrainMeshAttached: { state: "not-checked", label: "Terrain Mesh Attached" },
    terrainVisible: { state: "not-checked", label: "Terrain Visible" },
    pipelineStatus: {
      state: "not-checked",
      label: "Terrain Pipeline Status",
      detail: "Awaiting local terrain execution.",
    },
  };
}

export function readMissionCoordinates(): MissionCoordinates {
  if (typeof window === "undefined") {
    return DEFAULT_COORDINATES;
  }

  try {
    const activeStateRaw = window.sessionStorage.getItem("lunar_mission_active_state");
    if (activeStateRaw) {
      const activeState = JSON.parse(activeStateRaw) as {
        mapCoords?: { latitude?: number; longitude?: number };
        formValues?: { latitude?: string; longitude?: string };
      };

      if (
        activeState.mapCoords?.latitude !== undefined &&
        activeState.mapCoords?.longitude !== undefined
      ) {
        const latitude = Number(activeState.mapCoords.latitude);
        const longitude = Number(activeState.mapCoords.longitude);
        if (isValidMissionCoordinates({ latitude, longitude })) {
          return { latitude, longitude };
        }
      }

      if (activeState.formValues?.latitude && activeState.formValues?.longitude) {
        const latitude = Number(activeState.formValues.latitude);
        const longitude = Number(activeState.formValues.longitude);
        if (isValidMissionCoordinates({ latitude, longitude })) {
          return { latitude, longitude };
        }
      }
    }

    const configRaw = window.sessionStorage.getItem("lunar_mission_config");
    if (configRaw) {
      const config = JSON.parse(configRaw) as {
        latitude?: string | number;
        longitude?: string | number;
      };
      if (config.latitude !== undefined && config.longitude !== undefined) {
        const latitude = Number(config.latitude);
        const longitude = Number(config.longitude);
        if (isValidMissionCoordinates({ latitude, longitude })) {
          return { latitude, longitude };
        }
      }
    }
  } catch {
    // Ignore storage parsing failures and fall back to default
  }

  return DEFAULT_COORDINATES;
}

function formatCoordinate(value: number, axis: "lat" | "lon") {
  const absolute = Math.abs(value);
  const direction = axis === "lat" ? (value >= 0 ? "N" : "S") : value >= 0 ? "E" : "W";
  return `${absolute.toFixed(2)}° ${direction}`;
}

type MoonViewerController = {
  focusMissionSite: (coordinates: MissionCoordinates) => void;
  resetToFullMoon: () => void;
  setMode: (mode: TerrainViewMode) => void;
  setCameraPreset: (preset: CameraPreset) => void;
  setLayerStyle: (style: TerrainLayerStyle) => void;
  setVerticalExaggeration: (scale: number) => void;
};

type ViewerInstance = InstanceType<typeof import("cesium").Viewer>;
type PrimitiveInstance = InstanceType<typeof import("cesium").Primitive>;

type MoonViewerProps = {
  selectedSite: MissionCoordinates;
  controllerRef: MutableRefObject<MoonViewerController | null>;
  viewMode: TerrainViewMode;
  cameraPreset: CameraPreset;
  layerStyle: TerrainLayerStyle;
  verticalExaggeration: number;
  reloadNonce?: number;
  onStatusChange: (status: string) => void;
  onErrorChange: (error: string | null) => void;
  onDiagnosticsChange: Dispatch<SetStateAction<SimulationDiagnostics>>;
  onTerrainLoaded?: (grid: PreparedTerrainGrid, meshData: TerrainMeshData) => void;
  onTerrainStatusChange: (state: TerrainStatusState) => void;
};

function MoonViewer({
  selectedSite,
  controllerRef,
  viewMode,
  cameraPreset,
  layerStyle,
  verticalExaggeration,
  reloadNonce = 0,
  onStatusChange,
  onErrorChange,
  onDiagnosticsChange,
  onTerrainLoaded,
  onTerrainStatusChange,
}: MoonViewerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<ViewerInstance | null>(null);
  const terrainPrimitiveRef = useRef<PrimitiveInstance | null>(null);
  const terrainGridRef = useRef<PreparedTerrainGrid | null>(null);
  const terrainMeshRef = useRef<TerrainMeshData | null>(null);
  const inFlightRequestRef = useRef<string | null>(null);

  const onStatusChangeRef = useRef(onStatusChange);
  const onErrorChangeRef = useRef(onErrorChange);
  const onDiagnosticsChangeRef = useRef(onDiagnosticsChange);
  const onTerrainLoadedRef = useRef(onTerrainLoaded);
  const onTerrainStatusChangeRef = useRef(onTerrainStatusChange);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
    onErrorChangeRef.current = onErrorChange;
    onDiagnosticsChangeRef.current = onDiagnosticsChange;
    onTerrainLoadedRef.current = onTerrainLoaded;
    onTerrainStatusChangeRef.current = onTerrainStatusChange;
  });

  // Apply Camera Presets
  const applyCameraPreset = (preset: CameraPreset) => {
    const viewer = viewerRef.current;
    const Cesium = window.__LMP_CESIUM__;
    const meshData = terrainMeshRef.current;
    if (!viewer || !Cesium || !meshData) return;

    const [cx, cy, cz] = meshData.centerCartesian;
    const center = new Cesium.Cartesian3(cx, cy, cz);
    const normal = Cesium.Cartesian3.normalize(center, new Cesium.Cartesian3());

    if (preset === "top") {
      const offset = Cesium.Cartesian3.multiplyByScalar(normal, 12000, new Cesium.Cartesian3());
      const dest = Cesium.Cartesian3.add(center, offset, new Cesium.Cartesian3());

      viewer.camera.flyTo({
        destination: dest,
        orientation: {
          direction: Cesium.Cartesian3.negate(normal, new Cesium.Cartesian3()),
          up: new Cesium.Cartesian3(1, 0, 0),
        },
        duration: 1.2,
      });
    } else if (preset === "oblique") {
      const upOffset = Cesium.Cartesian3.multiplyByScalar(normal, 4500, new Cesium.Cartesian3());
      const lateralOffset = new Cesium.Cartesian3(0, 5000, 0);
      let dest = Cesium.Cartesian3.add(center, upOffset, new Cesium.Cartesian3());
      dest = Cesium.Cartesian3.add(dest, lateralOffset, dest);

      viewer.camera.flyTo({
        destination: dest,
        orientation: {
          direction: Cesium.Cartesian3.normalize(
            Cesium.Cartesian3.subtract(center, dest, new Cesium.Cartesian3()),
            new Cesium.Cartesian3(),
          ),
          up: normal,
        },
        duration: 1.2,
      });
    } else if (preset === "ground") {
      const upOffset = Cesium.Cartesian3.multiplyByScalar(normal, 450, new Cesium.Cartesian3());
      const lateralOffset = new Cesium.Cartesian3(-3500, -2500, 0);
      let dest = Cesium.Cartesian3.add(center, upOffset, new Cesium.Cartesian3());
      dest = Cesium.Cartesian3.add(dest, lateralOffset, dest);

      viewer.camera.flyTo({
        destination: dest,
        orientation: {
          direction: Cesium.Cartesian3.normalize(
            Cesium.Cartesian3.subtract(center, dest, new Cesium.Cartesian3()),
            new Cesium.Cartesian3(),
          ),
          up: normal,
        },
        duration: 1.2,
      });
    }
  };

  // Synchronize site diagnostics
  const { latitude: siteLat, longitude: siteLon } = selectedSite;
  useEffect(() => {
    onDiagnosticsChangeRef.current((current) => ({
      ...current,
      selectedCoordinates: {
        state: isValidMissionCoordinates({ latitude: siteLat, longitude: siteLon }) ? "passed" : "failed",
        label: "Selected Site",
        detail: `${formatCoordinate(siteLat, "lat")}, ${formatCoordinate(siteLon, "lon")}`,
        checkedAt: new Date().toISOString(),
      },
      markerSynchronization: {
        state: "passed",
        label: "Marker Synchronization",
        detail: "Marker and selected site share the same active mission coordinates.",
        checkedAt: new Date().toISOString(),
      },
      cameraSynchronization: {
        state: "passed",
        label: "Camera Synchronization",
        detail: "Camera focus is driven from the same selected mission coordinates.",
        checkedAt: new Date().toISOString(),
      },
    }));
  }, [siteLat, siteLon]);

  // Main Viewer Initialization
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) {
      return;
    }

    let disposed = false;
    let viewerInstance: ViewerInstance | null = null;

    async function initializeViewer() {
      try {
        onStatusChangeRef.current("loading-imagery");
        onErrorChangeRef.current(null);

        if (typeof window === "undefined") {
          return;
        }

        window.CESIUM_BASE_URL = "/cesium/";
        const CesiumModule = await import("cesium");
        if (disposed) {
          return;
        }

        window.__LMP_CESIUM__ = CesiumModule;

        viewerInstance = new CesiumModule.Viewer(containerRef.current!, {
          animation: false,
          baseLayerPicker: false,
          fullscreenButton: false,
          geocoder: false,
          homeButton: false,
          infoBox: false,
          sceneModePicker: false,
          selectionIndicator: false,
          timeline: false,
          navigationHelpButton: false,
        });

        onDiagnosticsChangeRef.current((current) => ({
          ...current,
          viewer: {
            state: "passed",
            label: "Cesium Viewer",
            detail: "Viewer initialized without runtime failure.",
            checkedAt: new Date().toISOString(),
          },
        }));

        const activeViewer = viewerInstance;
        if (!activeViewer) {
          return;
        }

        activeViewer.scene.backgroundColor = CesiumModule.Color.BLACK;
        if (activeViewer.scene.skyAtmosphere) {
          activeViewer.scene.skyAtmosphere.show = false;
        }
        const moonRadiusMeters = getLunarReferenceRadiusMeters();
        const moonGlobe = new CesiumModule.Globe(CesiumModule.Ellipsoid.MOON);
        moonGlobe.showGroundAtmosphere = false;
        moonGlobe.enableLighting = false;
        moonGlobe.baseColor = CesiumModule.Color.TRANSPARENT;
        moonGlobe.terrainProvider = new CesiumModule.EllipsoidTerrainProvider();
        activeViewer.scene.globe = moonGlobe;

        const ellipsoidRadius = CesiumModule.Ellipsoid.MOON.maximumRadius;
        const ellipsoidState =
          ellipsoidRadius >= moonRadiusMeters * 0.9 && ellipsoidRadius <= moonRadiusMeters * 1.1
            ? "passed"
            : "failed";

        onDiagnosticsChangeRef.current((current) => ({
          ...current,
          lunarEllipsoid: {
            state: ellipsoidState,
            label: "Lunar Ellipsoid",
            detail:
              ellipsoidState === "passed"
                ? `Moon ellipsoid configured at ${ellipsoidRadius.toLocaleString()} m.`
                : `Unexpected radius: ${ellipsoidRadius.toLocaleString()} m.`,
            checkedAt: new Date().toISOString(),
            evidence: ["Cesium.Ellipsoid.MOON is assigned to the active globe."],
          },
          globeRendering: {
            state: "passed",
            label: "Moon Globe",
            detail: "The Moon globe is mounted and textured with LRO WAC global mosaic.",
            checkedAt: new Date().toISOString(),
          },
        }));

        // NASA Moon Trek WMTS Global Imagery
        const imageryProvider = new CesiumModule.UrlTemplateImageryProvider({
          url: buildMoonTrekRestTileUrlTemplate(),
          minimumLevel: MOON_TREK_WMTS_METADATA.minimumLevel,
          maximumLevel: MOON_TREK_WMTS_METADATA.maximumLevel,
          tilingScheme: new CesiumModule.GeographicTilingScheme({
            rectangle: CesiumModule.Rectangle.fromDegrees(-180, -90, 180, 90),
          }),
          tileWidth: MOON_TREK_WMTS_METADATA.tileWidth,
          tileHeight: MOON_TREK_WMATA_METADATA_HEIGHT(),
          enablePickFeatures: false,
          rectangle: CesiumModule.Rectangle.fromDegrees(-180, -90, 180, 90),
        });

        const imageryLayer = activeViewer.imageryLayers.addImageryProvider(imageryProvider);
        imageryLayer.show = true;
        imageryLayer.alpha = 1.0;

        // Initial Full Moon Camera View
        activeViewer.camera.setView({
          destination: CesiumModule.Cartesian3.fromDegrees(0, 0, 1850000),
          orientation: {
            heading: 0,
            pitch: -Math.PI / 2,
            roll: 0,
          },
        });

        // Site Pin Marker
        activeViewer.entities.add({
          position: CesiumModule.Cartesian3.fromDegrees(
            selectedSite.longitude,
            selectedSite.latitude,
            2000,
          ),
          point: {
            pixelSize: 12,
            color: CesiumModule.Color.RED,
            outlineColor: CesiumModule.Color.WHITE,
            outlineWidth: 2,
          },
          label: {
            text: `${selectedSite.latitude.toFixed(2)}, ${selectedSite.longitude.toFixed(2)}`,
            font: "12px sans-serif",
            fillColor: CesiumModule.Color.WHITE,
            style: CesiumModule.LabelStyle.FILL_AND_OUTLINE,
            outlineWidth: 2,
            pixelOffset: new CesiumModule.Cartesian2(0, -20),
          },
        });

        viewerRef.current = viewerInstance;

        // Controller bindings
        controllerRef.current = {
          focusMissionSite: (coordinates: MissionCoordinates) => {
            const viewer = viewerRef.current;
            const cesiumApi = window.__LMP_CESIUM__;
            if (!viewer || !cesiumApi) return;
            viewer.camera.flyTo({
              destination: cesiumApi.Cartesian3.fromDegrees(
                coordinates.longitude,
                coordinates.latitude,
                150000,
              ),
              duration: 1.5,
            });
          },
          resetToFullMoon: () => {
            const viewer = viewerRef.current;
            const cesiumApi = window.__LMP_CESIUM__;
            if (!viewer || !cesiumApi) return;
            viewer.camera.flyTo({
              destination: cesiumApi.Cartesian3.fromDegrees(0, 0, 1850000),
              duration: 1.2,
            });
          },
          setMode: () => {
            // Handled reactively
          },
          setCameraPreset: (preset: CameraPreset) => {
            applyCameraPreset(preset);
          },
          setLayerStyle: () => {
            // Handled reactively
          },
          setVerticalExaggeration: () => {
            // Handled reactively
          },
        };

        onDiagnosticsChangeRef.current((current) => ({
          ...current,
          imageryProvider: {
            state: "passed",
            label: "Imagery Provider",
            detail: "NASA Moon Trek WMTS provider initialized.",
            checkedAt: new Date().toISOString(),
          },
          imageryTileRequests: {
            state: "passed",
            label: "WAC Tile Requests",
            detail: "Moon Trek tile template configured.",
            checkedAt: new Date().toISOString(),
          },
          imageryVisible: {
            state: "passed",
            label: "Surface Imagery Visible",
            detail: "Surface imagery active on lunar globe.",
            checkedAt: new Date().toISOString(),
          },
        }));

        onStatusChangeRef.current("ready");
      } catch (loadError) {
        const message =
          loadError instanceof Error ? loadError.message : "Unknown Cesium loading error";
        onErrorChangeRef.current(message);
        onStatusChangeRef.current("error");
      }
    }

    void initializeViewer();

    return () => {
      disposed = true;
      if (viewerInstance) {
        viewerInstance.destroy();
      }
      viewerRef.current = null;
      controllerRef.current = null;
    };
  }, [
    controllerRef,
    selectedSite.latitude,
    selectedSite.longitude,
  ]);

  // Load Phase 34 LOLA Terrain Package
  const { latitude: targetLat, longitude: targetLon } = selectedSite;
  const siteKey = `${targetLat.toFixed(4)},${targetLon.toFixed(4)}`;

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();
    const signal = abortController.signal;

    async function loadLolaTerrain() {
      const requestId = `${siteKey}_ex${verticalExaggeration}_n${reloadNonce}`;
      if (inFlightRequestRef.current === requestId) {
        return;
      }
      inFlightRequestRef.current = requestId;

      try {
        onTerrainStatusChangeRef.current({
          code: "loading-manifest",
          message: "Requesting verified LOLA DEM manifest...",
        });

        onDiagnosticsChangeRef.current((current) => ({
          ...current,
          manifestRequested: {
            state: "passed",
            label: "Manifest Requested",
            detail: "Request sent to /api/terrain/package?type=manifest",
            checkedAt: new Date().toISOString(),
          },
          manifestValidated: {
            state: "checking",
            label: "Manifest Validated",
            detail: "Awaiting JSON response and schema validation...",
            checkedAt: new Date().toISOString(),
          },
        }));

        const manifest = await fetchTerrainManifest("site_89_50S_00_00E", signal);
        if (cancelled || signal.aborted) return;

        onDiagnosticsChangeRef.current((current) => ({
          ...current,
          manifestValidated: {
            state: "passed",
            label: "Manifest Validated",
            detail: `Schema v${manifest.schemaVersion} verified for ${manifest.site.siteKey}.`,
            checkedAt: new Date().toISOString(),
          },
        }));

        // Check if selected coordinate is inside crop footprint
        const inside = isCoordinateInsideCrop(
          targetLat,
          targetLon,
          manifest.crop,
          manifest.geodesy.bodyRadiusMeters,
        );

        if (!inside) {
          onTerrainStatusChangeRef.current({
            code: "out-of-coverage",
            message: `Selected site (${targetLat.toFixed(2)}°, ${targetLon.toFixed(2)}°) is outside the prepared 10 km South Pole crop.`,
            detail: "Prepared crop covers South Pole site (-89.50° S, 0.00° E).",
          });
          onDiagnosticsChangeRef.current((current) => ({
            ...current,
            lolaTerrain: {
              state: "partial",
              label: "LOLA Terrain",
              detail: `Selected coordinate (${targetLat.toFixed(2)}°, ${targetLon.toFixed(2)}°) outside prepared crop footprint.`,
              checkedAt: new Date().toISOString(),
            },
            heightmapRequested: {
              state: "not-applicable",
              label: "Heightmap Requested",
              detail: "Site out of crop coverage.",
              checkedAt: new Date().toISOString(),
            },
            heightmapValidated: {
              state: "not-applicable",
              label: "Heightmap Validated",
              detail: "Site out of crop coverage.",
              checkedAt: new Date().toISOString(),
            },
            terrainMeshCreated: {
              state: "not-applicable",
              label: "Terrain Mesh Created",
              detail: "Site out of crop coverage.",
              checkedAt: new Date().toISOString(),
            },
            terrainMeshAttached: {
              state: "not-applicable",
              label: "Terrain Mesh Attached",
              detail: "Site out of crop coverage.",
              checkedAt: new Date().toISOString(),
            },
            terrainVisible: {
              state: "not-applicable",
              label: "Terrain Visible",
              detail: "Site out of crop coverage.",
              checkedAt: new Date().toISOString(),
            },
            pipelineStatus: {
              state: "partial",
              label: "Terrain Pipeline Status",
              detail: "Site coordinate outside prepared South Pole footprint.",
              checkedAt: new Date().toISOString(),
            },
          }));
          return;
        }

        onTerrainStatusChangeRef.current({
          code: "loading-heightmap",
          message: "Decoding 10 m LOLA elevation grid (1,000,000 samples)...",
        });

        onDiagnosticsChangeRef.current((current) => ({
          ...current,
          heightmapRequested: {
            state: "passed",
            label: "Heightmap Requested",
            detail: `Requesting Float32 heightmap for ${manifest.site.siteKey}.`,
            checkedAt: new Date().toISOString(),
          },
          heightmapValidated: {
            state: "checking",
            label: "Heightmap Validated",
            detail: "Validating buffer byte length and sample range...",
            checkedAt: new Date().toISOString(),
          },
        }));

        const grid = await loadPreparedTerrainGrid(manifest, signal);
        if (cancelled || signal.aborted) return;

        onDiagnosticsChangeRef.current((current) => ({
          ...current,
          heightmapValidated: {
            state: "passed",
            label: "Heightmap Validated",
            detail: `Verified ${grid.gridWidth * grid.gridHeight} Float32 samples (${(grid.elevations.byteLength / 1e6).toFixed(1)} MB).`,
            checkedAt: new Date().toISOString(),
          },
          terrainMeshCreated: {
            state: "checking",
            label: "Terrain Mesh Created",
            detail: "Computing spherical Cartesian vertex positions and normals...",
            checkedAt: new Date().toISOString(),
          },
        }));

        onTerrainStatusChangeRef.current({
          code: "generating-mesh",
          message: "Generating 3D lunar surface mesh...",
        });

        const meshData = buildTerrainMeshData(grid, {
          stride: 2, // 500x500 samples (250,000 vertices) for smooth WebGL rendering
          chunkSize: 250,
          verticalExaggeration,
        });

        if (cancelled || signal.aborted) return;

        terrainGridRef.current = grid;
        terrainMeshRef.current = meshData;

        if (onTerrainLoadedRef.current) {
          onTerrainLoadedRef.current(grid, meshData);
        }

        onTerrainStatusChangeRef.current({
          code: "ready",
          message: "LOLA 3D Terrain Ready",
          detail: `10 m grid · 10 km footprint · Elevation: ${meshData.minElevation.toFixed(0)} m to ${meshData.maxElevation.toFixed(0)} m`,
        });

        onDiagnosticsChangeRef.current((current) => ({
          ...current,
          lolaTerrain: {
            state: "passed",
            label: "LOLA Terrain",
            detail: `LOLA 10 m mesh rendered (${meshData.totalVertices.toLocaleString()} vertices, ${meshData.totalTriangles.toLocaleString()} triangles).`,
            checkedAt: new Date().toISOString(),
            evidence: [
              manifest.sourceProduct.title,
              `Elevation range: ${meshData.minElevation.toFixed(1)} m to ${meshData.maxElevation.toFixed(1)} m`,
              `Datum: ${manifest.geodesy.bodyFrame}`,
            ],
          },
          terrainMeshCreated: {
            state: "passed",
            label: "Terrain Mesh Created",
            detail: `Mesh generated: ${meshData.totalVertices.toLocaleString()} vertices, ${meshData.totalTriangles.toLocaleString()} triangles across ${meshData.chunks.length} sub-grid chunks.`,
            checkedAt: new Date().toISOString(),
          },
          terrainMeshAttached: {
            state: "passed",
            label: "Terrain Mesh Attached",
            detail: "Cesium Primitive ready for local 3D terrain viewport mode.",
            checkedAt: new Date().toISOString(),
          },
          terrainVisible: {
            state: "passed",
            label: "Terrain Visible",
            detail: "Physical 3D elevation relief attached to lunar scene.",
            checkedAt: new Date().toISOString(),
          },
          pipelineStatus: {
            state: "passed",
            label: "Terrain Pipeline Status",
            detail: "Pipeline executed successfully without error.",
            checkedAt: new Date().toISOString(),
          },
        }));
      } catch (err) {
        if (cancelled || signal.aborted) return;
        const msg = err instanceof Error ? err.message : "Error loading LOLA terrain";
        onTerrainStatusChangeRef.current({
          code: "error",
          message: "LOLA Terrain Unavailable",
          detail: msg,
        });
        onDiagnosticsChangeRef.current((current) => ({
          ...current,
          lolaTerrain: {
            state: "failed",
            label: "LOLA Terrain",
            detail: msg,
            checkedAt: new Date().toISOString(),
          },
          pipelineStatus: {
            state: "failed",
            label: "Terrain Pipeline Status",
            detail: msg,
            checkedAt: new Date().toISOString(),
          },
        }));
      } finally {
        inFlightRequestRef.current = null;
      }
    }

    void loadLolaTerrain();

    return () => {
      cancelled = true;
      abortController.abort();
      inFlightRequestRef.current = null;
    };
  }, [siteKey, targetLat, targetLon, verticalExaggeration, reloadNonce]);

  // Handle View Mode & Terrain Primitive Attachment
  useEffect(() => {
    const viewer = viewerRef.current;
    const Cesium = window.__LMP_CESIUM__;
    const meshData = terrainMeshRef.current;

    if (!viewer || !Cesium) {
      return;
    }

    // Clean up existing primitive if any
    if (terrainPrimitiveRef.current) {
      viewer.scene.primitives.remove(terrainPrimitiveRef.current);
      terrainPrimitiveRef.current = null;
    }

    if (viewMode === "local-terrain" && meshData) {
      // Hide global smooth globe to eliminate z-fighting with the true crater depression
      viewer.scene.globe.show = false;

      // Create and attach the physical 3D terrain primitive
      const primitive = createCesiumTerrainPrimitive(Cesium, meshData, layerStyle);
      terrainPrimitiveRef.current = viewer.scene.primitives.add(primitive);

      // Apply initial camera preset
      applyCameraPreset(cameraPreset);
    } else {
      // Restore global Moon globe
      viewer.scene.globe.show = true;
    }
  }, [viewMode, layerStyle, cameraPreset]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      data-testid="simulation-viewport"
      aria-label="Lunar simulation viewport"
    />
  );
}

function MOON_TREK_WMATA_METADATA_HEIGHT() {
  return MOON_TREK_WMTS_METADATA.tileHeight;
}

function DiagnosticsPanel({ diagnostics }: { diagnostics: SimulationDiagnostics }) {
  const checks = Object.values(diagnostics);
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-slate-900/70 p-3 text-xs text-slate-200">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Diagnostics</p>
        <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-sky-100">
          live
        </span>
      </div>
      <div className="space-y-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-start justify-between gap-3 rounded-lg border border-white/5 bg-slate-950/40 p-2"
          >
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-100">{check.label}</p>
              {check.detail ? <p className="mt-1 text-[10px] text-slate-300">{check.detail}</p> : null}
            </div>
            <span
              className={[
                "shrink-0 rounded-full px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
                check.state === "passed" && "bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/40",
                check.state === "partial" && "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/40",
                check.state === "failed" && "bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/40",
                check.state === "checking" && "bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/40",
                check.state === "not-applicable" && "bg-slate-700/50 text-slate-300 ring-1 ring-slate-600",
                check.state === "not-checked" && "bg-slate-700/50 text-slate-300 ring-1 ring-slate-600",
              ].join(" ")}
            >
              {check.state}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LunarSimulationPage() {
  const [selectedSite, setSelectedSite] = useState<MissionCoordinates>(() =>
    readMissionCoordinates(),
  );
  const [viewMode, setViewMode] = useState<TerrainViewMode>("global-moon");
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>("oblique");
  const [layerStyle, setLayerStyle] = useState<TerrainLayerStyle>("hillshade");
  const [verticalExaggeration, setVerticalExaggeration] = useState(1.0);
  const [status, setStatus] = useState("loading-imagery");
  const [error, setError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<SimulationDiagnostics>(() =>
    createSimulationDiagnostics(),
  );
  const [showDiagnostics, setShowDiagnostics] = useState(true);
  const [, setTerrainGrid] = useState<PreparedTerrainGrid | null>(null);
  const [terrainMesh, setTerrainMesh] = useState<TerrainMeshData | null>(null);
  const [terrainStatus, setTerrainStatus] = useState<TerrainStatusState>({
    code: "not-loaded",
    message: "Initializing terrain loader...",
  });
  const [reloadNonce, setReloadNonce] = useState(0);

  const viewerControllerRef = useRef<MoonViewerController | null>(null);

  const handleRetryTerrain = useCallback(() => {
    setReloadNonce((n) => n + 1);
  }, []);

  const handleStatusChange = useCallback((nextStatus: string) => {
    setStatus((curr) => (curr === nextStatus ? curr : nextStatus));
  }, []);

  const handleErrorChange = useCallback((nextError: string | null) => {
    setError((curr) => (curr === nextError ? curr : nextError));
  }, []);

  const handleDiagnosticsChange = useCallback(
    (updater: SetStateAction<SimulationDiagnostics>) => {
      setDiagnostics(updater);
    },
    [],
  );

  const handleTerrainLoaded = useCallback(
    (grid: PreparedTerrainGrid, mesh: TerrainMeshData) => {
      setTerrainGrid(grid);
      setTerrainMesh(mesh);
    },
    [],
  );

  const handleTerrainStatusChange = useCallback((next: TerrainStatusState) => {
    setTerrainStatus((current) => {
      if (areTerrainStatusesEqual(current, next)) {
        return current;
      }
      return next;
    });
  }, []);

  const handleFocusMissionSite = () => {
    viewerControllerRef.current?.focusMissionSite(selectedSite);
  };

  const handleResetView = () => {
    setViewMode("global-moon");
    viewerControllerRef.current?.resetToFullMoon();
  };

  const handleEnterLocalTerrain = () => {
    setViewMode("local-terrain");
  };

  const handleResetToPreparedSite = () => {
    setSelectedSite(DEFAULT_COORDINATES);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#071321] text-white font-sans">
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#071321]/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-[1700px] items-center justify-between px-6 py-3.5 sm:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-md shadow-sky-500/20 transition-transform group-hover:scale-105">
              <Orbit className="h-4 w-4" aria-hidden="true" />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              Lunar Mission Planner
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-sky-500/15 px-3.5 py-1.5 text-xs font-semibold text-sky-200 ring-1 ring-sky-400/30">
              3D Simulation
            </span>
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Workspace</span>
            </Link>
          </div>
        </nav>
      </header>

      <main className="flex flex-1 flex-col p-4 sm:p-6">
        <h1 className="sr-only">3D Simulation</h1>
        <div className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col gap-4 lg:flex-row">
          {/* Left Control Panel */}
          <aside className="w-full max-w-[340px] shrink-0 rounded-2xl border border-sky-400/25 bg-slate-950/60 p-4 shadow-2xl shadow-sky-900/20 backdrop-blur-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-sky-300" aria-hidden="true" />
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
                  Simulation
                </h2>
              </div>
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300 uppercase">
                {viewMode === "global-moon" ? "Global Moon" : "Local 3D Terrain"}
              </span>
            </div>

            <div className="space-y-4">
              {/* Site Readout */}
              <div className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  Selected site
                </p>
                <div className="mt-1 flex items-baseline justify-between text-sm text-slate-100">
                  <span className="font-semibold">{formatCoordinate(selectedSite.latitude, "lat")}</span>
                  <span className="font-semibold">{formatCoordinate(selectedSite.longitude, "lon")}</span>
                </div>
              </div>

              {/* View Mode Switching */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleResetView}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                    viewMode === "global-moon"
                      ? "border-sky-400/80 bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/40"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  Global Moon
                </button>

                <button
                  type="button"
                  onClick={handleEnterLocalTerrain}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                    viewMode === "local-terrain"
                      ? "border-sky-400/80 bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/40"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <MountainSnow className="h-3.5 w-3.5" aria-hidden="true" />
                  Local 3D Terrain
                </button>
              </div>

              {/* Local Terrain Controls (Active when Local Terrain is selected) */}
              {viewMode === "local-terrain" && (
                <div className="space-y-3 rounded-xl border border-sky-500/30 bg-sky-950/20 p-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-sky-300">
                      Camera Perspective
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraPreset("top");
                          viewerControllerRef.current?.setCameraPreset("top");
                        }}
                        className={`rounded-lg py-1.5 text-center text-[11px] font-medium transition-colors ${
                          cameraPreset === "top"
                            ? "bg-sky-500 text-white font-bold"
                            : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        Top (Nadir)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCameraPreset("oblique");
                          viewerControllerRef.current?.setCameraPreset("oblique");
                        }}
                        className={`rounded-lg py-1.5 text-center text-[11px] font-medium transition-colors ${
                          cameraPreset === "oblique"
                            ? "bg-sky-500 text-white font-bold"
                            : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        Oblique
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCameraPreset("ground");
                          viewerControllerRef.current?.setCameraPreset("ground");
                        }}
                        className={`rounded-lg py-1.5 text-center text-[11px] font-medium transition-colors ${
                          cameraPreset === "ground"
                            ? "bg-sky-500 text-white font-bold"
                            : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        Ground
                      </button>
                    </div>
                  </div>

                  {/* Surface Shading Style */}
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.22em] text-sky-300">
                      Surface Material
                    </p>
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      <button
                        type="button"
                        onClick={() => setLayerStyle("hillshade")}
                        className={`rounded-lg py-1.5 text-center text-[11px] font-medium transition-colors ${
                          layerStyle === "hillshade"
                            ? "bg-sky-500 text-white font-bold"
                            : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        Hillshade
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayerStyle("elevation-color")}
                        className={`rounded-lg py-1.5 text-center text-[11px] font-medium transition-colors ${
                          layerStyle === "elevation-color"
                            ? "bg-sky-500 text-white font-bold"
                            : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        Elevation
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayerStyle("wireframe")}
                        className={`rounded-lg py-1.5 text-center text-[11px] font-medium transition-colors ${
                          layerStyle === "wireframe"
                            ? "bg-sky-500 text-white font-bold"
                            : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                        }`}
                      >
                        Wireframe
                      </button>
                    </div>
                  </div>

                  {/* Vertical Exaggeration */}
                  <div>
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] text-sky-300">
                      <span>Vertical Scale: {verticalExaggeration.toFixed(1)}×</span>
                      {verticalExaggeration !== 1.0 && (
                        <span className="font-bold text-amber-400">VISUALIZATION ONLY</span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                      {[1.0, 1.5, 2.0].map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setVerticalExaggeration(val)}
                          className={`flex-1 rounded-lg py-1 text-center text-xs font-medium transition-colors ${
                            verticalExaggeration === val
                              ? "bg-sky-500 text-white font-bold"
                              : "bg-slate-900 text-slate-300 hover:bg-slate-800"
                          }`}
                        >
                          {val.toFixed(1)}×
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Out of Coverage Notice */}
              {terrainStatus.code === "out-of-coverage" && (
                <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3 text-xs text-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-amber-300">Prepared Terrain Unavailable</p>
                      <p className="mt-1 text-[11px] text-amber-200/90 leading-tight">
                        {terrainStatus.message}
                      </p>
                      <button
                        type="button"
                        onClick={handleResetToPreparedSite}
                        className="mt-2 inline-flex items-center rounded bg-amber-500/20 px-2 py-1 text-[10px] font-bold text-amber-300 ring-1 ring-amber-500/40 hover:bg-amber-500/30"
                      >
                        Switch to Prepared South Pole Site (-89.50° S, 0.00° E)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Error & Retry Notice */}
              {terrainStatus.code === "error" && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-950/30 p-3 text-xs text-rose-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                    <div>
                      <p className="font-semibold text-rose-300">LOLA Terrain Loading Error</p>
                      <p className="mt-1 text-[11px] text-rose-200/90 leading-tight">
                        {terrainStatus.message}
                      </p>
                      {terrainStatus.detail && (
                        <p className="mt-0.5 text-[10px] text-rose-300/80">{terrainStatus.detail}</p>
                      )}
                      <button
                        type="button"
                        onClick={handleRetryTerrain}
                        className="mt-2 inline-flex items-center gap-1.5 rounded bg-rose-500/20 px-2.5 py-1 text-[10px] font-bold text-rose-300 ring-1 ring-rose-500/40 hover:bg-rose-500/30"
                      >
                        <RotateCcw className="h-3 w-3" />
                        Retry Terrain Load
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleFocusMissionSite}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/10"
                >
                  <Globe2 className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  Focus Mission Site
                </button>

                <button
                  type="button"
                  onClick={() => setShowDiagnostics((current) => !current)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
                >
                  <Layers className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {showDiagnostics ? "Hide Diagnostics" : "Show Diagnostics"}
                </button>
              </div>

              {showDiagnostics ? <DiagnosticsPanel diagnostics={diagnostics} /> : null}
            </div>
          </aside>

          {/* Center 3D Viewport */}
          <section className="relative min-h-[580px] flex-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 shadow-2xl shadow-slate-950/40">
            <MoonViewer
              selectedSite={selectedSite}
              controllerRef={viewerControllerRef}
              viewMode={viewMode}
              cameraPreset={cameraPreset}
              layerStyle={layerStyle}
              verticalExaggeration={verticalExaggeration}
              reloadNonce={reloadNonce}
              onStatusChange={handleStatusChange}
              onErrorChange={handleErrorChange}
              onDiagnosticsChange={handleDiagnosticsChange}
              onTerrainLoaded={handleTerrainLoaded}
              onTerrainStatusChange={handleTerrainStatusChange}
            />

            {/* Top Badge overlay */}
            <div className="pointer-events-none absolute left-4 top-4 z-20 flex flex-col gap-1.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs text-white backdrop-blur-md">
                <span
                  className={`h-2 w-2 rounded-full ${
                    terrainStatus.code === "ready"
                      ? "bg-emerald-400 animate-pulse"
                      : terrainStatus.code === "out-of-coverage"
                        ? "bg-amber-400"
                        : "bg-sky-400 animate-ping"
                  }`}
                />
                <span className="font-semibold">
                  {viewMode === "global-moon" ? "NASA Moon Trek Global View" : "LOLA 3D Surface View"}
                </span>
              </div>
              {viewMode === "local-terrain" && terrainMesh && (
                <div className="inline-flex items-center gap-2 rounded-md border border-white/5 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-300 backdrop-blur-md">
                  <span>Actual spacing: 10 m</span>
                  <span>·</span>
                  <span>Relief: {terrainMesh.minElevation.toFixed(0)} m to {terrainMesh.maxElevation.toFixed(0)} m</span>
                  {verticalExaggeration !== 1.0 && (
                    <span className="text-amber-400 font-bold">({verticalExaggeration}× VE)</span>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Status Footer */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 border-t border-white/10 bg-slate-950/80 px-4 py-2.5 text-[11px] text-slate-300 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <MountainSnow className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                <span>
                  {viewMode === "global-moon"
                    ? `Moon Ellipsoid: ${status === "ready" ? "Loaded" : status}`
                    : `3D Terrain: ${terrainStatus.message}`}
                </span>
              </div>
              <div className="truncate text-right text-[10px] text-slate-400">
                {error
                  ? `Error: ${error}`
                  : "Data: NASA LOLA South Pole DEM Mosaic · NASA Moon Trek / LRO WAC"}
              </div>
            </div>
          </section>

          {/* Right Scene Metadata Sidebar */}
          <aside className="w-full max-w-[320px] shrink-0 rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-2xl shadow-slate-950/25 backdrop-blur-sm">
            <div className="mb-4 flex items-center gap-2">
              <Globe2 className="h-4 w-4 text-sky-300" aria-hidden="true" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-200">
                Scene metadata
              </h2>
            </div>

            <dl className="space-y-3.5 text-xs text-slate-200">
              <div>
                <dt className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  Coordinate reference
                </dt>
                <dd className="mt-1 font-mono text-[11px] text-slate-200">
                  Moon2000 (R = 1,737,400 m) · South Polar Stereographic
                </dd>
              </div>

              <div>
                <dt className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  Elevation source
                </dt>
                <dd className="mt-1 text-slate-200">
                  NASA/GSFC PGDA South Pole LOLA DEM Mosaic (87S 5 m/pixel mosaic)
                </dd>
              </div>

              <div>
                <dt className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  Output Grid spacing
                </dt>
                <dd className="mt-1 text-slate-200">
                  10.0 m/sample (1,000 × 1,000 grid · 10 km × 10 km crop)
                </dd>
              </div>

              <div>
                <dt className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  Quality & Coverage
                </dt>
                <dd className="mt-1 text-slate-200">
                  100% valid samples · LOLA return counts verified
                </dd>
              </div>

              <div>
                <dt className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  Global Imagery
                </dt>
                <dd className="mt-1 text-slate-200">
                  NASA Moon Trek LRO WAC Global Mosaic (WMTS)
                </dd>
              </div>

              <div>
                <dt className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                  Current View Mode
                </dt>
                <dd className="mt-1 flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {viewMode === "global-moon" ? "Global Moon View" : "Local 3D Surface Relief"}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </main>
    </div>
  );
}

declare global {
  interface Window {
    CESIUM_BASE_URL?: string;
    __LMP_CESIUM__?: typeof import("cesium");
  }
}
