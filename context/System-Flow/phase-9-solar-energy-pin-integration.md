# Phase 9 — Solar Energy Lightning Pin Integration

## 1. Objective

Implement the approved cyan lightning pin inside the existing **Solar Energy card** in the Mission Input panel.

The pin must use the same visual configuration approved in the final Phase 8 frontend preview:
- Compact rounded-square badge.
- Dark navy/blue badge background.
- Bright cyan lightning bolt.
- Stronger cyan outer glow and soft inner glow.
- Approximately 36 × 36 px badge, with a 23 × 25 px bolt.
- Glow should be visible but must not overpower the Solar Energy heading or surrounding UI.

**This phase is strictly limited to adding the pin to the existing Solar Energy card.**

## 2. Strict scope restriction — do not change anything else

Do not redesign, refactor, restyle, rename, relocate, or otherwise modify any other component, page, route, layout, API, data model, mission workflow, or background effect.

In particular:
- Do not modify Mission Input fields or their behavior.
- Do not modify the Compare Location section.
- Do not modify the Solar Energy form fields, validation, accordion behavior, or state management.
- Do not modify the right-hand Mission Analysis panel.
- Do not modify the center lunar map.
- Do not modify the existing lunar background video or any other animation.
- Do not change the existing lightning animation implementation from Phase 8.
- Do not add dependencies or packages.
- Do not change global CSS, theme tokens, typography, spacing, or shared design-system components.
- Do not move the pin to another page or panel.

Only make the smallest local change needed to render the pin inside the existing Solar Energy card heading. If the exact Solar Energy component or styles cannot be located, stop and report the blocker rather than creating a duplicate card or changing another component.

## 3. Pin placement

Place the pin immediately to the left of the existing **Solar Energy** title, within the existing card/accordion heading row.

Expected heading arrangement:

```text
[ CYAN LIGHTNING PIN ]  Solar Energy                  [ OPTIONAL ]
                        Solar power configuration
                        and analysis
```

Requirements:
- Keep the existing heading text, subtitle, optional badge, alignment, and interactions unchanged.
- The pin must be decorative and must not be clickable.
- It must not change the accordion trigger's accessible name or behavior.
- Use `aria-hidden="true"` for the decorative icon/container.
- Prevent the pin from shrinking in narrow layouts (`flex-shrink: 0` or equivalent).
- Preserve existing keyboard focus behavior for the accordion trigger.

## 4. Approved visual configuration

Use the following local CSS values as the starting point. Scope selectors to the Solar Energy pin only; do not add global selectors or alter existing shared styles.

```css
.solar-pin {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border: 1px solid #36eaff;
  border-radius: 10px;
  background: linear-gradient(145deg, #103849, #071b29);
  box-shadow:
    0 0 9px rgba(0, 220, 255, 0.62),
    0 0 21px rgba(0, 200, 255, 0.44),
    0 0 34px rgba(0, 200, 255, 0.21),
    inset 0 0 12px rgba(0, 220, 255, 0.22);
}

.solar-pin svg {
  width: 23px;
  height: 25px;
  fill: #65f3ff;
  stroke: #e0fdff;
  stroke-width: 1;
  stroke-linejoin: round;
  filter:
    drop-shadow(0 0 4px #00dfff)
    drop-shadow(0 0 8px #00cfff)
    drop-shadow(0 0 12px rgba(0, 210, 255, 0.8));
}
```

Use this SVG bolt shape (or an exactly equivalent existing project icon if it produces the same silhouette and visual result):

```tsx
function SolarEnergyPin() {
  return (
    <span className="solar-pin" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M13.2 2.8 5.8 13h5.1l-.7 8.2L18.5 10h-5.2l-.1-7.2Z" />
      </svg>
    </span>
  );
}
```

Adapt syntax to the project's existing component conventions. Do not create a new icon dependency.

## 5. Implementation instructions

1. Read the project's `AGENTS.md` and all mandatory context files before editing.
2. Read the Phase 8 specification and inspect the existing Solar Energy card/component.
3. Identify the exact heading row currently rendering the Solar Energy title.
4. Add the pin immediately before the title, preserving all existing siblings and props.
5. Add only locally scoped pin styling. Prefer the existing component styling approach (CSS module, Tailwind classes, or co-located styles) rather than introducing a new styling convention.
6. Do not replace or rewrite the Solar Energy card.
7. Do not change the existing lightning canvas animation. The pin is a static decorative sticker; it is separate from the card's lightning animation.
8. Do not change any scientific calculations or mission input/API payloads.

## 6. Acceptance criteria

- [ ] The approved cyan lightning pin appears inside the existing Solar Energy card heading.
- [ ] Pin placement is immediately left of the Solar Energy title.
- [ ] Pin appearance matches the approved size, bolt shape, cyan brightness, and glow configuration.
- [ ] The pin remains visually restrained and does not obscure text or controls.
- [ ] The pin is decorative (`aria-hidden`) and not interactive.
- [ ] Existing Solar Energy accordion behavior and form values are unchanged.
- [ ] Every component outside the Solar Energy heading remains unchanged.
- [ ] No dependency/package was added.
- [ ] No global styles or theme tokens were changed.
- [ ] Existing Phase 8 lightning animation remains unchanged.
- [ ] Desktop and mobile layouts show no overlap or horizontal overflow.

## 7. Regression checks

Before implementation, inspect the current working tree and record its state. After implementation:
- Review the diff and verify every changed line is necessary for the pin.
- Confirm no unrelated component, page, route, API, state, or style file was changed.
- Run the project's relevant lint and TypeScript checks.
- Run the production build if practical.
- Open the page in a browser and visually compare the Solar Energy card before and after.
- Verify the pin at desktop and mobile widths.
- Verify the accordion still opens/closes and existing form inputs remain functional.

If unrelated changes already exist in the working tree, do not overwrite or revert them. Keep the Phase 9 change isolated and report any uncertainty.

## 8. Completion report

Report:
1. Exact file(s) changed.
2. Confirmation that only the Solar Energy heading was modified.
3. Confirmation that the pin matches the approved visual configuration.
4. Confirmation that all other components and the Phase 8 lightning animation were left unchanged.
5. Tests/checks actually run and their results.
6. Any blocker or visual difference that remains.

Do not claim Phase 9 is complete until the pin is visible in the actual application and the regression checks have been performed.
