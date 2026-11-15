# Lunar Mission Planner

## Overview

Lunar Mission Planner is a decision-support and visualization application for exploring candidate landing locations near the Moon's south pole. It brings lunar surface context and astronomical position information into one clear interface so users can inspect a location, choose a mission date/time, and review sunlight and Earth-visibility conditions.

The application is intended to simplify the workflow of mission planners, educators, and the public. It does not autonomously choose or certify a landing site.

## Problem

Planning lunar south-pole missions involves difficult lighting and communication conditions. Candidate locations can have different sunlight availability, and local terrain can obstruct the Sun or Earth's line of sight. Existing mapping and ephemeris tools provide useful information but can require users to work across complex interfaces and interpret separate datasets.

## Goals

1. Let users enter a lunar landing location using latitude and longitude.
2. Let users choose a mission date and UTC time.
3. Display the selected location on an interactive lunar map.
4. Show lunar imagery and available terrain/elevation context.
5. Retrieve Sun and Earth position information for the selected site and time.
6. Present solar and Earth direction information in a clear analysis dashboard.
7. Estimate terrain-aware illumination and Earth visibility when appropriate terrain data is available.
8. Show candidate communication visibility windows with clear limitations.
9. Optionally compare a second landing location.
10. Keep the interface understandable and replaceable independently of backend calculations.

## Core User Flow

1. User opens the Mission Planner input page.
2. User enters latitude and longitude.
3. User selects a mission date and UTC time.
4. User may optionally enter another landing site for comparison.
5. User selects **Analyse Mission Conditions**.
6. The workspace displays the selected location on the lunar map using a red target box, center marker, and coordinate callout.
7. The Mission Analysis panel shows a loading state while terrain and astronomical data are retrieved and processed.
8. The loading state transitions to completed, partial, or error results.
9. User reviews the map, Sun analysis, Earth analysis, communication visibility, and surrounding terrain.
10. If supported, user compares sites/dates and exports a report.

## Core Features

### Mission Input

- Latitude input: -90° to +90°.
- Longitude input: -180° to +180°.
- Mission date.
- Mission time explicitly in UTC.
- Optional comparison location.
- Clear validation and error feedback.

### Lunar Map

- Interactive lunar surface map.
- High-resolution imagery where available.
- Terrain and elevation layers where available.
- Center map on the selected coordinates.
- Red rectangular target selection box.
- Red center crosshair/plus marker.
- Coordinate callout beside the box showing latitude and longitude.
- Zoom, recenter, and layer controls.
- Map marker and coordinate inputs remain synchronized if map-click selection is implemented.

### Sun Analysis

- Sun azimuth.
- Sun elevation.
- Geometric above/below-horizon status.
- Sunlit/dark/terrain-obstructed status only when supported by terrain-aware calculations.
- Optional time-series illumination view for a selected period.

### Earth Analysis

- Earth azimuth.
- Earth elevation.
- Geometric above/below-horizon status.
- Terrain-corrected Earth visibility when terrain data and calculations are available.

### Communication Visibility

- Candidate visibility windows in UTC.
- Current geometric/terrain visibility status.
- Clear distinction between line-of-sight visibility and a guaranteed operational radio link.

### Surrounding Terrain

Show available metrics such as:
- Elevation in metres.
- Slope in degrees.
- Surface roughness, with method/source identified.

Do not fabricate values when data is unavailable.

### Loading Experience

- Mission Analysis panel remains in place while analysis runs.
- A decorative Moon animation transitions from gibbous to full.
- Progress stages may include terrain retrieval, Sun position, Earth position, and analysis generation.
- Only mark stages complete when actual progress is known.
- Respect reduced-motion preferences.

### Comparison and Export

- Optional comparison of a second landing site.
- Date comparison may be added when a defined analysis period is supported.
- PDF export may be added for completed results.
- Comparison/export are secondary to the core map and analysis flow.

## Data Sources and Their Roles

### NASA JPL Horizons

Provides astronomical ephemeris/observer information used to determine Sun and Earth positions for the selected lunar site and time, subject to supported observer configuration and query settings.

### Lunar Reconnaissance Orbiter / QuickMap-related data

