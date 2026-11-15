# Phase 20 — Results Page Background Replacement: `Horizon.jpg`

## Objective

Replace **only the existing Results page background image** with the new approved image:

`C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\Horizon.jpg`

The attached reference image in this task is the visual source of truth for the intended background appearance. It depicts:
- A deep, star-filled night sky.
- A large luminous golden celestial arc/ring sweeping across the upper sky.
- A bright horizon glow behind layered clouds.
- A lone astronaut standing near the center of the horizon.
- A reflective dark foreground with a long golden light reflection extending toward the viewer.
- A cinematic dark teal, charcoal, and warm gold color palette.

The replacement must preserve and display the complete composition and all major visual details of the supplied `Horizon.jpg` image in the Results page background component.

**Strict scope:** Do not edit anything other than the Results page background component and the minimum asset wiring required to replace its image source. Do not alter page layout, cards, navigation, mission results, typography, overlays unrelated to the background, SIS, LiveKit, APIs, calculations, or any other component.

---

## 1. Strict change boundary

### Allowed changes
- Copy the supplied `Horizon.jpg` into the project's public/static asset directory.
- Change the Results page background component's image source from the previous image to `Horizon.jpg`.
- Adjust background-only CSS properties necessary to preserve the complete image composition and display it at a suitable resolution.
- Adjust background-only positioning, sizing, and rendering behavior.
- Remove the previous background image reference from this Results background component.
- Add or update tests/checks that verify the background asset and rendering.

### Forbidden changes
Do not change:
- Results page layout or container dimensions.
- Power Situation or Terrain & Communication cards.
- Result values, labels, statuses, or legend.
- Navigation or routing.
- Page heading or subtitle.
- SIS assistant or conversation UI.
- RAG/LLM integration.
- LiveKit integration or voice behavior.
- Backend endpoints or data models.
- Scientific calculations, APIs, or result state.
- Global typography, global CSS, or unrelated shared components.
- Any background component on other pages.
- The separate looping video background component.
- Existing card opacity, card blur, card colors, or card z-index, unless a background-only stacking correction is essential to show the new image without affecting card styling.

Do not use the attached preview as the production asset if the exact `Horizon.jpg` exists at the provided Windows source path. The preview is a visual reference; the specified local asset is the implementation source.

---

## 2. Asset installation

### Source
`C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\Horizon.jpg`

### Public asset
Prefer the project's existing public asset convention. If there is no established convention, copy the image to:

`public/images/Horizon.jpg`

Use a browser-safe URL such as:

`/images/Horizon.jpg`

Never reference the Windows absolute path in browser/client code.

### Asset verification before styling
Before implementing:
1. Confirm the source file exists in the developer's project.
2. Confirm the file is a valid JPEG.
3. Record its actual pixel dimensions and aspect ratio.
4. Record its file size.
5. Copy it without recompressing or resizing the original.
6. Confirm the copied file has matching dimensions and a valid JPEG signature.
7. Confirm the public URL returns HTTP 200 in the running application.
8. Confirm the browser decodes the image successfully.

If the source file cannot be found, stop and report that the exact requested asset is unavailable. Do not silently substitute the attached preview, `Final.jpg`, or another image.

---

## 3. Background component implementation

Inspect the existing Results page background component and its current image-loading mechanism. Reuse that component; do not create a second competing background layer.

Change only the image source to the new public asset URL.

### Required rendering behavior
- The image must fill the Results page background area.
- Preserve the original image aspect ratio.
- Do not stretch the image non-uniformly.
- Avoid tiling/repetition.
- Avoid pixelation caused by upscaling a low-resolution asset.
- Keep the image stable during page scrolling and resizing according to the existing component's intended behavior.
- Maintain the current background component stacking order so foreground UI remains above the image.
- Do not apply CSS transforms to the entire page to compensate for background cropping.
- Do not change any foreground component dimensions.

### Composition preservation
The following visual elements must remain identifiable in the desktop Results background:
1. Star-filled upper sky.
2. Large golden arc/ring.
3. Bright clouded horizon.
4. Astronaut figure near the horizon center.
5. Reflective foreground.
6. Golden reflection extending into the foreground.

