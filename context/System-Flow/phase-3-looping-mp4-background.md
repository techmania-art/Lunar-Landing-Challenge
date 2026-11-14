# Phase 3 — Analysis Page Looping MP4 Background

## Objective

Implement a decorative, continuously looping MP4 background on a SEPARATE Analysis page in the Lunar Mission Planner. This video is for the analysis page only; do not replace or alter the Phase 2 landing/input page background. Use the exact passive HTML video approach specified by the project owner. Do not use Canvas, WebGL, animation frameworks, or interactive animation controls.

The video must:
- Play automatically where browser policy permits.
- Be muted.
- Loop continuously.
- Play inline on mobile.
- Fill the viewport behind all application content.
- Never intercept clicks, touch, keyboard, or scrolling.
- Have a static lunar-image fallback.

## 1. Inspect before changing anything

1. Read `context/AGENTS.md` and relevant project context.
2. Inspect the existing Next.js project, package scripts, dependencies, CSS tokens, and lockfile.
3. Inspect the Phase 2 landing page and existing `LandingBackground` component.
4. Search the repository for suitable existing MP4 assets.
5. Preserve the existing landing page, form fields, validation, and Phase 2 behavior.
6. Do not rebuild the page or install a second UI library.

## 2. Acquire the MP4 asset

The project owner's source file is:

```text
C:\\Users\\hp\\OneDrive\\Desktop\\Lunar Landing\\asset\\flow.mp4
```

This is a local Windows path. The coding agent must run on the same computer (or have access to that filesystem) to read it. Verify that the file exists before attempting to copy it. Do not assume this path is accessible from a remote build environment.

Copy the original file into the project without modifying or deleting the source. Use this destination:

```text
public/animations/analysis-background.mp4
```

The analysis page should reference it as:

```text
/animations/analysis-background.mp4
```

Required local path:

```text
public/animations/analysis-background.mp4
```

Find an existing suitable video first. If none exists, download a suitable lunar/space video from a reputable source that explicitly permits the intended use. Check the individual asset's license and attribution requirements; do not assume all NASA-hosted assets are automatically free of restrictions.

Desired visual properties:
- Cinematic lunar/space scene fitting the existing background.
- Deep navy sky and, if available, lunar terrain/Earth imagery.
- Subtle motion that does not distract from the form.
- No text, watermarks, logos, or embedded UI.
- A seamless or visually unobtrusive loop.

After download:
- Verify the file is genuinely an MP4 video, not an HTML error page or image with a renamed extension.
- Prefer browser-compatible H.264 video.
- Check dimensions, duration, codec, and file size.
- Optimize only if necessary and if a suitable local tool such as FFmpeg is already available.
- Do not depend on a third-party hotlink at runtime; serve the local file from `/animations/background.mp4`.
- Record source URL, provider/creator, license, and required attribution in `public/animations/ASSET-CREDITS.md`.

If no network access or suitable licensed asset is available, do not invent a source or create a fake video. Keep the existing static image background working and report the blocker and required asset.

## 3. Reusable background component

Implement or update:

```text
components/landing/landing-background.tsx
```

Use existing project conventions. Reference behavior:

```tsx
export default function LandingBackground() {
  return (
    <div className="animated-bg" aria-hidden="true">
      <video autoPlay muted loop playsInline preload="metadata">
        <source
          src="/animations/analysis-background.mp4"
          type="video/mp4"
        />
      </video>
    </div>
  );
}
```

Preserve these requirements:
- `autoPlay`, `muted`, `loop`, and `playsInline`.
- No controls, audio, focusability, or event handlers.
- `aria-hidden="true"` for decorative media.
- No React state or playback controls are needed.
- If video fails, the existing static lunar background must remain visible.

Do not add a video-player package. Native HTML video is sufficient.

## 4. CSS and visual blending

Use the existing CSS architecture and theme tokens. Example positioning:

```css
.animated-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.animated-bg video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}

.app-content {
  position: relative;
  z-index: 1;
}
```

Adapt class names and styles to the current codebase. Avoid negative z-index values that place the video behind the document body.

Layer order:
1. Video background.
2. Gradient overlay.
3. Navigation, hero, feature highlights, and mission configuration card.

Blend the video naturally into the existing dark navy landing page:
- Use a deep navy upper gradient to integrate with the sky.
- Add a subtle left-side gradient behind hero text.
- Add restrained right-side shading or card shadow around the mission form.
- Use a lower gradient only if needed.
- Preserve lunar terrain and Earth details; do not apply an opaque dark overlay over the entire video.
- Keep the mission configuration card bright and readable, with its existing light input surfaces, labels, borders, and focus states.

Centralize overlay values in CSS variables or existing semantic tokens. Avoid scattered arbitrary color values.

## 5. Integrate with a separate Analysis page

