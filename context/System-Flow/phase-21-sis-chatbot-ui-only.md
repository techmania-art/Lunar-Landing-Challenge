# Phase 22 — SIS Assistant on the Analysis Page
## Exact UI Implementation Context and Debug Specification

## 1. Objective

Implement the SIS Assistant interface on the **Analysis page**, matching the approved UI concept generated from the user's supplied Lunar Mission Planner screenshot.

The target is a dark, space-themed Analysis workspace with the existing three-column mission interface preserved and a warm off-white SIS conversation panel opened from a compact SIS button in the top-right navigation.

This document specifies the frontend UI implementation. It does not authorize live LLM/RAG/LiveKit integration unless a separate phase explicitly requests it.

## 2. Visual source of truth

Use these references in this order:

1. The user's uploaded Analysis page screenshot: the existing LMP page, with top navigation, Mission Input panel on the left, Lunar Map in the center, and Mission Analysis panel on the right.
2. The approved generated UI concept: `a_wide_dark_themed_lunar_mission_planner_analys.png` (the concept showing the same Analysis workspace with the open cream SIS Assistant panel at the far right).
3. Existing project design tokens and components.

The generated concept is a layout/style reference only. Do not copy its illustrative mission values or treat its sample conversation as live or scientifically verified output.

### Reference composition
- Existing dark LMP workspace remains the base.
- Existing top navigation remains across the top.
- A compact glowing blue SIS launcher is added at the far right of the top navigation.
- When opened, a tall warm ivory/cream chat panel appears over the far-right portion of the Analysis page.
- The existing Mission Input and Lunar Map remain visible.
- The Mission Analysis panel remains visible as much as the viewport permits; it may sit partly behind/adjacent to the overlay according to the available width, but it must not be resized or redesigned.
- The chat panel has rounded corners, a soft shadow, restrained warm accents, and dark readable typography.

## 3. Strict scope

### Allowed
- Add an SIS launcher button to the Analysis page's top navigation, at the far right as shown in the concept.
- Add the SIS Assistant panel and its local UI state.
- Add header, message list, message bubbles, suggested prompts/empty state, composer, and voice-control placeholders.
- Add responsive behavior for the panel.
- Add minimal Analysis-page-scoped styles and component files required for this interface.
- Reuse existing icon, button, input, and panel components.

### Not allowed in this UI phase
- Do not change the Mission Input panel or its fields.
- Do not change the Lunar Map, map provider, imagery, zoom controls, markers, or map behavior.
- Do not change Mission Analysis cards, values, status labels, calculations, or data fetching.
- Do not change global navigation routes or existing navigation actions.
- Do not change the Results page or its background.
- Do not change the existing Results-page background component or `Horizon.jpg` implementation.
- Do not change the 3D Simulation or Compare pages.
- Do not change backend endpoints, database schemas, or authentication.
- Do not add LLM calls, RAG retrieval, mission-context injection, or LiveKit connection in this UI-only phase.
- Do not request microphone permission, record audio, or play audio.
- Do not add new dependencies unless a required UI primitive truly does not exist in the project.

## 4. Launcher placement and behavior

### Placement
- Add a compact SIS button at the far right of the existing top navigation.
- Place it after the existing `Back to Input` control if that matches the current navigation structure, while preserving the existing order and behavior of all current navigation items.
- Use a small rounded/pill or compact circular treatment matching the generated concept.
- Use the existing Lucide icon library; a bot/robot icon is suitable.
- Use a dark blue/cyan accent with a subtle glow or border.
- Button label: `SIS`.
- Accessible name: `Open SIS Assistant`.

### Closed state
- Only the launcher is visible.
- It must not push or resize the navigation items unexpectedly.
- Keep adequate spacing from the viewport edge.
- Provide hover, active, and keyboard-focus states.

### Open state
- Clicking the SIS button opens the chat panel.
- The panel is anchored to the right side of the viewport.
- The launcher may remain highlighted while open, but do not render duplicate launchers.
- Opening/closing must not trigger navigation or reset the Analysis page state.

## 5. Chat panel geometry and placement

