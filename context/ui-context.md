# UI Context — Lunar Mission Planner

## Purpose

This file is the source of truth for the frontend visual design and behavior. It specifies the user-input page, mission workspace, lunar map marker, Mission Analysis loading state, and completed results.

The UI must remain modular and replaceable. Do not place external API calls, astronomical calculations, terrain processing, or report-generation logic inside display components.

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
