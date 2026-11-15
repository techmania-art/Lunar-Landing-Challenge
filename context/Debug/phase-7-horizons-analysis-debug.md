# Phase 7 Debug Report — JPL Horizons Results Not Reaching Mission Analysis Cards

**Project:** Lunar Mission Planner  
**Affected phase:** Phase 7 — JPL Horizons response integration into the right-hand Mission Analysis panel  
**Evidence reviewed:** User-provided Mission Analysis screenshot and current `context/progress-tracker.md` from the project context archive  
**Current status:** `OPEN — INTEGRATION NOT VERIFIED`  
**Priority:** High — primary analysis output is unavailable

---

## 1. Phase 7 scope from the progress tracker

The project progress tracker lists JPL Horizons verification/integration as a next-up task. Phase 7's requested implementation focus is to take the actual Horizons response, convert it into presentable analysis data, and display it inside the existing Mission Analysis panel on the right-hand side.

The expected flow is:

```text
Mission Input
    ↓
Mission coordinates + date + UTC time
    ↓
JPL Horizons request
    ↓
HTTP response
    ↓
Validate response and detect provider errors
    ↓
Parse and normalize Sun/Earth quantities
    ↓
Typed analysis result
    ↓
Right-hand Mission Analysis cards
```

The current screenshot shows that the final cards exist, but successful data retrieval and conversion have not been achieved.

## 2. What the screenshot shows

The supplied screenshot contains these visible states:

### Mission Analysis header
- Header: `Mission Analysis`
- Subtitle: `Ephemeris calculations powered by NASA JPL Horizons`

### Horizons warning
The warning says that both ephemeris requests failed:

```text
Sun: JPL Horizons HTTP 404 (Not Found)
Earth: JPL Horizons HTTP 404 (Not Found)
```

The response body displayed in the UI is HTML containing an nginx `404 Not Found` page.

### Sun Analysis card
- Status: `Unavailable`
- Message: `Horizons data unavailable. No hardcoded angles displayed.`
- Target shown: `10`
- Error shown: `JPL Horizons HTTP 404 (Not Found)` followed by raw HTML.
- Source label: `JPL Horizons (Target 10)`

### Earth Analysis card
- Status: `Unavailable`
- Message: `Horizons data unavailable. No hardcoded angles displayed.`
- Target shown: `399`
- Error shown: `JPL Horizons HTTP 404 (Not Found)` followed by raw HTML.
- Source label: `JPL Horizons (Target 399)`

### Communication Visibility card
- Geometric visibility: `Unavailable / cannot determine`
- Observation epoch shown: `2026-11-19 12:00 UTC`
- Data source: `JPL Horizons (Target 399)`
- A note correctly distinguishes geometric visibility from operational radio communication and says terrain obstruction analysis is separate.

## 3. Confirmed findings vs. unknowns

### Confirmed from the screenshot

1. The Mission Analysis panel is rendering.
2. The Sun and Earth cards are receiving an error state rather than usable ephemeris values.
3. Both displayed requests result in HTTP 404.
4. The response body is an nginx HTML 404 page, not a Horizons ephemeris response.
5. The frontend is displaying raw HTML inside the warning and analysis cards.
6. No Sun or Earth angles are currently being displayed.
7. Communication visibility correctly remains unavailable because Earth ephemeris data is unavailable.
8. The displayed observation epoch is `2026-11-19 12:00 UTC`.

### Not confirmed yet

The screenshot alone does not establish:
- The exact URL requested by the application.
- Whether the base URL, route path, query parameters, or HTTP method is incorrect.
- Whether the request is going to the official Horizons API or an incorrect proxy/path.
- Whether the target identifiers are correctly configured for the intended observer query.
- Whether the lunar observer location is encoded in the provider-supported format.
- Whether the UTC timestamp is passed correctly.
- Whether the service adapter is parsing an error response incorrectly.
- Whether a proxy, rewrite, environment variable, or deployment routing rule is changing the request URL.

Do not declare the target IDs or observer configuration to be the root cause until the outgoing request is inspected.

## 4. Primary issue — both Horizons requests return HTTP 404

**Issue ID:** `HOR-404-001`  
**Affected phase:** Phase 7  
**Status:** `OPEN — INVESTIGATING`  
**Priority:** High

### Observed error

Both Sun and Earth queries return:

```text
HTTP 404 Not Found
```

The body is an nginx HTML error page rather than a Horizons response.

### Likely investigation areas

A 404 normally indicates that the requested server route/resource was not found. Investigate these possibilities without assuming which one is responsible:

1. Incorrect Horizons base URL or API path.
2. Incorrect path appended by the service adapter.
3. Incorrect environment variable value.
4. A local API route or reverse proxy rewriting the upstream URL incorrectly.
5. Incorrect request method or URL construction.
6. Deployment configuration sending the request to the wrong host/path.

A target identifier problem should also be checked against the actual Horizons request and response, but do not assume it explains an nginx HTML 404.

### Required fix procedure

