# Debug Specification — Replace Existing Background with `Horizon.jpg`

## Objective

Replace the existing animated/background component's current visual source with the static image `Horizon.jpg`.

The expected result is a full-viewport webpage background using the exact supplied image while preserving all existing UI layouts, interactions, animations, and functionality.

## 1. Image source

Developer's local source path:

```text
C:\Users\hp\OneDrive\Desktop\Lunar Landing\asset\Horizon.jpg
```

Copy the exact image into the project's existing public/static asset directory. If the project has no established convention, use:

```text
public/images/Horizon.jpg
```

Reference it in browser code using a browser-accessible path, for example:

```text
/images/Horizon.jpg
```

**Do not put the Windows absolute filesystem path in frontend code.**

Before implementation, verify that the source file exists. If it cannot be found, stop and report the missing asset. Do not silently substitute another image.

## 2. Locate the existing background component

1. Inspect the project structure and identify the existing animated/background component currently used by the webpage.
2. Trace where that component is mounted and which page/layout consumes it.
3. Identify the exact source of the current background (video, animation, image, or CSS).
4. Reuse the existing component and its placement. Do not create a second background layer.
5. Keep the change isolated to the background component and the minimum asset wiring required.

## 3. Required implementation

Replace the existing background source with the static `Horizon.jpg` image.

For a CSS background implementation, use the equivalent of:

```css
background-image: url("/images/Horizon.jpg");
background-size: cover;
background-position: center;
background-repeat: no-repeat;
```

The background must cover the viewport:

```css
width: 100vw;
height: 100vh;
```

If the existing component is positioned as a fixed viewport background, preserve that behavior and ensure it remains behind the existing page content. Prefer the component's current positioning model rather than changing unrelated layout rules.

### Layering requirements

- Keep the background behind all existing UI components.
- Preserve the existing stacking context and z-index relationships wherever possible.
- The background must not intercept pointer or keyboard interactions.
- Do not place the background above navigation, cards, dialogs, menus, or other interactive elements.
- Do not add overlays, filters, gradients, brightness changes, or visual effects unless they already exist and are necessary to preserve current behavior.

### Image rendering requirements

- Use `background-size: cover` as specified.
- Use centered positioning.
- Disable repetition.
- Preserve the image's aspect ratio; do not apply non-uniform width/height stretching.
- Understand that `cover` may crop portions of the image depending on viewport aspect ratio. This is expected behavior for the requested full-viewport cover treatment.
- Do not distort the page or scale the foreground UI to compensate for image cropping.

## 4. Strict scope and constraints

### Allowed changes

- Locate and edit the existing background component.
- Copy `Horizon.jpg` into the project's public/static asset directory.
- Replace the old background source with the new local asset path.
- Make only the minimum background-specific adjustment needed for full-viewport coverage and correct stacking.
- Add or update a focused test/check for the asset path or background component if the project already has an appropriate test setup.

### Do not change

- Page layouts, dimensions, or responsive structure.
- Navigation, routing, headers, footers, cards, panels, or dialogs.
- Existing UI interactions or component behavior.
- Existing foreground animations or transitions.
- Mission calculations, data, APIs, or backend code.
- SIS chatbot UI or its future integrations.
- LiveKit, RAG, or LLM infrastructure.
- Global styles unrelated to the background.
- Other page backgrounds or the separate backgrounds of unrelated components.
- Dependencies or package versions.

Do not redesign the webpage.

## 5. Implementation procedure

1. Inspect the repository and locate the existing background component.
2. Identify the page/layout where it is used.
3. Find and verify the exact `Horizon.jpg` source file.
4. Record the source image's file format, native dimensions, and file size.
5. Copy the image unchanged into the public/static asset directory.
6. Confirm the copied file is a valid image and retains the source dimensions.
7. Replace only the existing background source with the public asset URL.
8. Apply the requested full-viewport sizing, centered positioning, no-repeat behavior, and background layering.
9. Confirm the previous animated background is no longer rendered by this component.
10. Confirm no duplicate background layer is introduced.
11. Run the validation checks below.
12. Review the final diff to confirm unrelated files and functionality were not changed.

## 6. Validation checklist

### Asset validation

- [ ] Exact source file `Horizon.jpg` exists.
- [ ] Source file is a valid JPEG.
- [ ] Source image dimensions and file size are recorded.
- [ ] Public/static copy exists at the chosen project path.
- [ ] Copied image retains the source dimensions.
- [ ] Browser-accessible asset path resolves successfully.
- [ ] Image loads without a broken asset request.

### Rendering validation

- [ ] Background uses `Horizon.jpg`.
- [ ] Background covers the full viewport (`100vw × 100vh`).
- [ ] `background-size: cover` is applied.
- [ ] `background-position: center` is applied.
- [ ] `background-repeat: no-repeat` is applied.
- [ ] Image aspect ratio is preserved without non-uniform stretching.
- [ ] Cropping caused by `cover` is acceptable and does not indicate distortion.
- [ ] No duplicate or tiled image appears.
- [ ] Background remains behind all existing UI components.
- [ ] Background does not intercept user interaction.

### Responsive validation

Verify the page at these viewport sizes:

- [ ] 1920 × 1080
- [ ] 1600 × 900
- [ ] 1440 × 900
- [ ] 1366 × 768
- [ ] 1024 × 768
- [ ] 768 × 1024
- [ ] 390 × 844

At each size, confirm:
- The background fills the viewport.
- The image remains centered.
- No repetition or non-uniform stretching occurs.
- Existing UI remains visible and usable.
- No horizontal overflow is introduced by the background component.

### Regression validation

- [ ] Existing UI layout is unchanged.
- [ ] Existing interactions remain functional.
- [ ] Existing foreground animations remain functional.
- [ ] Navigation, cards, dialogs, and menus remain visible and usable.
- [ ] No unrelated component or global style was modified.
- [ ] No backend file or API was modified.
- [ ] No new dependency was introduced.
- [ ] No browser console errors are attributable to this change.
- [ ] No failed image/network request occurs.

## 7. Evidence required

Provide the following implementation evidence:

1. Exact background component file modified.
2. Exact public asset path used.
3. Confirmation that the original `Horizon.jpg` was copied and loaded.
4. Source image dimensions and file size.
5. Browser screenshots at 1920 × 1080, 1366 × 768, and 390 × 844.
6. Confirmation of full-viewport coverage and centered, non-repeating rendering.
7. Summary of the final changed-file list.
8. Confirmation that unrelated UI, interactions, animations, and backend functionality were not changed.
9. Console/network validation results.

## 8. Completion criteria

Report **`BACKGROUND REPLACEMENT: VERIFIED`** only when:

- The exact `Horizon.jpg` asset is used.
- The image loads successfully in the browser.
- It covers the full viewport using the requested cover/center/no-repeat behavior.
- It remains behind all existing UI.
- Existing layouts, interactions, animations, and functionality are preserved.
- Responsive checks and regression checks pass.
- Evidence listed above is provided.

If any check cannot be performed or fails, report `PARTIAL` or `NOT VERIFIED` and identify the exact outstanding issue. Do not claim successful verification based only on code inspection.

---

## Final instruction to the coding agent

Make one isolated change: replace the current background source in the existing background component with the exact `Horizon.jpg` asset. Apply full-viewport `cover`, centered positioning, and no-repeat rendering. Preserve all existing UI, interactions, animations, and functionality. Do not modify anything unrelated. Complete the validation checklist and provide evidence before marking the task verified.