Because the source is portrait-oriented, a normal `background-size: cover` on a widescreen desktop will crop substantial parts of the top/bottom composition. Do not blindly use `cover` if it removes the astronaut, horizon, arc, or reflection.

Evaluate the following background-only strategies and choose the one that preserves the most important composition at the target viewport:

**Preferred strategy A — full-image containment with background fill**
- Render the full portrait image with `background-size: contain` or an equivalent image layer that preserves the entire image.
- Fill the unused horizontal space with a sampled/derived dark complementary background color or a subtle background-only extension.
- Keep the image centered and fully visible.
- Avoid visible seams or abrupt vertical bands.

**Alternative strategy B — dedicated image layer with controlled crop**
- Use an absolutely positioned background image layer.
- Use `object-fit: contain` where possible.
- Keep the complete image visible at desktop if the viewport permits.
- If cropping is unavoidable, select `object-position` so the golden arc, horizon, astronaut, and reflection remain visible.
- Do not crop out the astronaut or the key horizon/reflection region.

**Alternative strategy C — responsive positioning**
- At wide desktop aspect ratios, preserve as much of the portrait composition as possible and fill side space tastefully.
- At narrower tablet/mobile aspect ratios, use the source image more fully with a suitable focal point.
- Use CSS media queries scoped only to the Results page background component.

Do not create or generate a replacement image. Use the exact `Horizon.jpg` source asset.

### Background brightness and overlays
- Preserve the source image's native visual tone and warm gold highlights.
- Do not add a heavy dark overlay that hides the star field, ring, clouds, astronaut, or reflection.
- Do not apply a brightness filter that clips the golden highlights or washes out the stars.
- If the current background component has a dark overlay, inspect its opacity and reduce it only if necessary for the requested image to remain clearly visible.
- Any overlay adjustment must be scoped to the background component only.
- Keep foreground card styling unchanged.

---

## 4. Resolution and aspect-ratio handling

The source is portrait-oriented. The implementation must intentionally handle desktop and mobile viewports rather than stretching the source to match every screen.

### Required viewport checks
Test at:
- 1920 × 1080
- 1600 × 900
- 1440 × 900
- 1366 × 768
- 1024 × 768
- 768 × 1024
- 390 × 844

For each viewport:
- Record the viewport dimensions.
- Record the rendered image layer dimensions.
- Record the chosen fit mode (`contain`, `cover`, or controlled image element sizing).
- Record the computed image focal position.
- Confirm whether the complete image is visible or intentionally cropped.
- Identify which key composition elements remain visible.

### Quality requirements
- No non-uniform distortion.
- No unintended stretching.
- No repeated/tiled image.
- No unexpected blank background.
- No visible seam at the image boundary.
- No low-resolution blur from unnecessary upscaling.
- No page-wide horizontal overflow caused by the background layer.
- Foreground cards and text remain readable.
- The background does not intercept pointer events (`pointer-events: none` where applicable).

### Important distinction
Do not claim that the full source image is visible at every viewport if the CSS uses `cover` and crops it. The verification report must state the actual behavior and the visible composition for each tested aspect ratio.

---

## 5. Performance and loading

- Use the project's existing image loading strategy.
- Avoid loading duplicate copies of the same background.
- Use an appropriate preload or priority mechanism only if the current framework supports it and it materially improves initial rendering.
- Keep the background layer decorative and non-interactive.
- Avoid layout shift while the image loads.
- Provide a restrained fallback background color while loading or if the asset fails.
- Do not use an external image URL.
- Do not add a new image dependency.

---

## 6. Implementation sequence

