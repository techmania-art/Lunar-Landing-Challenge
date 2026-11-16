# Phase 35 — Render Prepared LOLA Data as Local 3D Lunar Terrain

## Objective

Implement the local 3D lunar surface view in the existing Lunar Mission Planner Cesium simulation, using the **already prepared and verified Phase 34 terrain package**. The output must be actual elevation-driven geometry, correctly positioned on the Moon, with truthful source/quality metadata and a usable camera transition from the existing global Moon view.

This phase is a renderer/integration phase. **Do not repeat Phase 34, redownload the source DEM, replace the prepared dataset, or rewrite the Phase 34 preparation pipeline.**

## Non-negotiable scope and preservation rules

1. Read the current `context/progress-tracker.md`, the Phase 34 completion notes, the current simulation code, and the exact Phase 34 `terrain-manifest.json` before implementation.
2. Treat the manifest and its referenced output files as the source of truth. Do not assume filenames, dimensions, resolution, CRS, datum, sample type, endianness, scale/offset, NoData encoding, or directory names from an older prompt.
3. Preserve the existing working Cesium global Moon and NASA Moon Trek imagery integration. Do not replace it with a generic globe, a static screenshot, a decorative sphere, or fabricated terrain.
4. Do not modify, delete, regenerate, or redownload the completed Phase 34 raw/processed terrain outputs. Read them only. If a genuine Phase 34 defect is discovered, stop and report it as a separate blocker rather than silently changing the completed data workflow.
5. Do not implement rover models, rover motion, scanning, obstacle detection, pathfinding, or SIS simulation integration in this phase.
6. Preserve existing LMP pages, mission input/results flow, SIS, LiveKit, styling tokens, navigation, and unrelated services.
7. Follow the repository's current package manager, conventions, Cesium version, TypeScript strictness, and testing setup. Do not install competing 3D engines.
8. Never label the terrain `verified`, `real`, `5 m`, or `20 m` unless those claims are supported by the actual manifest and browser evidence.

## Stage 0 — Preflight and Phase 34 artifact validation (must happen first)

Inspect the actual Phase 34 output location and manifest. Do not proceed until all checks below pass:

- The manifest exists and parses as valid JSON.
- Every path referenced by the manifest exists.
- The DEM/heightmap dimensions, byte count, sample type and endianness match the manifest exactly.
- The stored pixel spacing/resolution is the actual output spacing, not merely the original source spacing.
- The CRS, projection parameters, lunar body reference frame, longitude direction, latitude convention, vertical units, elevation scale/offset, pixel registration and raster transform are present and internally consistent.
- The selected mission coordinate falls inside the prepared crop footprint.
- The crop has a meaningful percentage of valid samples; NoData values are identified and not silently replaced with zero elevation.
- The heightmap is aligned to the manifest's raster dimensions and transform. If quality/count data is absent, the UI and manifest must continue to describe data quality as unavailable; do not infer zero counts or full coverage.
- Reconcile the actual output schema with `scripts/terrain/prepare_lola_dem.py` and its tests, but do not edit Phase 34 outputs.

Run the existing focused Phase 34 tests and typecheck only as a read-only baseline if useful. Do not modify the Phase 34 script just to fit an assumed Phase 35 schema.

**If any critical metadata is missing or contradictory:** stop Phase 35 before rendering. Report the exact missing field/file and why it prevents correct placement or geometry generation. Do not guess a lunar CRS or fall back to Earth WGS84 semantics.

## Stage 1 — Define a typed terrain package contract

Create or extend a small typed service boundary for the prepared terrain package. Adapt to existing project structure; do not duplicate existing terrain services.

The runtime contract should describe, based on real manifest fields:

- site identity and prepared geographic footprint;
- raster width and height;
- actual X/Y sample spacing;
- raster affine transform and source CRS/projection;
- lunar body-fixed reference frame and coordinate conventions;
- elevation unit, sample encoding, endianness, scale and offset;
- NoData handling and valid-data coverage;
- source product and source URLs/identifiers;
- preparation timestamp and processing/resampling method;
- locations of the prepared height samples, optional native crop, and optional quality mask.

