# UI Context — Lunar Mission Planner

## Purpose

This file is the source of truth for the frontend visual design and behavior. It specifies the user-input page, mission workspace, lunar map marker, Mission Analysis loading state, and completed results.

The UI must remain modular and replaceable. Do not place external API calls, astronomical calculations, terrain processing, or report-generation logic inside display components. A planned 3D lunar-surface rover simulation is specified in the final section and must reuse this established visual system.

## Theme

Dark only. Preserve the repository's existing dark technical workspace foundation, with a professional aerospace visual language.

- Page background: near-black/deep navy.
- Surfaces: layered dark navy panels with subtle blue borders.
- Primary action/accent: blue.
- Selected map target: red.
- Success: green.
- Warning: amber.
- Text: high-contrast white and cool grey.
- Use the existing CSS custom properties in `globals.css` and Tailwind tokens mapped through `@theme inline`. Do not hardcode hex values in component styles or introduce raw Tailwind palette classes such as `zinc-*`.
- Keep the lunar background visible and recognizable; do not apply an excessively dark overlay.
- Use the supplied lunar landscape image (Earth above the lunar horizon, astronaut in the foreground) as the landing-page hero background. Store it as a local asset under `public/` (for example `public/images/lunar-hero-background.jpg`) and reference it locally.
- Use lunar surface imagery in the map panel from a real map/data provider; the hero background is not a substitute for an interactive map.

## Existing Theme Tokens

The existing project UI context defines these tokens. Reuse them and extend only if necessary:

| Role | CSS Variable | Existing value |
|---|---|---|
| Page background | `--bg-base` | `#080809` |
| Surface | `--bg-surface` | `#111114` |
| Elevated surface | `--bg-elevated` | `#18181c` |
| Subtle surface | `--bg-subtle` | `#1e1e23` |
| Default border | `--border-default` | `#2a2a30` |
| Subtle border | `--border-subtle` | `#3a3a42` |
| Primary text | `--text-primary` | `#f0f0f4` |
| Secondary text | `--text-secondary` | `#c0c0cc` |
| Muted text | `--text-muted` | `#808090` |
| Faint text | `--text-faint` | `#505060` |
| Brand accent | `--accent-primary` | `#00c8d4` |
| Brand dim | `--accent-primary-dim` | `rgba(0, 200, 212, 0.12)` |
| AI accent | `--accent-ai` | `#6457f9` |
| AI text | `--accent-ai-text` | `#8b82ff` |
| Error | `--state-error` | `#ff4d4f` |
| Success | `--state-success` | `#34d399` |
| Warning | `--state-warning` | `#fbbf24` |

Use project token names through Tailwind utilities. If the app needs dedicated blue/target-red tokens, add them centrally to `globals.css` and `@theme inline`; do not scatter literal colors across components.

## Typography

- Use the existing Geist Sans for UI text and Geist Mono for coordinates, numeric values, and code-like metadata.
- Main page heading: approximately 44–64 px desktop, responsive down to 34–40 px.
- Panel headings: 20–24 px.
- Card headings: 15–18 px.
- Body: 14–16 px.
- Helper text/metadata: 12–13 px.
- Keep line lengths short and hierarchy clear.

## Shape and Spacing

- Inline/small controls: `rounded-xl`.
- Cards/panels: `rounded-2xl`.
- Large overlays/dialogs: `rounded-3xl`.
- Use an 8 px spacing rhythm.
- Inputs and primary buttons should be at least 44 px high.
- Panel borders should be subtle and consistent.
- Use soft shadows sparingly; avoid excessive neon glow.

## Page A — Mission Input / Landing Page

### Overall Layout

- Full viewport hero page.
- Use the supplied lunar landscape as a full-bleed background with `background-size: cover` and a carefully chosen position so the Moon surface, astronaut, and Earth/horizon remain visible where possible.
- Apply a restrained navy gradient behind text and panels for readability, not a heavy full-screen dim layer.
- Header at the top with a subtle bottom divider.
- Desktop content uses two columns: introduction on the left (about 55%) and a light mission form card on the right (about 40%).
- On mobile, stack the introduction and form vertically; no horizontal scrolling.

### Header

Left:
- Small lunar/planet icon.
- Product title: **Lunar Mission Planner**.

Right:
- **Mission Planner** (active)
- **About**
- **Documentation**

Use Lucide React stroke icons. Keep header compact and uncluttered.