Provides access/discovery for lunar imagery, topography, elevation, and geographical context. Verify the underlying datasets and programmatic access method; do not assume the QuickMap website itself is a complete application API.

### Application Analysis Layer

Combines astronomical directions with terrain data to assess local illumination and line-of-sight obstruction. This requires documented calculations and suitable terrain coverage.

## Scope

### In Scope

- Mission input form and validation.
- Interactive lunar map and selected-coordinate marker.
- Sun and Earth position analysis.
- Terrain-aware illumination and visibility where data permits.
- Communication visibility windows.
- Clear loading, partial, complete, and error states.
- Optional second-site comparison.
- Responsive desktop/tablet/mobile UI.

### Out Of Scope Unless Explicitly Added

- Autonomous landing-site selection or safety certification.
- Flight control or rover control.
- Guaranteeing operational radio communication without link-budget and hardware modelling.
- Claiming complete terrain visibility where terrain data is missing.
- Mission simulation beyond the available data and documented calculations.
- Authentication, saved projects, collaboration, billing, or enterprise access unless separately required.

## Success Criteria

1. A user can enter valid lunar coordinates and a mission date/time.
2. The map centers on the selected coordinates and displays the red target marker and coordinate callout.
3. The analysis panel shows honest loading, completion, partial, and error states.
4. Sun and Earth position values are shown with units and source metadata.
5. Geometric visibility is clearly distinguished from terrain-corrected visibility.
6. Missing data is identified rather than replaced with invented values.
7. The UI works on desktop, tablet, and mobile.
8. UI components can be replaced without rewriting the data services or analysis logic.

## Results Page and SIS Assistant — Current Approved Extensions

The existing mission-planning and analysis workflow remains the primary product flow. The Results page presents the current Power Situation and Terrain & Communication Situation. The following additions are approved as isolated extensions.

### Results page background
- The Results page background image is being replaced with the exact `Horizon.jpg` asset supplied at `C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\Horizon.jpg`.
- The image composition includes a star-filled sky, luminous golden celestial arc, clouded horizon, astronaut, reflective foreground, and golden reflection.
- The image must be stored as a local public asset and rendered without non-uniform distortion.
- Portrait-to-landscape cropping/containment must be deliberately handled and verified at desktop, tablet, and mobile resolutions.
- This background replacement does not change the landing-page hero, other backgrounds, result cards, or mission functionality.

### SIS assistant
A small floating SIS launcher is added to the bottom-right corner of the Mission Operational Results page. Clicking it opens an on-demand conversation panel.

Phase 21 is UI only:
- Warm off-white/cream chatbot panel.
- SIS and user messages displayed in distinct left/right bubbles.
- Welcome/empty state and suggested question chips.
- Text composer and send control.
- Microphone and speaker controls shown as non-functional visual placeholders.
- Open, close, and minimize interactions.
- Responsive desktop/tablet/mobile behavior.

Phase 21 does not provide live AI answers, RAG retrieval, mission-context injection, voice capture, or LiveKit connectivity.

### Future intelligent assistant capability
A later, separately scoped integration may provide mission-aware answers by passing current typed Results page context to the existing backend RAG/LLM API. The existing LiveKit voice system may be reused for voice interaction. Text and voice should share mission context, assistant instructions, and conversation history. The assistant must distinguish actual calculated results from retrieved background knowledge and clearly identify missing/stale data.

SIS is a decision-support assistant. It does not autonomously certify a landing site, guarantee radio communications, or replace scientific calculations and human mission authority.

## Latest Active Background Change

The current background replacement requirement is to update the existing webpage background component to use the exact `Horizon.jpg` asset from:

`C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\Horizon.jpg`

Copy the exact asset into the project's public/static directory and reference it through a browser-safe local path. Render it across `100vw × 100vh` using `background-size: cover`, `background-position: center`, and `background-repeat: no-repeat`. Keep it behind all existing UI. Preserve aspect ratio and document the crop caused by `cover` at different viewport sizes.

Only the background component and necessary asset wiring may change. Existing UI layouts, interactions, foreground animations, mission results, backend, and other components must remain unchanged. No new dependencies or redesign.

This is the latest active instruction and supersedes older `contain`/full-composition-preservation recommendations for the current background replacement.