Use explicit types. Do not use `any`. Validate untrusted JSON and binary lengths at the service boundary. Preserve unavailable metadata as unavailable rather than manufacturing defaults.

## Stage 2 — Load and decode the prepared height data

Implement a dedicated terrain data loader/service, not data parsing inside the visual component.

Requirements:

1. Fetch only the Phase 34 prepared outputs needed for the local scene. Never fetch the multi-gigabyte raw source DEM from the browser.
2. Decode the heightmap according to the actual manifest sample encoding and byte order. Do not assume `Float32Array` unless the manifest and binary file prove it.
3. Validate `byteLength === width * height * bytesPerSample` (or the exact documented packed format).
4. Apply the documented scale/offset and elevation units exactly once.
5. Apply NoData and quality masks before mesh generation. Invalid samples must not become zero-height craters or spikes.
6. Return a typed `PreparedTerrainGrid` object containing decoded heights, validity mask, georeferencing metadata, source metadata and warnings.
7. Handle loading, cancellation, malformed data, unavailable files and network failures. Do not leave an indefinite loading spinner.
8. Do not cache an invalid/partial response as a successful terrain package.

If the data volume is too large for one main-thread parse, use an existing worker pattern or add a focused worker only if necessary. Do not introduce a complex worker framework without need.

## Stage 3 — Convert lunar DEM coordinates into Cesium positions correctly

This is the most scientifically sensitive part of the phase.

- Use the actual projection definition and lunar reference frame stored in the Phase 34 manifest/source metadata.
- Invert the DEM's map projection for every mesh sample (or use a verified transformation grid/lookup produced during preparation) to obtain the correct lunar latitude/longitude.
- Respect longitude east/west convention, central meridian, latitude of origin, scale factor, false easting/northing, lunar radius/datum and any required frame conversion.
- Use the existing Cesium lunar ellipsoid only after verifying it is consistent with the DEM's reference radius/frame. Do not assume Cesium's built-in lunar ellipsoid automatically matches every LOLA product datum.
- Convert each valid sample into a Moon-centred Cartesian position using the correct lunar ellipsoid/base radius plus the measured elevation in the documented unit.
- Do not add elevation twice, mix kilometres and metres, or apply vertical exaggeration to the source values.
- Use the actual raster pixel-centre convention and affine transform. Do not position pixels on corners by accident.
- Check longitude wrapping and polar projection behaviour near 89.5° S.

If the manifest does not contain enough information to transform the DEM accurately, stop and report the missing CRS/frame detail. Do not substitute EPSG:4326 for a lunar polar CRS.

## Stage 4 — Build an efficient 3D terrain mesh

Implement a separate geometry builder that takes the validated `PreparedTerrainGrid` and returns mesh geometry suitable for the installed Cesium version.

Requirements:

- Generate vertices from the measured elevation samples and their transformed lunar coordinates.
- Generate valid triangle indices while respecting row/column order and image/raster orientation.
- Exclude or correctly mask triangles that cross NoData holes.
- Generate finite vertex normals suitable for lighting. Verify winding order; inverted normals must not make the terrain appear inside-out or black.
- Generate texture coordinates that map consistently across the terrain patch.
- Preserve the curved lunar surface rather than flattening the whole region into a tangent-plane slab. A local tangent representation is acceptable only if its curvature error is quantified and documented; default to Moon-centred coordinates for the terrain placed on the globe.
- Use typed arrays and avoid allocating redundant copies of large grids.
- Respect WebGL index limits and Cesium's installed geometry/primitive APIs. Partition the mesh into chunks if required by vertex/index limits or GPU memory.
- Dispose GPU resources, primitives, materials and buffers when switching modes or unmounting. Prevent duplicate primitives on React re-render.
- Keep the true vertical scale at 1.0 by default. Any vertical exaggeration must be a clearly labelled visualization-only control and must not alter the source values or analysis.

Do not use a flat plane with an elevation-colored texture as a substitute for elevation geometry. Color maps can be an optional visual layer, but the surface must physically rise and fall from DEM heights.