### Hero Introduction — Left

1. Outlined pill with rocket icon and text **NASA SPACE APPS CHALLENGE**.
2. Main title:
   - Line 1: **Plan Your**
   - Line 2: **Lunar Mission**
3. First line white; second line pale blue using an existing or centrally defined token.
4. Supporting copy: `Explore landing locations and evaluate lunar environmental conditions.`
5. Three compact capability items with icons:
   - Sun icon — **Sun Analysis**
   - Globe icon — **Earth Analysis**
   - Mountain/triangle icon — **Terrain & Elevation**

### Mission Configuration Card — Right

- Bright near-white/light-blue surface contrasting with the dark background.
- Do not make the form card dim or low contrast.
- Rounded corners, subtle border and soft shadow.
- Header has sliders/settings icon, title **Mission Configuration**, and helper text `Enter mission details to analyse lunar conditions.`

Fields in this exact order:

#### 1. Landing Location

- Section label with map-pin icon.
- Two side-by-side fields on desktop:
  - **Latitude (°)** — placeholder `e.g. -89.5`
  - **Longitude (°)** — placeholder `e.g. 0.0`
- Latitude accepts -90 through +90.
- Longitude accepts -180 through +180.
- Support decimal and negative values.
- Show inline validation messages.
- Keep visible labels; placeholders are examples only.

#### 2. Mission Date

- Label with calendar icon: **Mission Date**.
- Date picker placeholder: `Select a date`.
- Store as ISO `YYYY-MM-DD`.

#### 3. Mission Time (UTC)

- Label with clock icon: **Mission Time (UTC)**.
- Time input; `12:00` may be used as a visual example/default only if product behavior explicitly chooses it.
- Interpret and display as UTC, not local browser time.

#### 4. Additional Site (Optional)

- Label with layers/stack icon: **Additional Site (Optional)**.
- Helper: `Add another location to compare (lat, lon)`.
- Input example: `e.g. -88.8, 12.4`.
- Parse and validate the optional latitude/longitude pair.
- This field must not block analysis of the primary site when empty.

#### Primary Action

- Full-width blue button: **Analyse Mission Conditions**.
- Play/arrow icon at the left of the label.
- Disabled when required fields are invalid or while a request is submitting.
- On click: validate, submit the mission input, and transition to the workspace/loading state.
- Show field-level errors and a recoverable request error when needed.

## Page B — Mission Planner Workspace

### Header

- Left: lunar icon and **Lunar Mission Planner**.
- Right navigation:
  - **Mission Planner**
  - **Analysis**
  - **Compare**
  - **About**
- Highlight the current item.
- Keep header height compact.

### Desktop Layout

Three aligned panels with rounded corners and subtle borders:

- Left **Mission Input** panel: approximately 21%.
- Center **Lunar Map** panel: approximately 52%.
- Right **Mission Analysis** panel: approximately 27%.

The center map is the dominant area. Panels should have consistent top/bottom alignment and avoid unnecessary page scrolling at common desktop sizes.

Tablet/mobile:
- Stack panels in this order: Mission Input, Lunar Map, Mission Analysis.
- Do not squeeze three columns onto narrow screens.
- Keep map controls reachable and analysis cards readable.

### Left Panel — Mission Input

Title: **Mission Input**.

Show editable current values:
- Latitude (°)
- Longitude (°)
- Mission Date
- Mission Time (UTC)
- Optional comparison location

Include **Analyse Mission Conditions** to rerun analysis.

If inputs change after a completed analysis, show a small **Inputs changed — analyse again** state; do not silently show old results as if they match the new inputs.

### Center Panel — Lunar Map

Header:
- Map icon.
- Title **Lunar Map**.
- Subtitle `Explore terrain, imagery and elevation`.
- Layer selector. Label it **LROC (High Resolution)** only when that layer/source is actually available.

Map surface:
- Use an interactive lunar map with actual lunar imagery and available terrain layers.
- Convert selected latitude/longitude to the map provider's coordinate projection before placing the marker.
- Center/zoom the map around the selected site after submission.
- Keep map and input coordinates synchronized if map-click selection is implemented.

#### Selected Location Marker — Exact Visual Requirement

- Draw a **red rectangular selection box** around the selected map point.
- Add a red crosshair/plus at the exact center.
- Use a thin red leader line from the box toward a coordinate callout.
- Position the callout near the upper-right corner of the selection box where space allows.
- Callout is a dark red-tinted panel with a red border and white text.
- Exact two-line format:
  - `Lat: -89.50°`
  - `Lon: 0.00°`