### Desktop
- Position the panel as a fixed overlay at the right side of the viewport.
- Align its top below the main navigation bar with a small safe margin.
- Target width: approximately 350–380 px; use a responsive maximum width so it fits smaller desktop viewports.
- Target height: approximately 70–85 vh, capped to the available viewport height.
- Keep the panel inside viewport boundaries.
- Use a vertical flex layout:
  1. Header
  2. Scrollable conversation history
  3. Voice/action controls
  4. Text composer

### Layering
- Panel must render above the page background and page content.
- Use a deliberate z-index above the Analysis workspace but below any global critical modal/dialog layer.
- The panel must not intercept pointer events outside its own bounds.
- Do not add a full-screen opaque backdrop on desktop.
- Do not alter the dimensions or layout of the three existing workspace columns to make room for the panel.
- The panel may visually overlay a portion of the Mission Analysis column, matching the approved concept, but should not make the Mission Input or map unusable.
- If the current viewport is too narrow, switch to the tablet/mobile behavior described below.

### Visual styling
- Main surface: warm ivory/off-white.
- Suggested base colors: warm cream `#FFF7ED` / `#FFF9F2`; choose values consistent with existing theme and ensure contrast.
- Main text: near-black / dark charcoal.
- Secondary text: muted warm gray.
- SIS accent: copper / terracotta / warm orange.
- User message bubble: pale blue/cyan, with dark blue text.
- SIS message bubble: pale cream/tan, with dark text.
- Border: subtle warm beige.
- Shadow: soft and elevated, not harsh.
- Corner radius: approximately 20–24 px.
- Avoid heavy gradients, excessive glow, and unnecessary decorative graphics.

The cream chat panel should clearly contrast with the dark LMP workspace while still looking like part of the same product.

## 6. Header contents

At the top of the panel include:

- Circular SIS avatar with a bot icon.
- Title: **SIS Assistant**
- Subtitle: **LMP · Super Intelligent System**
- A small green status dot and text such as **UI preview** or **Ready**
- Minimize button
- Close button

### Header behavior
- Close hides the panel and returns to the closed launcher state.
- Minimize collapses the panel into a compact assistant tab or launcher state.
- Icon-only controls must have accessible labels:
  - `Minimize SIS Assistant`
  - `Close SIS Assistant`

### Truthful status
This phase is UI-only. Do not label the assistant `Connected`, `Live`, `AI Online`, or `LiveKit Connected` unless those connections are actually implemented and verified in a later integration phase. Prefer `UI preview` or `Ready`.

## 7. Conversation area

The conversation history occupies the flexible middle region and scrolls independently.

### SIS messages
- Align left.
- Use pale warm cream/tan bubbles.
- Place a small SIS avatar/icon beside the bubble where appropriate.
- Dark text with readable line height.
- Support multiline content and lists.

### User messages
- Align right.
- Use pale blue/cyan bubbles.
- Dark readable text.
- Optional small user avatar at the right edge.
- Support multiline content.

### Initial welcome state
Show a concise greeting when the panel is first opened and there is no message history:

> Hi! I'm SIS, your Lunar Mission Assistant. I can help you understand the mission analysis, solar conditions, Earth visibility, terrain, and communication results. How can I help?

Do not claim that SIS has already read or analyzed live data unless the real integration exists.

### Suggested prompts
Show compact clickable prompt chips below the welcome message or in the empty state:

- `Explain the Sun analysis`
- `Why is Earth below the horizon?`
- `Explain the terrain results`
- `What does this mean for the rover?`

In this UI-only phase, clicking a suggested prompt may populate the composer. It must not trigger a fake assistant response.

### Preview conversation
If the visual design requires a populated conversation, use a clearly marked **UI preview** conversation. The example conversation may follow the layout of the generated concept:

- User: “Is the selected site suitable for a 4-hour rover mission?”
- SIS: “This is a UI preview. A mission-aware answer will be available after the assistant is connected to the verified mission results and knowledge service.”

Do not copy the concept's example mission conclusions or numerical values as real results.

### Message metadata
- Optional small timestamps may appear below messages.
- Do not imply static sample timestamps represent actual stored conversation history.

## 8. Composer and bottom controls