1. Find the exact server-side Horizons request function.
2. Log the final outgoing URL and HTTP method in development, with no secrets.
3. Record the configured base URL and route path.
4. Compare them with the current official JPL Horizons API documentation.
5. Verify the official API endpoint independently using a minimal known-good request.
6. Verify the request method and required parameters.
7. Check environment variables and any Next.js route handler/proxy/rewrite involved.
8. Correct the endpoint or routing configuration.
9. Send one controlled request for the Sun and one for Earth using the selected mission observer and UTC timestamp.
10. Confirm the response is a genuine Horizons response, not an HTML error document.

Do not solve this by hardcoding angles or substituting sample results.

## 5. Secondary issue — raw HTML error pages leak into the UI

**Issue ID:** `HOR-UI-001`  
**Affected phase:** Phase 7  
**Status:** `OPEN — FIX REQUIRED`  
**Priority:** Medium

### Observed problem

The warning banner and both analysis cards display the full HTML body from the nginx 404 page, including tags such as:

```html
<html>
<head><title>404 Not Found</title></head>
<body>
<center><h1>404 Not Found</h1></center>
<hr><center>nginx</center>
</body>
</html>
```

This is diagnostic server content and should not be rendered directly in the user-facing analysis panel.

### Required fix

Separate internal diagnostics from user-facing error messages.

**User-facing message example:**

```text
Sun ephemeris is currently unavailable.
The Horizons service returned HTTP 404.
Please retry later or contact the project team if the issue continues.
```

**Developer diagnostic information:**
- HTTP status.
- Final upstream host/path (without secrets).
- Content type.
- Request correlation ID.
- Sanitized provider error excerpt.
- Timestamp.
- Target and observer metadata.

Rules:
- Never inject raw HTML into React.
- Never use `dangerouslySetInnerHTML` for provider errors.
- Detect HTML responses when JSON/text was expected.
- Truncate and sanitize diagnostic excerpts.
- Do not expose internal stack traces, secrets, or environment variables.
- Keep the detailed diagnostics in server logs or a development-only diagnostic view.
- Keep the analysis cards concise and readable.

### Acceptance test

Return an HTML 404 body from a mocked Horizons request. Verify that:
- The card shows a short safe error message.
- No HTML tags appear in visible UI text.
- The developer log records useful sanitized diagnostics.
- No raw HTML is interpreted as markup.

## 6. Phase 7 data conversion and presentation requirements

Once the endpoint is corrected and real ephemeris data is returned, complete the integration into the existing right-hand Mission Analysis panel.

### Sun Analysis

Retrieve and display the supported Horizons outputs:
- Sun azimuth.
- Sun elevation.
- Unit for each value.
- Geometric horizon interpretation, only when the response convention supports it.
- Observation epoch in UTC.
- Source: JPL Horizons.
- Target identifier and observer metadata in an expandable/details area or diagnostic metadata.

### Earth Analysis

Retrieve and display:
- Earth azimuth.
- Earth elevation.
- Unit for each value.
- Geometric horizon interpretation, only when supported.
- Observation epoch in UTC.
- Source: JPL Horizons.
- Target identifier and observer metadata.

### Communication Visibility

- Derive geometric above/below/near-horizon state only from a validated Earth elevation and its documented reference convention.
- If Earth data is unavailable, show `Unavailable — cannot determine`.
- Do not claim terrain-clear line of sight without a separate DEM-based obstruction calculation.
- Do not claim operational radio availability without a link-budget and antenna analysis.

### Surrounding Terrain

Do not populate terrain elevation, slope, roughness, or obstruction using Horizons data. Those require an appropriate lunar terrain dataset and separate calculations.

## 7. Verify request correctness

Inspect and record all of the following for both Sun and Earth requests:

| Parameter | Verification required |
|---|---|
| Upstream host | Must match the current official Horizons API endpoint |
| Request path | Must match the documented API route |
| HTTP method | Must match the API specification |
| Target | Verify the configured target identifier and meaning |
| Observer | Verify lunar surface observer configuration |
| Latitude | Verify correct value, units, and convention |
| Longitude | Verify correct value, sign, and convention |
| Date/time | Verify exact mission UTC instant |
| Time scale | Verify the intended UTC/time-scale semantics |
| Reference frame | Verify it matches the requested azimuth/elevation interpretation |
| Quantities | Confirm the response includes the required azimuth/elevation values |
| Response format | Parse the actual documented response format |

Do not assume an Earth-centred observer or an Earth geodetic coordinate is equivalent to the lunar surface observer required by this application. Verify the provider-supported observer syntax for the intended lunar location.

## 8. Required test plan

### Test A — Endpoint smoke test

1. Inspect the final outgoing request URL.
2. Verify host and route against current official JPL documentation.
3. Send a minimal controlled request.
4. Record status, content type, and response format.
5. Confirm the response is from Horizons rather than nginx or another proxy.

**Pass condition:** The request reaches the intended Horizons API route and returns a valid provider response.

### Test B — Sun request

1. Use the selected mission coordinates.
2. Use the selected mission UTC timestamp.
3. Request the Sun quantities required by the application.
4. Validate the response.
5. Parse azimuth and elevation.
6. Record units, timestamp, target, and observer.