- Use the actual selected values, formatted to a sensible precision (two decimals is the visual example).
- The box and callout update immediately when the selected coordinates change.
- The box is a visual target highlight only; do not imply it is a certified landing safety boundary.
- Never place the marker using guessed or placeholder coordinates in production.

#### Map Controls

- Zoom in (+).
- Zoom out (−).
- Recenter on selected coordinates.
- Layer selector (imagery/elevation/terrain only when supported).
- Scale bar only if the map source provides a reliable scale.
- Bottom coordinate/status chip showing selected latitude and longitude.
- Provide accessible labels for every control.

### Right Panel — Mission Analysis

Title: **Mission Analysis**.

Subtitle: `Environmental and visibility analysis for the selected location.`

The panel has loading, complete, partial, and error states. Keep the outer panel dimensions and header stable between states to avoid a layout jump.

## Analysis Loading State

Show immediately after the user submits **Analyse Mission Conditions** and while the analysis is being retrieved/calculated.

### Loading Composition

- Keep **Mission Analysis** title and subtitle visible.
- Place a large Moon visual in the center of the panel.
- Animate its illuminated appearance from **gibbous to full Moon**.
- Use a smooth visual transition; the Moon is a decorative loading indicator, not the actual phase on the selected mission date.
- Under the Moon, show: **Analysing mission data...**
- Display a horizontal four-step progress tracker:
  1. **Fetching Terrain Data**
  2. **Calculating Sun Position**
  3. **Computing Earth Position**
  4. **Generating Analysis**

### Progress Appearance

- Completed: check icon and success treatment.
- Current: bright blue ring/pulse.
- Pending: muted grey circle.
- Connect the steps with a thin horizontal line.
- Under each step, show its short label on two lines if needed.
- Do not claim a step is complete until the underlying operation has completed.
- If the backend cannot report step-level progress, show an honest indeterminate loader and list the stages without falsely animating completion.

### Animation and Accessibility

- Use a CSS mask/gradient, SVG, or suitable local Moon asset to animate the illuminated portion from gibbous to full.
- Keep the animation subtle and smooth; do not make the entire panel flash.
- Respect `prefers-reduced-motion`: use a static Moon and non-animated progress state.
- If analysis fails or times out, transition to the error state with **Retry Analysis**.

## Analysis Completed State

When the analysis returns, replace the loading content with the results without changing the right panel's outer layout.

### Completion Banner

- Green success banner with check icon.
- Title: **Analysis Complete**.
- Supporting text: `Lunar conditions computed for [date], [time] UTC`.
- Use the actual submitted date and time.
- If some data is missing, use **Analysis Partially Complete** with an amber treatment instead of a false success banner.

### Card 1 — Sun Analysis

- Sun icon and title **Sun Analysis**.
- Status pill may be:
  - **Sunlit**
  - **Dark**
  - **Terrain-Obstructed**
  - **Unknown**
- Display two values:
  - **Azimuth** — degrees.
  - **Elevation** — degrees.
- Example visual formatting: `132.64°`, `5.27°`.
- Clearly distinguish geometric solar elevation from terrain-corrected direct illumination.

### Card 2 — Earth Analysis

- Earth/globe icon and title **Earth Analysis**.
- Status pill may be:
  - **Visible**
  - **Below Horizon**
  - **Terrain-Obstructed**
  - **Unknown**
- Display:
  - **Azimuth** — degrees.
  - **Elevation** — degrees.
- Clearly distinguish geometric horizon visibility from terrain-clear line of sight.

### Card 3 — Communication Visibility

- Radio/antenna icon and title **Communication Visibility**.
- Show:
  - Current status: **Direct Link Available**, **Unavailable**, **Terrain-Blocked**, or **Unknown**, as supported by the calculation.
  - **Next Window** with start and end time in UTC.
  - Total visibility duration if calculated.
- Do not claim a guaranteed operational radio link based only on Earth being above the horizon. Use a label such as **Geometric Visibility Window** unless antenna, relay, and link-budget constraints are modelled.

### Card 4 — Surrounding Terrain

- Mountain icon and title **Surrounding Terrain**.
- Show available values:
  - **Elevation** in metres.
  - **Slope** in degrees.
  - **Roughness** with method/source defined.