At the bottom of the panel, provide a control row similar to the approved concept.

### Voice/action row
Show:
- Keyboard/text-mode icon button (optional).
- Microphone button.
- Speaker/audio-output button.

These are visual placeholders only during this phase.

When a placeholder is clicked, show a small, non-intrusive message such as:

`Voice interaction will be connected in a later integration phase.`

Do not:
- Request microphone permission.
- Start recording.
- Connect to LiveKit.
- Play audio.
- Show a false listening or speaking state.

### Text composer
- Rounded input container.
- Placeholder: `Type a message...`
- Send icon button on the right inside the composer.
- Empty composer disables send.
- Support Enter to submit locally and Shift+Enter for a newline if a textarea is used.
- Keep the composer visible while the conversation area scrolls.

Because this phase is UI-only:
- Do not call an LLM or chat endpoint.
- Do not generate fabricated AI responses.
- If the user submits text, either show a clearly labelled local preview message and a truthful notice that live assistant connection is not enabled, or keep send disabled with a clear UI-preview explanation.
- Prefer the local preview behavior only if it does not make the interface appear to be a functioning AI assistant.

## 9. Interaction state

Use local component state for:
- `isOpen`
- `isMinimized` (if modeled separately)
- local preview messages
- composer draft
- optional placeholder notice

Expected interactions:
1. Click SIS launcher → open panel.
2. Click close → hide panel.
3. Click minimize → collapse panel.
4. Click minimized tab/launcher → reopen panel.
5. Click suggested prompt → populate composer.
6. Type in composer → send control becomes enabled when non-empty.
7. Click microphone/speaker placeholder → show the later-integration notice.
8. Scroll conversation → header and composer remain fixed within the panel.

Do not persist messages to a backend or local storage in this phase.

## 10. Responsive behavior

### Wide desktop (≥ 1440 px)
- Preserve the original three-column workspace.
- SIS panel fixed on the right, approximately 350–380 px.
- Panel overlays the far-right area without resizing the workspace.
- Keep the map and mission input fully visible.

### Standard desktop / laptop (1024–1439 px)
- Reduce panel width as needed, approximately 320–360 px.
- Ensure the chat panel does not cover the most important Mission Input controls or map interaction controls.
- If overlay would obscure too much of the Analysis panel, allow the user to close/minimize it easily.

### Tablet (768–1023 px)
- Use a right-side drawer with constrained width.
- Keep the panel within viewport bounds.
- Underlying workspace may be partially obscured while open, but should remain intact when closed.
- Conversation scrolls independently.

### Mobile (< 768 px)
- Use a near-full-screen drawer/modal.
- Respect safe viewport insets.
- Header close button remains visible.
- Composer remains reachable above the on-screen keyboard.
- Avoid horizontal overflow.
- Use full-width message bubbles with sensible margins.

Test these viewport sizes:
- 1920 × 1080
- 1440 × 900
- 1366 × 768
- 1024 × 768
- 768 × 1024
- 390 × 844

## 11. Accessibility

- Use semantic buttons for launcher, minimize, close, send, and voice placeholders.
- Provide accessible names for all icon-only controls.
- Support keyboard navigation and visible focus rings.
- Maintain sufficient text/background contrast.
- Do not use color alone to communicate status.
- Give the conversation region an accessible label, e.g. `SIS conversation`.
- Keep focus behavior sensible when opening and closing the panel.
- Respect reduced-motion preferences.
- Do not rely on hover-only interactions.

## 12. Technical implementation guidance

- Inspect the existing Analysis page and navigation component before editing.
- Reuse the project's current component architecture, styling conventions, icon library, and shadcn/ui primitives.
- Keep SIS launcher and panel in isolated components, for example:
  - `SISLauncher`
  - `SISChatPanel`
  - `SISMessageBubble`
  - `SISComposer`
- Names are suggestions; follow repository naming conventions.
- Mount the launcher in the existing Analysis page navigation slot or the smallest appropriate Analysis-only layout location.
- Scope styles to the Analysis page SIS components. Avoid global CSS changes.
- Use existing Geist typography and current LMP design tokens for the dark workspace; the cream panel may define local component tokens.
- Do not introduce new packages for icons or chat UI.
- Ensure the panel does not cause layout shift in the underlying workspace.