- Identify the existing analysis page route or create the route that matches the repository's established App Router conventions.
- Render the analysis background component only within the Analysis page/layout.
- Do not render this video on the Phase 2 landing/input page.
- Do not replace the landing page's existing lunar background image or its background component.
- Keep all Analysis page content above the video.
- Retain a suitable static fallback image for the Analysis page. If no separate fallback asset exists, use a neutral dark gradient fallback and report that no image fallback was supplied for this page.
- Do not duplicate video elements in nested components.
- Prevent layout shifts while the video loads.
- Keep the video decorative and non-interactive.
- Preserve existing analysis page functionality and do not fabricate scientific results.

Suggested component boundary:

```text
components/
  analysis/
    analysis-background.tsx
```

If the current app has no Analysis page yet, create only a minimal page shell needed to demonstrate and verify this background. Do not invent analysis data or scientific calculations.

## 6. Accessibility and reduced motion

Respect `prefers-reduced-motion: reduce`. When enabled, hide or suppress the video and show the static lunar background image. Do not merely slow the video down.

Keep the page usable if:
- Video loading fails.
- The codec is unsupported.
- Autoplay is blocked.
- The browser/device has constrained media support.

Do not claim autoplay is guaranteed on every browser. The static fallback must always work.

## 7. Performance

- Serve the asset locally from the Next.js `public` directory.
- Choose `preload` deliberately; `metadata` is a sensible default for a large background video.
- Ensure video loading does not block initial page rendering.
- Avoid layout shifts.
- Ensure muted playback and inline mobile playback.
- Ensure the background cannot intercept clicks, touch, or scrolling.
- Check console errors and failed network requests.

## 8. Testing and verification

Use test tools already configured in the repository. Do not install duplicate frameworks.

Run the available:
- ESLint.
- TypeScript check.
- Unit/component tests.
- Production build.

Use actual `package.json` scripts; report missing scripts rather than claiming they passed.

Component checks:
- Exactly one video element is rendered.
- Source is `/animations/background.mp4`.
- `autoPlay`, `muted`, `loop`, and `playsInline` are present.
- No controls or interaction handlers exist.
- Decorative element is hidden from assistive technology.
- Static fallback remains available.

Playwright/browser checks, if configured:
1. Load the landing page.
2. Confirm the video element and source exist.
3. Confirm the local asset responds successfully.
4. Check muted/loop/inline attributes.
5. Verify playback state where the browser environment supports media playback.
6. Confirm hero and form render above the video.
7. Click and type into all mission inputs.
8. Submit valid and invalid sample data.
9. Confirm video does not block clicks or scrolling.
10. Test mobile viewport.
11. Test reduced-motion preference and verify static fallback.
12. Check browser console and failed requests.

A headless browser may not fully decode/play video. Clearly distinguish asset/metadata verification from actual playback verification. Do not claim playback works if only the video element rendered.

Visual screenshots to inspect:
- Desktop: approximately 1672 × 941.
- Tablet: approximately 1024 × 768.
- Mobile: approximately 390 × 844.

Check video crop, natural gradient blending, readable hero text, bright form card, responsive layout, and absence of unexpected overflow.

## 9. Scope boundaries

In scope:
- Find/download a suitable licensed MP4.
- Record asset credits and license.
- Store local MP4 under `public/animations/`.
- Reusable HTML video background component.
- Gradient overlays and layer order.
- Static image fallback and reduced-motion support.
- Responsive, performance, and accessibility checks.
- Tests and verification.

Out of scope:
- Canvas/WebGL.
- Interactive animation controls.
- Audio.
- Rebuilding the landing page.
- Changing mission form or validation.
- Lunar science APIs/calculations.
- Authentication or user accounts.

## 10. Completion criteria

- [ ] Existing project, Phase 2 landing page, and Analysis page/route inspected.
- [ ] Analysis video is isolated to the separate Analysis page and does not appear on the landing page.
- [ ] Suitable MP4 found/downloaded and license/source recorded.
- [ ] `public/animations/analysis-background.mp4` is a valid video.
- [ ] Codec, dimensions, duration, and file size checked.
- [ ] Reusable `LandingBackground` component implemented.
- [ ] `autoPlay`, `muted`, `loop`, and `playsInline` are present.
- [ ] Video is fixed, full-screen, and `pointer-events: none`.
- [ ] Page content is layered above the video.
- [ ] Gradients blend the scene naturally.
- [ ] Form remains readable and functional.
- [ ] Static image fallback works.
- [ ] Reduced-motion preference is respected.
- [ ] Desktop, tablet, and mobile layouts checked.
- [ ] Asset loading and actual playback are verified separately.
- [ ] Lint, type-check, tests, and build pass, or failures are documented.
- [ ] No unnecessary video-player or animation dependencies added.

## 11. Required completion report

Report:
1. MP4 source/provider and license.
2. Asset path, dimensions, duration, codec, and file size.
3. Files created/modified, including the separate Analysis page route and background component.
4. Component integration details.
5. Gradient, fallback, and reduced-motion behavior.
6. Tests and commands run with results.
7. Viewports/browser environments tested.
8. Whether actual playback was verified or only asset loading.
9. Blockers and remaining limitations.

Do not claim the MP4 was downloaded, integrated, or verified unless those actions were actually completed.