## Stage 5 — Integrate imagery with the local terrain

The current global Moon Trek imagery must remain working.

For the local terrain patch:

1. Inspect the current Moon Trek WAC imagery provider, its projection/tile matrix scheme, layer/style and coordinate conventions.
2. Determine a correct way to obtain a georeferenced image texture for the exact terrain patch. The imagery must align with the DEM footprint, not merely be a nearby tile or stretched screenshot.
3. Use a documented/reproducible reprojection and texture-coordinate method. If a local reprojected texture is prepared by a script, keep it separate from the Phase 34 source outputs and record source tile IDs, processing CRS, image bounds and resampling method.
4. If exact WAC imagery alignment cannot be completed in this phase, render the terrain with a clearly labelled DEM hillshade/elevation material and leave the WAC drape as explicitly pending. Do not stretch a global WMTS tile over the crop or claim it is aligned.
5. Ensure the local terrain mesh is not hidden by the global ellipsoid. Use a deliberate mode transition: either hide/clip the relevant global globe surface while showing the local mesh, or implement a properly integrated terrain provider. Avoid z-fighting and duplicated overlapping surfaces.
6. Do not display a fabricated photorealistic terrain texture.

The preferred user result is actual LOLA geometry with correctly georeferenced Moon Trek imagery. A scientifically correct, clearly labelled hillshade fallback is preferable to a visually impressive but misregistered texture.

## Stage 6 — Local Terrain mode and camera behaviour

Extend the existing simulation page. Do not create a parallel simulation route or duplicate Cesium viewer unless the current architecture requires it.

Provide:

- **Global Moon** mode: preserve the current textured lunar globe and existing controls.
- **Local Terrain** mode: show the prepared 3D terrain patch for the selected site.
- **Focus Mission Site** action: transition the camera to the prepared patch using its actual manifest footprint and bounds.
- **Return to Global Moon** action: return to the current working globe and imagery.
- Camera presets: Top, Oblique and Ground-level (where the current camera/scene implementation supports it).
- Vertical exaggeration control with 1.0× default and a clear `VISUALIZATION ONLY` label when changed.
- Terrain layer choice when available: Imagery + Elevation, Elevation, Slope, Hillshade. Do not show a mode as selectable/available until its data/material is implemented.
- A visible selected-site label from the live mission state.

Coordinate behaviour:

- Read coordinates from the authoritative existing mission state. Do not hardcode `89.5° S, 0° E` or the earlier equatorial example.
- Compare the selected coordinate with the terrain manifest site and footprint.
- If the selected point is outside the prepared crop or a different prepared site is selected, show `Prepared terrain unavailable for this site` and offer return to the global Moon. Do not silently reuse the previous site's patch.
- At/near the pole, handle longitude convergence consistently with the DEM projection and clearly show the selected convention.
- Keep the selected map marker, coordinate readout and camera target synchronized.

## Stage 7 — UI and status reporting

Match the existing LMP dark aerospace UI and design tokens. Keep the viewport dominant and controls compact.

Show actual terrain metadata in the local view:

- source: NASA LOLA product identifier;
- actual output spacing (metres/sample);
- crop dimensions and coverage bounds;
- vertical reference/datum and projection name;
- valid sample percentage;
- quality/count-map status;
- preparation timestamp.

Show explicit states:

- `Loading prepared terrain`
- `Terrain ready`
- `Terrain partially available` (with warning)
- `Prepared terrain unavailable for this site`
- `Terrain data invalid`
- `Terrain rendering failed`

Do not equate a downloaded/decoded grid with a successfully rendered mesh. The diagnostics must distinguish:

1. manifest loaded;
2. height data loaded;
3. height data validated;
4. coordinates transformed;
5. mesh generated;
6. primitive attached to scene;
7. terrain visibly rendered in browser.

Only the final state can be marked visually verified after browser evidence.

## Stage 8 — Tests and verification

Add focused tests using the repository's existing test framework. Do not create a second test framework.

### Unit tests