- If a metric is not available, show `Unavailable` or omit it with a clear explanation. Never invent values.

### Export Action

- Full-width outlined button: **Export Analysis (PDF)**.
- Enable only when a completed/partial result exists and export data is valid.
- Include coordinates, date/time UTC, source metadata, values, units, warnings, and calculation timestamp.
- Never export mock/demo values as real mission results.

## Partial and Error States

### Partial

- Show **Analysis Partially Complete**.
- Keep successful result cards visible.
- Show unavailable sections with an explanation.
- Use amber status, not green success.

### Error

- Show a concise error title and explanation.
- Include **Retry Analysis**.
- Preserve the user's submitted inputs.
- Do not clear the map marker or coordinates.

### Empty/Not Yet Analysed

- Show a calm empty state in the right panel:
  `Enter mission details and analyse conditions to view results.`
- Do not show invented metrics before analysis.

## UI State and Component Boundaries

Suggested component tree:

```text
MissionPlannerPage
├── AppHeader
├── MissionInputPage
│   ├── HeroIntroduction
│   └── MissionConfigurationCard
│       ├── CoordinateFields
│       ├── MissionDatePicker
│       ├── MissionTimePicker
│       └── ComparisonSiteInput
└── MissionWorkspace
    ├── AppHeader
    ├── MissionInputPanel
    ├── LunarMapPanel
    │   ├── MapLayerSelector
    │   ├── LunarMap
    │   ├── SelectedLocationMarker
    │   ├── CoordinateCallout
    │   └── MapControls
    └── MissionAnalysisPanel
        ├── AnalysisLoadingState
        │   ├── AnimatedMoon
        │   └── AnalysisProgressSteps
        ├── AnalysisCompleteState
        │   ├── AnalysisStatusBanner
        │   ├── SunAnalysisCard
        │   ├── EarthAnalysisCard
        │   ├── CommunicationVisibilityCard
        │   ├── SurroundingTerrainCard
        │   └── ExportAnalysisButton
        ├── AnalysisPartialState
        └── AnalysisErrorState
```

Data retrieval and calculation orchestration belong in service/hooks/controllers, not in the visual components. Components should render typed props/state and emit user actions.

## Data Accuracy and Display Rules

- Validate the lunar observer configuration and time settings used for Horizons queries.
- Horizons positions alone do not determine terrain obstruction.
- Lunar terrain/elevation data must be combined with Sun/Earth directions for terrain-aware visibility.
- Sun elevation above zero means geometrically above the reference horizon; it does not prove direct illumination at the point.
- Earth elevation above zero means geometrically above the reference horizon; it does not prove terrain-clear or operational communication.
- Clearly label geometric versus terrain-corrected results.
- Show units and UTC labels.
- Preserve source names, calculation timestamp, and warnings.
- Never fabricate scientific measurements or time windows.
- Demo data must be labelled **DEMO DATA** or **Illustrative**.

## Accessibility and Responsive Behavior

- Persistent labels on all inputs.
- Keyboard access and visible focus states.
- Accessible names for map controls.
- Do not use colour alone for status; include text and/or icons.
- Screen-reader announcement when loading completes or errors.
- Respect reduced-motion preference.
- Desktop: three-panel workspace.
- Tablet: adapt panel widths or stack as appropriate.
- Mobile: stack Mission Input, Lunar Map, Mission Analysis; avoid horizontal scrolling.

## Acceptance Checklist

- [ ] Landing page uses the supplied lunar hero image as a visible background without excessive dimming.
- [ ] Mission Configuration includes latitude, longitude, date, UTC time, and optional comparison site.
- [ ] Coordinate ranges and required fields are validated.
- [ ] Submitting transitions to the mission workspace.
- [ ] Workspace shows Mission Input, Lunar Map, and Mission Analysis.
- [ ] Map centers on the selected coordinates.
- [ ] Red rectangular target box, center crosshair, leader line, and coordinate callout are visible.
- [ ] Callout displays the correct selected latitude and longitude.
- [ ] Marker and callout update when coordinates change.
- [ ] Loading panel includes the gibbous-to-full Moon transition.
- [ ] Progress stages do not falsely report completion.
- [ ] Loading transitions to complete, partial, or error state without disruptive layout shift.
- [ ] Completed analysis displays Sun, Earth, communication, and terrain cards.
- [ ] Values show units and actual selected date/time.
- [ ] Unknown/unavailable data is clearly labelled.
- [ ] Geometric visibility is not misrepresented as terrain-clear or guaranteed communication.
- [ ] PDF export is only enabled for valid analysis output.
- [ ] Responsive desktop, tablet, and mobile layouts work.
- [ ] UI can be replaced without rewriting API clients or analysis logic.