1. Inspect the current Results page background component and locate the existing image source.
2. Locate the exact `Horizon.jpg` source asset in the project environment.
3. Verify its format, pixel dimensions, aspect ratio, and file size.
4. Copy the exact file into the public asset directory without altering the image.
5. Verify the copied asset matches the source dimensions and can be decoded.
6. Change only the Results background component's image source.
7. Evaluate portrait-to-landscape rendering behavior.
8. Implement a background-only fit and positioning strategy that preserves the full composition as much as practical.
9. Adjust background-only overlay opacity only if required.
10. Verify all six key visual elements.
11. Test the seven specified viewport sizes.
12. Verify that no unrelated files/components changed.
13. Run relevant lint/type-check/build checks if the project's workflow requires them.
14. Capture before/after screenshots for the Results page at 1920×1080 and 1366×768, plus one mobile viewport.
15. Produce the verification report described below.

---

## 7. Verification requirements — must be evidence-based

The implementation is **not confirmed** merely because the code references `/images/Horizon.jpg`.

Mark the background as verified only after all required checks pass.

### Asset checks
- [ ] Exact source `Horizon.jpg` found.
- [ ] Source is a valid JPEG.
- [ ] Source pixel dimensions recorded.
- [ ] Source aspect ratio recorded.
- [ ] Public copy has matching pixel dimensions.
- [ ] Public URL returns HTTP 200.
- [ ] Browser successfully decodes the image.
- [ ] No fallback/substitute image is being displayed.

### Visual composition checks
- [ ] Star-filled sky is visible.
- [ ] Golden celestial arc/ring is visible.
- [ ] Bright clouded horizon is visible.
- [ ] Astronaut is visible.
- [ ] Reflective foreground is visible.
- [ ] Golden reflection is visible.
- [ ] Image has not been non-uniformly stretched.
- [ ] Cropping behavior is documented honestly.
- [ ] No excessive overlay hides the image.
- [ ] Background remains behind all page content.

### Resolution checks
- [ ] 1920×1080 verified.
- [ ] 1600×900 verified.
- [ ] 1440×900 verified.
- [ ] 1366×768 verified.
- [ ] 1024×768 verified.
- [ ] 768×1024 verified.
- [ ] 390×844 verified.
- [ ] No horizontal overflow caused by background.
- [ ] No unexpected blank strips or tiling.
- [ ] No obvious pixelation or image distortion.

### Scope checks
- [ ] Only the Results page background component and required asset wiring changed.
- [ ] Results page layout unchanged.
- [ ] Power Situation card unchanged.
- [ ] Terrain & Communication card unchanged.
- [ ] Navigation unchanged.
- [ ] Mission result values and statuses unchanged.
- [ ] SIS and LiveKit unchanged.
- [ ] Other pages and video background component unchanged.
- [ ] No scientific/backend behavior changed.

---

## 8. Required final verification report

Return a report with these fields:

| Verification item | Required evidence |
|---|---|
| Source asset | Exact path and confirmation it was found |
| Image format | JPEG decode verification |
| Native resolution | Actual width × height |
| Aspect ratio | Actual ratio |
| File size | Actual size |
| Public asset URL | URL and HTTP status |
| Desktop screenshots | 1920×1080 and 1366×768 |
| Mobile screenshot | 390×844 |
| Fit strategy | `contain`, `cover`, or controlled image layer |
| Crop details | Which image areas are visible/cropped at each viewport |
| Composition | Status of sky, ring, horizon, astronaut, foreground, reflection |
| Scope | List of changed files and confirmation unrelated UI was untouched |
| Final status | PASS / PARTIAL / FAIL with reasons |

### Completion rule

Only report:

**`BACKGROUND IMPLEMENTATION: VERIFIED`**

if:
- The exact `Horizon.jpg` was used.
- The public asset loads successfully.
- The required composition is visibly preserved at the tested target resolutions.
- The image is not distorted.
- The Results page foreground and all unrelated application behavior remain unchanged.
- The evidence-based checklist is complete.

If any item cannot be tested, report `NOT VERIFIED` or `PARTIAL`; do not claim completion.

---

## 9. Final instruction to the coding agent

This is a strictly isolated background replacement task.

**Replace the previous Results page background with the exact `Horizon.jpg` asset. Preserve the full visual composition as much as possible across desktop and mobile resolutions. Verify the real browser rendering with screenshots and asset checks. Do not edit anything else. Do not mark the task complete until the verification evidence is available.**