- Manifest validation accepts the actual Phase 34 manifest.
- Incorrect/missing paths are rejected clearly.
- Binary byte-length mismatch is rejected.
- Sample decoding respects the actual type, byte order, scale and offset.
- NoData values remain invalid and are not treated as zero.
- Selected site inside/outside the crop is classified correctly.
- Projection conversion for known sample points produces finite, expected lunar coordinates within a documented tolerance.
- Elevation is applied once and in metres.
- Mesh index ranges are valid; all positions/normals/UVs are finite.
- No triangles bridge invalid NoData gaps.
- Mesh winding/normals face outward.
- Repeated mode toggles do not leak duplicate Cesium primitives/resources.

### Browser/integration checks

- Existing global Moon still renders with its Moon Trek texture.
- Entering Local Terrain shows an actual non-flat mesh from prepared LOLA elevations.
- Oblique/ground camera makes elevation relief visible.
- The selected mission site and terrain patch align.
- Return to Global Moon restores the original globe and imagery.
- Switching to a coordinate outside the prepared patch shows an explicit unavailable state.
- Resizing desktop/tablet/mobile does not destroy the viewer or hide controls.
- No console exceptions, WebGL errors, tile regressions or unhandled network failures.

### Visual evidence

Capture screenshots of:

1. Global Moon mode with recognizable lunar imagery.
2. Local Terrain mode from top view.
3. Local Terrain mode from oblique view showing relief.
4. Ground-level view if supported.
5. Out-of-coverage state.

A screenshot of a blue sphere, flat texture, flat plane, or elevation color image alone does not pass local 3D terrain verification.

### Required command checks

Run the repository's actual scripts (inspect `package.json` first):

- focused new terrain tests;
- `npm run typecheck`;
- `npm run lint`;
- relevant existing simulation tests;
- `npm run build`.

Report exact command results. Do not say tests passed if they were not run.

## Stage 9 — Documentation and progress tracker

Update only the relevant context/progress documentation after implementation:

- Record Phase 35 implementation state, changed files, test commands/results and browser evidence.
- Record actual Phase 34 manifest path and schema used.
- Record actual rendered terrain resolution and source product.
- Distinguish implemented, partially implemented, blocked and visually verified items.
- Preserve the note that Phase 34's pre-transfer validator continuity cannot be proven if that caveat remains in the current tracker.
- Do not alter the historical Phase 34 completion record except to link to Phase 35 evidence.

## Completion criteria

Phase 35 may be marked **COMPLETE AND VISUALLY VERIFIED** only when all of the following are true:

1. The actual Phase 34 manifest and prepared elevation samples are loaded successfully.
2. The renderer uses the actual lunar CRS/reference frame and correct elevation metadata.
3. The local surface is non-flat because of measured LOLA elevation values.
4. Crater/ridge/depression relief is visible from an oblique camera view.
5. Local terrain is positioned at the correct selected lunar location on the Moon.
6. The camera can enter and exit Local Terrain mode without breaking the global Moon imagery.
7. NoData/coverage and data source information are communicated honestly.
8. Focused tests, typecheck, lint, relevant simulation tests and production build pass.
9. Browser screenshots and console/network evidence are recorded.

If any criterion is not met, report **PARTIAL** or **BLOCKED**, specify the evidence, and do not begin rover implementation.

## Explicit out of scope

- New DEM downloading or Phase 34 data preparation.
- Replacing the Moon Trek global imagery source.
- Rover model, movement, wheel physics or telemetry.
- Obstacle detection, crater avoidance or pathfinding.
- SIS/LiveKit changes.
- Mission-analysis calculations or communication/illumination logic.
- New database, backend service, cloud storage or third-party 3D engine unless a verified technical blocker requires a narrowly scoped change and is documented first.

## Final execution instruction

Implement Phase 35 incrementally, beginning with the Stage 0 artifact inspection. Use the actual manifest and files that Phase 34 produced. Do not assume the earlier proposed filenames or resolution. Preserve all working code and project features. Stop on missing scientific metadata rather than guessing. Demonstrate real DEM-derived relief in the browser before reporting completion.