---

# Current Results Page UI Extensions

This section supersedes any conflicting older background or chatbot descriptions for the Mission Operational Results page only. The landing-page hero and other page backgrounds remain unchanged unless a separate phase explicitly changes them.

## Results Page Background — `Horizon.jpg`

### Approved asset
Use the exact local image supplied by the user:

`C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\Horizon.jpg`

Copy the exact file into the repository's public asset directory using the existing convention (for example `public/images/Horizon.jpg`) and reference it through a local browser-safe URL. Never reference the Windows absolute path in browser code.

### Required composition
The Results background must preserve and visibly display these elements:
1. Deep star-filled sky.
2. Large luminous golden celestial arc/ring.
3. Bright clouded horizon.
4. Astronaut near the horizon.
5. Reflective dark foreground.
6. Long golden reflection extending into the foreground.

### Rendering requirements
- Keep the background behind all Results page content.
- Preserve the source aspect ratio; never stretch non-uniformly.
- Do not blindly use `cover` on wide screens if it crops important image details.
- Evaluate `contain` with a tasteful dark side fill or a controlled image layer for wide desktop viewports.
- Use responsive background positioning/fitting for tablet and mobile.
- Do not tile the image.
- Avoid unnecessary upscaling/pixelation.
- Keep the source's dark teal/charcoal and warm gold appearance.
- Do not add a heavy overlay that hides stars, arc, clouds, astronaut, or reflection.
- Any image positioning, fit, filter, or overlay adjustments must be scoped to this Results background component only.
- Do not change result-card opacity, blur, sizing, page layout, navigation, data, or other backgrounds in the background-replacement phase.

### Background verification
Verify the exact source asset, format, native dimensions, aspect ratio, file size, public asset URL/HTTP response, and successful browser decoding. Capture browser screenshots at:
- 1920 × 1080
- 1600 × 900
- 1440 × 900
- 1366 × 768
- 1024 × 768
- 768 × 1024
- 390 × 844

For each viewport, document the fit mode and whether any part of the image is cropped. Confirm the star field, golden arc, horizon/clouds, astronaut, foreground, and golden reflection remain visible to the extent the viewport aspect ratio permits. Do not claim the background is verified without actual browser evidence.

## SIS Chatbot — Phase 21 UI Only

### Launcher behavior
- Show a small circular SIS bot icon fixed near the bottom-right corner of the Mission Operational Results page when the panel is closed.
- Use an existing Lucide icon; no emoji.
- Give it a subtle border and shadow so it remains visible over the background.
- Provide an accessible label such as `Open SIS assistant`.
- Ensure it does not cover important result values or navigation controls.
- Clicking it opens the chatbot panel.

### Panel appearance
- Anchor a compact panel to the right side of the viewport on desktop.
- Use a warm off-white/cream surface with dark readable text, subtle warm border, rounded corners, and a soft shadow.
- Use restrained copper/terracotta accents for SIS identity and primary controls.
- Approximate desktop width: 360–420 px, constrained by viewport width.
- Approximate desktop height: 70–85 vh, constrained to viewport bounds.
- Use a vertical flex layout: header, scrollable conversation, voice controls, composer.
- Keep the underlying Results page visible and do not resize or distort its cards.

### Header
Include:
- SIS icon/avatar.
- Title: **SIS Assistant**.
- Subtitle: **LMP · Super Intelligent System**.
- A truthful local status such as **UI preview** or **Ready**.
- Minimize and close controls.

Do not show `AI connected`, `LiveKit connected`, or another live connection claim in this UI-only phase.

### Conversation
- SIS messages align left with a soft cream/tan bubble.
- User messages align right with a contrasting pale blue/cyan bubble.
- Keep message text readable and multiline.
- Conversation area scrolls independently.
- Initial empty state welcome text:
  `Hello, I'm SIS, your Lunar Mission Assistant. I can help you explore the mission results displayed on this page.`
- Suggested prompt chips:
  - `Explain my power situation`
  - `What does geometric horizon blocked mean?`
  - `What information is missing for rover energy analysis?`
