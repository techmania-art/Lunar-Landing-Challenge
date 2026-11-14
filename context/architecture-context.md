# Architecture Context

## Stack

The source context identifies the following application stack. Verify the installed versions and repository configuration before implementation.

| Layer | Technology | Role |
|---|---|---|
| Framework | Next.js 16 + TypeScript | Full-stack application and server/client boundaries |
| UI | Tailwind CSS + shadcn/ui | Responsive interface and reusable components |
| Icons | Lucide React | Consistent line icons |
| Styling | CSS custom properties + Tailwind theme tokens | Centralized dark theme |
| Map | To be selected/verified | Lunar imagery, coordinate display, layers, and map interaction |
| Astronomical data | NASA JPL Horizons | Sun/Earth observer and ephemeris information |
| Lunar terrain data | LROC/QuickMap-related datasets or another verified source | Imagery, elevation, and terrain context |
| Analysis engine | TypeScript server-side modules or a suitable computation service | Combine ephemeris and terrain data |
| Report export | To be selected | Generate a PDF from completed analysis |

Do not assume that QuickMap itself exposes a turnkey API for every map layer or calculation. Verify data access, licensing, coordinate reference systems, and service limits before integration.

Authentication, database, collaboration, and background-job technologies are not defined by the Lunar Mission Planner requirements. Do not add Clerk, Prisma, PostgreSQL, Liveblocks, Trigger.dev, or Vercel Blob solely because they appeared in a previous unrelated template. Add them only if the repository or product requirements confirm they are needed.

## Product System Boundaries

Keep these responsibilities separate:

- `app/` — Next.js routes, pages, layouts, and route handlers.
- `components/` — UI composition: mission form, map panel, analysis cards, progress state, and navigation.
- `lib/` — shared utilities, validation, API clients, and data transformations.
- `lib/services/` or equivalent — Horizons and lunar terrain data access.
- `lib/analysis/` or equivalent — calculations that combine astronomical directions with terrain data.
- `types/` — shared TypeScript contracts.
- `public/` — static assets, including the supplied lunar hero background if appropriate.
- `context/` — project specifications and progress documentation.

Adapt names to the repository's existing structure; do not create duplicate layers if equivalent ones already exist.

## Main Data Flow

1. User supplies latitude, longitude, mission date, and mission time in UTC.
2. The application validates the input.
3. The map converts the selected coordinates to the map's projection and centers the view on the selected site.
4. The map displays a red target rectangle, center marker, and coordinate callout.
5. The analysis orchestration requests astronomical data for the correct lunar surface observer and requested time/period.
6. The terrain service retrieves the relevant lunar imagery/elevation data for the selected area.
7. The analysis layer combines Sun/Earth directions with terrain horizon information where available.
8. The analysis response is normalized into the UI-facing result contract.
9. The right-side panel transitions from loading to complete, partial, or error state.

## External Data Responsibilities

### NASA JPL Horizons

Use Horizons for appropriate astronomical observer/ephemeris outputs, including Sun and Earth apparent directions as required by the product.

Before implementation, verify:
- The correct lunar surface observer/site configuration.
- Coordinate conventions and reference frame.
- Time scale and UTC conversion.
- Requested output quantities and units.
- Whether the selected query mode supports the required observer location.
- Query limits, response format, and error handling.

Horizons positions alone do not prove that a body is visible above local terrain.

### Lunar imagery and terrain

Use a verified lunar mapping/terrain source for:
- Lunar imagery.
- Elevation/topography.
- Surface features and local terrain context.
- Data needed to estimate local horizon obstruction.

QuickMap is a useful exploration and data-discovery interface. Do not assume that copying its website URL or embedding its page provides programmatic access to the required datasets. Verify the actual downloadable data services or APIs.

### Combined visibility analysis

The analysis layer may derive:
- Geometric Sun elevation/azimuth.
- Geometric Earth elevation/azimuth.
- Terrain-corrected solar visibility.
- Terrain-corrected Earth line-of-sight visibility.
- Candidate direct-communication visibility windows.

The terrain-corrected outputs require appropriate terrain data and a documented horizon/obstruction method. A direct radio link additionally depends on communication hardware, antenna orientation, relay availability, and link-budget constraints. Label outputs accurately.

## UI-Facing Data Contract

Use explicit types and adapt them to the existing codebase. Keep the UI independent from raw external API response formats.

```ts
export interface MissionInput {
  latitude: number;
  longitude: number;
  date: string; // YYYY-MM-DD
  timeUtc: string; // HH:mm
  comparisonSite?: {
    latitude: number;
    longitude: number;
  };
}

export type AvailabilityStatus =
  | "available"
  | "unavailable"
  | "terrain-obstructed"
  | "unknown";

export interface DirectionResult {
  azimuthDegrees: number;
  elevationDegrees: number;
  geometricStatus: "above-horizon" | "below-horizon" | "unknown";
}

export interface MissionAnalysisResult {
  sun: DirectionResult & {
    illuminationStatus:
      | "sunlit"
      | "dark"
      | "terrain-obstructed"
      | "unknown";
  };
  earth: DirectionResult & {
    terrainVisibility: AvailabilityStatus;
  };
  communication: {
    currentStatus: AvailabilityStatus;
    windows: Array<{
      startUtc: string;
      endUtc: string;
    }>;
  };
  terrain: {
    elevationMeters?: number;
    slopeDegrees?: number;
    roughness?: string;
  };
  metadata: {
    sources: string[];
    calculatedAt: string;
    isDemoData: boolean;
    warnings: string[];
  };
}
```

This is a conceptual contract, not a claim that all values are currently available from the selected providers. Mark unavailable fields explicitly.

## State Model

The analysis UI should support:
- `idle`
- `validating`
- `loading`
- `complete`
- `partial`
- `error`

Do not mark a progress step complete until the corresponding operation has actually completed. If the backend cannot report granular progress, show an honest indeterminate loader and a descriptive list of work being performed.

## Invariants

1. UI components do not directly implement astronomical or terrain calculations.
2. Raw provider responses are normalized before reaching display components.
3. User coordinates are range-validated before requests are made.
4. Mission date and time are interpreted and displayed explicitly in UTC.
5. Geometric horizon visibility is not presented as terrain-clear visibility.
6. Terrain-clear visibility is not presented as a guaranteed operational communication link.
7. No mock/demo measurement is presented as real NASA/JPL output.
8. External data failures produce explicit partial/error states rather than fabricated values.
9. Map marker coordinates and analysis input always refer to the same selected site.
10. The frontend can be redesigned without rewriting data services or analysis modules.
