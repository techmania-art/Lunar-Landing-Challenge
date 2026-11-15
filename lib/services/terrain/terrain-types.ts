/**
 * Phase 11: Route Terrain Analysis Types & API Contract
 */

export type MetricStatus = "AVAILABLE" | "PARTIAL" | "UNAVAILABLE" | "FAILED";

export interface TerrainMetric<T> {
  status: MetricStatus;
  value: T | null;
  unit?: string;
  message?: string;
  sourceIds?: string[];
}

export type TerrainFeatureType = "CRATER" | "BOULDER" | "ROCK" | "OTHER";

export interface TerrainFeature {
  id: string;
  type: TerrainFeatureType;
  name?: string;
  latitude: number;
  longitude: number;
  routeDistanceMeters?: number;
  diameterMeters?: number;
  depthMeters?: number;
  estimatedHeightMeters?: number;
  intersectsRouteCorridor: boolean | null;
  confidence?: number;
  sourceIds: string[];
}

export interface ElevationSample {
  distanceMeters: number;
  elevationMeters: number | null;
  latitude: number;
  longitude: number;
  isInterpolated?: boolean;
}

export interface TerrainAnalysisRequest {
  missionId?: string;
  route: {
    coordinates: Array<{
      latitude: number;
      longitude: number;
    }>;
    corridorWidthMeters?: number;
  };
  rover?: {
    maxSlopeDegrees?: number;
    maxObstacleHeightMeters?: number;
    maxRoughness?: number;
    groundClearanceMeters?: number;
  };
  options?: {
    includeElevationProfile?: boolean;
    includeCraterDetection?: boolean;
    includeBoulderDetection?: boolean;
    includeSlopeAnalysis?: boolean;
    includeRoughnessAnalysis?: boolean;
  };
}

export interface TerrainTraversability {
  status:
    | "PASSES_CONFIGURED_LIMITS"
    | "WARNINGS_REVIEW_ROUTE"
    | "EXCEEDS_CONFIGURED_LIMITS"
    | "UNDETERMINED"
    | "NOT_EVALUATED";
  reasons: string[];
  missingRequirements: string[];
}

export interface TerrainProvenance {
  sourceId: string;
  name: string;
  productVersion?: string;
  resolutionMeters?: number;
  retrievedAt: string;
  processingMethod: string;
}

export interface TerrainAnalysisResponse {
  analysisId: string;
  status: "COMPLETE" | "PARTIAL" | "UNAVAILABLE" | "FAILED";
  route: {
    distanceMeters: number | null;
    distanceKm: number | null;
    corridorWidthMeters: number | null;
    sampleSpacingMeters: number | null;
    startPoint: { latitude: number; longitude: number };
    endPoint: { latitude: number; longitude: number };
  };
  coverage: {
    percentage: number | null;
    status: "COMPLETE" | "PARTIAL" | "NONE" | "UNKNOWN";
    missingSegments?: Array<{
      startDistanceMeters: number;
      endDistanceMeters: number;
    }>;
  };
  obstacleCount: TerrainMetric<number>;
  craterCount: TerrainMetric<number>;
  boulderCount: TerrainMetric<number>;
  maximumSlope: TerrainMetric<number>;
  averageSlope: TerrainMetric<number>;
  roughness: TerrainMetric<number>;
  elevation: {
    status: MetricStatus;
    unit: string;
    datum?: string;
    samples: ElevationSample[];
    minimumMeters: number | null;
    maximumMeters: number | null;
    elevationChangeMeters: number | null;
  };
  features: TerrainFeature[];
  traversability: TerrainTraversability;
  provenance: TerrainProvenance[];
  warnings: string[];
  generatedAt: string;
}