**Pass condition:** Valid Sun azimuth/elevation values are parsed from a real Horizons response and are traceable to the selected mission input.

### Test C — Earth request

Repeat Test B for the Earth target.

**Pass condition:** Valid Earth azimuth/elevation values are parsed from a real Horizons response and are traceable to the selected mission input.

### Test D — UI integration

1. Submit a mission request.
2. Wait for Horizons requests to complete.
3. Confirm the Sun Analysis card displays the returned Sun values.
4. Confirm the Earth Analysis card displays the returned Earth values.
5. Confirm units and UTC observation epoch are visible.
6. Confirm source metadata identifies JPL Horizons.
7. Confirm communication geometric visibility derives from the validated Earth elevation.
8. Confirm no hardcoded values appear.

**Pass condition:** The right-hand Mission Analysis panel displays the actual returned results for the current mission request.

### Test E — Error handling

Test:
- HTTP 404.
- HTTP 400.
- HTTP 429.
- HTTP 500/502/503.
- Timeout/network failure.
- HTML error body.
- Malformed Horizons response.
- Missing azimuth/elevation.
- Invalid numeric values.
- Partial success where Sun succeeds and Earth fails.
- A new mission request arriving before an older request finishes.

**Pass condition:** Errors are safely represented, partial success is handled, and stale responses cannot overwrite the latest mission results.

### Test F — Regression and quality gates

Run the existing:
- ESLint.
- TypeScript type-check.
- Unit tests.
- Horizons adapter tests.
- Mission Analysis component tests.
- Integration tests.
- Browser/E2E tests.
- Production build.

Record actual command output. Do not mark a check as passed if it was not run.

## 9. Required debug evidence

Create/update these artifacts:

```text
debug-artifacts/
  horizons-sun-request-diagnostic.md
  horizons-earth-request-diagnostic.md
  horizons-success-response-sanitized.txt
  horizons-error-response-sanitized.txt
  phase-7-analysis-panel-test-results.md
  phase-7-analysis-panel-screenshot.png
```

The diagnostic report must record:
- Test date/time.
- Final request host/path and method, with secrets removed.
- Sanitized request parameters.
- HTTP status.
- Content type.
- Response format.
- Whether the response was a Horizons result or an intermediary/server error.
- Target and observer configuration.
- Mission timestamp.
- Parsed fields and units on success.
- Parser/validation result.
- UI display result.
- Tests executed and pass/fail status.

Do not store secrets or unnecessary sensitive information.

## 10. Required status updates

Update:
- `context/progress-tracker.md`
- `context/debug-state-and-issue-tracker.md`

Add the following issues if they do not already exist:

| Issue ID | Description | Initial status |
|---|---|---|
| `HOR-404-001` | Sun and Earth Horizons requests return HTTP 404 with nginx HTML response | `OPEN — INVESTIGATING` |
| `HOR-UI-001` | Raw HTML error body is displayed in analysis cards | `OPEN — FIX REQUIRED` |
| `HOR-DATA-001` | Real Sun/Earth ephemeris values are not yet reaching analysis cards | `OPEN — NOT VERIFIED` |

Update statuses only after actual tests. Preserve the history of the original 404 failure.

## 11. Completion criteria

- [ ] Exact outgoing Sun and Earth request URLs inspected.
- [ ] Official Horizons host and API path verified.
- [ ] Root cause of HTTP 404 identified with evidence.
- [ ] Endpoint/routing configuration corrected.
- [ ] Real Sun Horizons response retrieved.
- [ ] Real Earth Horizons response retrieved.
- [ ] Observer coordinates and UTC timestamp verified.
- [ ] Sun azimuth/elevation parsed and units confirmed.
- [ ] Earth azimuth/elevation parsed and units confirmed.
- [ ] Values reach the existing right-hand analysis cards.
- [ ] Source, target, units, and observation epoch are displayed.
- [ ] Communication Visibility uses validated Earth data only.
- [ ] Terrain obstruction and operational communication are not falsely inferred.
- [ ] Raw HTML is not shown in user-facing UI.
- [ ] Partial success, loading, unavailable, error, and stale states tested.
- [ ] Unit, integration, browser, and quality-gate results recorded.
- [ ] Progress tracker updated.
- [ ] Debug tracker updated with evidence.

## 12. Final status rule

Current status is:

`OPEN — INTEGRATION NOT VERIFIED`

The screenshot proves that the analysis cards receive errors, not valid ephemeris values. It also proves that the raw HTML error body is currently exposed in the UI.

Do not mark Phase 7 complete until:
1. The 404 root cause is identified and corrected.
2. Real Horizons responses are retrieved for Sun and Earth.
3. Their values are parsed and validated.
4. The values appear in the correct right-hand analysis cards for the selected mission.
5. Error handling no longer exposes raw HTML.
6. Tests and browser verification pass.

If the provider request remains unsuccessful, report `BLOCKED` or `OPEN`, include the exact evidence, and do not insert fabricated values.