- Suggested prompts may populate the composer but must not generate fabricated assistant answers.
- Any sample conversation must be explicitly labelled as a UI preview and must not use screenshot values as real mission context.

### Composer and voice placeholders
- Text input placeholder: `Ask SIS about your mission...`
- Include a send button and disabled empty-input state.
- No API request or live assistant response in Phase 21.
- Show microphone and speaker controls as visual placeholders.
- Clicking a voice placeholder may display:
  `Voice interaction will be connected in a later integration phase.`
- Do not request microphone permission, start recording, play audio, or connect to LiveKit.

### Panel interactions
- Open from the floating launcher.
- Close returns to the launcher.
- Minimize collapses the panel into a compact launcher/tab.
- Local preview messages may remain while the page session is active.
- No server persistence or cross-session memory in this phase.

### Responsive behavior
- Desktop: fixed right-side panel, approximately 360–420 px wide.
- Tablet: constrained panel/drawer that remains within viewport bounds.
- Mobile: near-full-screen drawer/modal with reachable close control and composer.
- Conversation scrolls independently.
- Avoid horizontal overflow and overlap with essential navigation.
- Respect safe viewport insets and on-screen keyboard behavior.

### Accessibility
- Semantic buttons and accessible names for icon-only controls.
- Keyboard navigation and visible focus states.
- Sufficient text/background contrast.
- Do not rely on color alone.
- Respect reduced-motion preferences.
- Keep focus behavior sensible when opening/closing the panel.

### Strict Phase 21 boundary
Phase 21 is frontend UI only. Do not add:
- LLM calls or provider credentials.
- RAG retrieval/ingestion.
- Mission context builder or context injection.
- Backend chat endpoints.
- LiveKit connection, token handling, audio, transcription, or speech synthesis.
- Fake live responses.

## Future SIS Integration (Separate Phase)

A later phase may integrate the assistant with the existing RAG/LLM backend and existing LiveKit voice implementation. The intended behavior is to build a typed, versioned mission context from the same Results page state used by the result cards, pass it securely through the backend to the existing RAG/LLM service, and provide the same context and assistant policy to the existing LiveKit agent. Voice transcripts and assistant replies should appear in the same conversation history as typed messages.

This future integration must preserve missing, stale, partial, error, and not-evaluated states; never invent measurements; distinguish geometric visibility from operational radio capability; and remain decision support rather than autonomous mission authority. Do not represent this future capability as implemented by Phase 21.

---

# Latest Active Background Component Specification

This section supersedes earlier conflicting background sizing/fit recommendations for the current webpage background replacement.

## Exact asset
Use the exact image from the developer's machine:

`C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\Horizon.jpg`

Copy it unchanged into the existing public/static asset directory (for example `public/images/Horizon.jpg`) and reference it using a browser-safe local path such as `/images/Horizon.jpg`. Never use the Windows absolute path in browser code. If the source file is missing, stop and report it; do not substitute another image.

## Rendering
- Replace the source in the existing background component.
- Fill the viewport: `100vw × 100vh`.
- `background-size: cover`.
- `background-position: center`.
- `background-repeat: no-repeat`.
- Preserve natural aspect ratio; `cover` can crop image edges depending on viewport shape.
- Do not stretch non-uniformly or tile the image.
- Keep the background behind all existing UI and prevent it from intercepting interaction.
- Do not create a duplicate background layer.

## Strict scope
Only the existing background component and minimum asset wiring may change. Do not alter page layout, navigation, cards, typography, foreground animations, interactions, mission results, backend, SIS, LiveKit, RAG/LLM, global styles, other pages, or unrelated components. Do not add dependencies or redesign the UI.

## Required verification
- Verify exact source file, JPEG validity, native dimensions and file size.
- Confirm copied asset matches source dimensions.
- Confirm browser asset URL loads successfully.
- Test 1920×1080, 1600×900, 1440×900, 1366×768, 1024×768, 768×1024, and 390×844 where possible.
- Confirm viewport coverage, centered positioning, no repetition, no non-uniform stretching, and correct stacking behind UI.
- Document the actual crop at each tested viewport; `cover` does not guarantee the full image is visible.
- Confirm existing UI interactions and foreground animations still work.
- Check browser console and network for errors.
- Capture screenshots at minimum 1920×1080, 1366×768, and 390×844.