## 13. Future integration boundary

The UI should be structured so a later phase can connect:
- Current typed mission result context.
- Existing RAG/LLM backend.
- Existing LiveKit voice agent.

However, do not implement those connections in this phase.

Future integration requirements remain:
- Build context from the same normalized data used by Mission Analysis/Results.
- Preserve missing, stale, partial, error, and not-evaluated states.
- Use the same conversation history for typed messages and voice transcripts.
- Use the same scope-of-expertise policy for text and voice.
- Refuse out-of-scope or unsupported questions rather than inventing answers.
- Keep all provider secrets server-side.

## 14. Acceptance checklist

### Launcher and navigation
- [ ] SIS launcher appears at the far right of the Analysis page top navigation.
- [ ] Existing navigation items and actions remain unchanged.
- [ ] Launcher has hover, active, and keyboard-focus states.
- [ ] Clicking launcher opens the panel.
- [ ] Closing/minimizing restores the launcher state.

### Panel appearance
- [ ] Panel matches the approved warm cream/off-white reference.
- [ ] Panel is right-anchored and positioned below the navigation.
- [ ] Header shows SIS Assistant, subtitle, truthful UI-preview status, minimize and close.
- [ ] Panel uses rounded corners, subtle border, and soft shadow.
- [ ] Panel remains inside viewport bounds.
- [ ] Existing workspace columns are not resized or redesigned.

### Conversation
- [ ] SIS messages align left.
- [ ] User messages align right.
- [ ] Message area scrolls independently.
- [ ] Welcome state and suggested prompts appear.
- [ ] Sample conversation is clearly labelled UI preview.
- [ ] No fake live AI response is generated.
- [ ] Suggested prompt chips populate the composer.

### Controls
- [ ] Text composer and send control are visible.
- [ ] Send is disabled when empty.
- [ ] Microphone and speaker placeholders are visible.
- [ ] Placeholder controls do not request permissions or connect to services.
- [ ] Placeholder notice accurately explains that voice is not yet connected.

### Responsive and accessibility
- [ ] 1920×1080 verified.
- [ ] 1440×900 verified.
- [ ] 1366×768 verified.
- [ ] 1024×768 verified.
- [ ] 768×1024 verified.
- [ ] 390×844 verified.
- [ ] No horizontal overflow.
- [ ] Keyboard navigation and focus states work.
- [ ] Icon-only controls have accessible labels.
- [ ] Reduced-motion preference is respected.

### Regression and scope
- [ ] Mission Input panel unchanged.
- [ ] Lunar Map and its interactions unchanged.
- [ ] Mission Analysis cards/data/calculations unchanged.
- [ ] Existing navigation actions unchanged.
- [ ] Results page unchanged.
- [ ] Background components unchanged.
- [ ] No backend changes.
- [ ] No LLM/RAG/context-injection code added.
- [ ] No LiveKit connection or microphone/audio implementation added.
- [ ] No new dependency added.
- [ ] No unrelated global styles changed.

## 15. Required implementation report

After implementation, report:
1. Files created and modified.
2. Exact Analysis page location where the SIS launcher is mounted.
3. Open, close, and minimize behavior.
4. Desktop/tablet/mobile screenshots.
5. Accessibility verification.
6. Lint, type-check, tests, and build results.
7. Explicit confirmation that this phase is UI-only.
8. Explicit confirmation that Mission Input, Lunar Map, Mission Analysis, Results, and all backend/voice services remain unchanged.

Do not claim completion without actual browser verification.

---

## Final instruction to the coding agent

Implement the SIS launcher in the Analysis page's top-right navigation and the right-anchored warm cream SIS Assistant panel shown in the approved reference concept. Preserve the existing three-column Mission Input / Lunar Map / Mission Analysis workspace exactly. Build the complete visible chatbot UI and local open/close/minimize interactions only. Do not connect the LLM, RAG, mission context, microphone, or LiveKit in this phase. Verify the implementation at the specified viewport sizes and provide screenshots and a changed-file report.