## Phase status
This is a background-component source replacement only. It does not change the SIS chatbot UI-only Phase 21 boundary or authorize LLM/RAG/LiveKit integration. Report `BACKGROUND REPLACEMENT: VERIFIED` only after evidence-based checks pass; otherwise report `PARTIAL` or `NOT VERIFIED`.


# New Feature UI — 3D Lunar-Surface Rover Simulation

**Status: planned / not yet implemented.** The simulator is an additional experience. It must reuse this document's existing dark aerospace theme, design tokens, typography, panel shapes, and responsive principles. Do not redesign the current mission input, 2D Lunar Map, Mission Analysis, Results page, or SIS panel to accommodate it.

## Entry point and navigation

- Add a **3D Simulation** entry point/tab/action from the existing Mission Planner workspace when the simulator is implemented.
- Default recommendation: open a separate simulation route/view so Cesium rendering and simulation state remain isolated from the existing 2D map.
- Preserve the current 2D lunar map and analysis dashboard. Do not replace them in the Cesium dependency phase or Moon Trek globe phase.

## Overall visual direction

- Match the existing near-black/deep-navy background and layered dark panels.
- Reuse the current CSS custom properties and Tailwind tokens from `globals.css` and `@theme inline`.
- Use blue/cyan for active controls and route highlight, red for selected/source target and high-severity hazard markers, amber for warnings/partial data, green for completed status, and muted grey for unknown/unavailable.
- Include textual labels/icons for all status states; do not use colour alone.
- Retain Geist Sans for normal UI and Geist Mono for coordinates/numeric metadata.
- Reuse the existing rounded-xl controls, rounded-2xl panels, subtle borders, and 8 px spacing rhythm.

## Desktop layout

Use three panels, closely matching the existing Mission Planner workspace:

### Left panel — Simulation Setup

Show:
- **Source Location**
  - Latitude (°)
  - Longitude (°)
- **Destination Location**
  - Latitude (°)
  - Longitude (°)
- **Rover Profile**
  - Reuse the existing rover profile list and exact **General Rover** definition if present.
  - Do not invent speed, mass, wheel radius, clearance, battery capacity, or other physical specifications.
- **Terrain Data**
  - Imagery layer status.
  - Elevation data status, coverage, and resolution when known.
- A route preview / configure action if supported.

Validate source and destination with the existing lunar-coordinate validation. Keep the same lunar reference convention as the map and selected LOLA product.

### Center panel — 3D Lunar View

Header:
- Icon and title **3D Lunar View**.
- Subtitle such as `Explore the selected lunar traverse in 3D`.
- Data-layer selector only for verified Moon Trek layers.
- Visible data attribution/credit and terrain-resolution information when available.

Scene overlays:
- Moon globe or selected regional terrain patch.
- Source marker.
- Destination marker.
- Candidate route line.
- Rover model.
- Potential hazard markers once the terrain-analysis phase exists.
- Optional forward scan corridor when the detector is implemented.

Camera controls:
- Zoom in/out.
- Orbit/rotate.
- Reset/recenter camera.
- Focus on source, rover, destination when practical.
- Controls must be accessible by keyboard and touch.
- Do not show Earth basemaps, Earth terrain, or Earth ellipsoid imagery as the Moon.

A Moon Trek imagery-only globe must be labelled as imagery-only until a real LOLA elevation mesh is loaded. Do not make a flat imagery layer look like measured relief by adding arbitrary random bumps.

### Playback toolbar

Place a compact toolbar above or below the 3D viewport:
- Play
- Pause
- Reset
- Visualization playback rate
- Timeline/progress only if route progress is actually computed

The rate control changes visual playback speed only; do not label it as the rover's physical speed. Do not show fabricated speed, battery, distance, heading, or telemetry values.

### Right panel — Rover Telemetry & Hazard Analysis

Show the following only when available:
- Simulation status: Idle, Loading Imagery, Loading Terrain, Ready, Running, Paused, Hazard Detected, Blocked, Completed, Partial, or Error.
- Rover profile name.
- Current rover coordinates.
- Heading/orientation.
- Distance travelled and remaining.
- Next potential hazard and distance ahead.
- Hazard type/classification and warning.
- Data source, resolution, calculation method, coverage and uncertainty.
- Missing/stale/unavailable data warnings.

If a field has not been calculated or supplied by the real General Rover profile, show `Unavailable`, `Not evaluated`, or omit it with an explanation. Never fill unknown telemetry with zero or sample values.

## Hazard marker language

- Selected/source marker: follow the current red selected-target style.
- Destination marker: use a distinguishable marker style with a legend.
- Candidate traverse: blue/cyan line.
- High-severity potential hazard: red marker plus explicit text.
- Moderate/uncertain warning: amber marker plus explicit text.
- Unknown/no-data area: neutral outlined/patterned region, not green.
- Every hazard marker should be discoverable in the right panel and carry a source/method detail.
- Do not call a location “safe” simply because no hazard was detected.
- Do not show a rock/boulder marker unless an appropriate high-resolution dataset and detection method are implemented.

## Loading, partial, and error states

- Keep the three-panel shell stable while imagery or elevation loads.
- Separate **Loading Moon Trek Imagery** and **Loading LOLA Terrain** states.
- Imagery may succeed while elevation fails; show an imagery-only partial state.
- Missing coverage, invalid WMTS metadata, or DEM no-data should produce clear warnings.
- Do not mark a step complete until its actual load/processing operation succeeds.
- Provide Retry for recoverable loading failures.
- Preserve source/destination and rover profile selections on errors.

## Tablet and mobile

- Stack in this order: Simulation Setup, 3D Lunar View, Rover Telemetry & Hazard Analysis.
- Give the 3D viewport sufficient height and prevent it from collapsing to a thin strip.
- Keep playback and camera controls reachable; allow compact toolbars where necessary.
- Keep telemetry cards readable without horizontal scrolling.
- Respect safe viewport insets, keyboard interaction, reduced-motion settings, and touch gestures.
- Do not force the original three-column desktop layout onto mobile.

## Component structure

Suggested only; adapt to the actual repository:

```text
LunarSimulationPage
├── AppHeader
├── SimulationWorkspace
│   ├── SimulationSetupPanel
│   │   ├── SourceCoordinateFields
│   │   ├── DestinationCoordinateFields
│   │   ├── RoverProfileSelector
│   │   └── TerrainDataStatus
│   ├── LunarSimulationPanel
│   │   ├── CesiumLunarScene
│   │   ├── MoonTrekLayerSelector
│   │   ├── SourceDestinationMarkers
│   │   ├── CandidateRouteOverlay
│   │   ├── RoverModel
│   │   ├── HazardMarkers
│   │   └── SimulationPlaybackControls
│   └── RoverTelemetryPanel
│       ├── SimulationStatus
│       ├── RoverPositionCard
│       ├── RouteProgressCard
│       ├── HazardList
│       └── TerrainCoverageWarnings
└── Existing SIS Assistant (future context integration only)
```

The scene and display components may subscribe to typed simulation state but must not fetch NASA data or implement terrain/hazard calculations directly.

## Accessibility and interaction requirements

- Use semantic buttons and accessible labels for camera and playback controls.
- Make Play/Pause state available to assistive technology.
- Provide keyboard access and visible focus states.
- Announce newly detected hazards and simulation completion with an appropriate live region without repeatedly interrupting screen readers.
- Do not rely on colour alone for severity/status.
- Respect `prefers-reduced-motion`.
- Preserve readable contrast over the 3D scene; use restrained panel surfaces rather than heavy overlays that obscure the Moon.

## UI acceptance checklist

- [ ] A 3D Simulation entry point exists without removing current navigation or 2D map functionality.
- [ ] Simulation Setup uses source/destination coordinates and the actual General Rover profile.
- [ ] The 3D Lunar View uses a Moon-specific model and verified Moon Trek layer attribution.
- [ ] Image-only and elevation-enabled states are clearly distinguished.
- [ ] Source, destination, candidate route, rover and camera controls are visible and usable.
- [ ] Playback controls affect the actual simulation state.
- [ ] Telemetry displays only calculated or supplied values.
- [ ] Hazard markers and telemetry are synchronized.
- [ ] Unknown and no-data areas never appear hazard-free by default.
- [ ] Loading, partial, blocked, completed and error states are clear.
- [ ] Desktop, tablet and mobile layouts work without horizontal overflow.
- [ ] Existing Mission Input, 2D Lunar Map, Mission Analysis, Results and SIS UI remain intact.

For technical boundaries, implementation phases, and data rules, use `architecture-context.md` and `ai-workflow-rules.md`. These are part of the five main project context files; no separate roadmap document is required.
