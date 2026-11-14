# LROC QuickMap/WMS Debugging — Retrieve a Real Map Image Before Marking It OK

## Objective

Diagnose and fix the `LROC Map Service Unavailable` error shown in the Lunar Mission Planner map panel.

**Critical acceptance rule:** Do not mark the LROC map as working just because the endpoint responds, the GetCapabilities document loads, a URL can be constructed, or the map component renders. The developer must issue a real map-image request, retrieve the image bytes, verify that the response is a valid decodable image, and confirm that the image is actually displayed in the map before reporting success.

The current visible error is:

```text
LROC Map Service Unavailable
Could not reach the official LROC WMS endpoint for layer "wac_global".
```

The coordinate overlay currently displays approximately:

```text
Latitude:  -89.50°
Longitude: 0.00°
```

Preserve the user's coordinate marker and callout while debugging the imagery service.

## 1. Inspect the current implementation

Before changing code:

1. Read the project's `context/AGENTS.md` and relevant architecture/map context.
2. Inspect the current map component, WMS client/adapter, endpoint URL, layer identifier, CRS, image format, and request parameters.
3. Inspect browser DevTools network errors and server logs.
4. Identify whether the request is made from the browser or server.
5. Check whether the current `wac_global` layer identifier came from official service metadata or was guessed.
6. Do not replace the map with a static background image, generated image, screenshot, or fake tile.

Record the exact endpoint and parameters currently being used before modifying them.

## 2. Retrieve and inspect official service capabilities

Use the official LROC service endpoint documented by the project:

```text
https://data.lroc.imldi.com/lroc
```

Do not assume that this base URL alone is the correct final WMS endpoint. Check the official service documentation and actual response.

Issue a real WMS `GetCapabilities` request using the correct service URL and query parameters.

Verify from the returned XML:
- The service is actually a WMS endpoint.
- The WMS version.
- Exact published layer names.
- Layer titles and descriptions.
- Supported coordinate reference systems (CRS/SRS).
- Supported image formats.
- Geographic/projected bounding boxes.
- Styles and scale constraints, if supplied.
- Whether the requested global or polar layer exists.

Parse the capabilities document and select an exact published layer identifier. Do not infer or invent `wac_global`.

If the endpoint redirects, follow the redirect and record the final URL. If it returns an error, HTML page, access-denied response, or malformed XML, report that accurately.

## 3. Issue a real GetMap image request

After identifying a valid layer and CRS from the actual capabilities response, construct and send a real WMS `GetMap` request.

The request must include the parameters required by the WMS version and the selected layer, including:
- `SERVICE=WMS`
- `REQUEST=GetMap`
- `VERSION` matching the service
- `LAYERS` using the exact published layer name
- `STYLES` as supported by the service
- `CRS` for WMS 1.3.0 or `SRS` for WMS 1.1.1
- `BBOX` in the correct axis order for the WMS version and CRS
- `WIDTH` and `HEIGHT`
- `FORMAT` using an advertised image MIME type
- `TRANSPARENT` only if supported and appropriate

### Critical CRS and axis-order check

Do not assume longitude/latitude order.

WMS 1.3.0 axis order can differ from WMS 1.1.1, depending on the CRS definition. Use the CRS metadata and WMS specification to construct the correct bounding box.

For lunar south-pole coordinates:
- Verify the selected layer supports the chosen polar stereographic CRS.
- Transform the user's lunar coordinate into the map CRS using an appropriate lunar coordinate transformation.
- Verify that the requested BBOX is within the layer's actual coverage.
- Do not pass Earth Web Mercator coordinates as if they were lunar coordinates.
- Do not silently change the user's source coordinate.

Do not guess a polar CRS identifier. Select one that is explicitly advertised for the chosen LROC layer.

## 4. Verify the retrieved image bytes — mandatory gate

A successful HTTP status alone is not enough.

After the GetMap request:

1. Retrieve the actual response body as bytes.
2. Record the HTTP status code.
3. Record the final response URL after redirects.
4. Record the response `Content-Type`.
5. Record the response byte length.
6. Check that the response is not an XML WMS exception or HTML error page.
7. Decode the response using an image decoder/library available in the environment.
8. Confirm the decoded image has non-zero width and height.
9. Confirm the decoded image dimensions match or are consistent with the requested `WIDTH` and `HEIGHT`.
10. Save the retrieved image to a temporary debug artifact, for example:

```text
debug-artifacts/lroc-getmap-test.png
```

Use the actual returned image format and extension. Do not rename a non-PNG response to `.png`.

11. Open/inspect the saved image and confirm it contains real lunar map imagery rather than a blank image, error graphic, or unrelated content.
12. Record the image dimensions and file size.

If the service returns HTTP 200 with an XML exception or HTML error, classify the request as failed.

If the image decodes but is entirely blank/transparent or outside the expected coverage, classify the map retrieval as failed or no-coverage, not successful.

**Do not mark the map as OK until the real returned image has been decoded and visually inspected.**

## 5. Verify the image in the actual application

Once the standalone GetMap image request has been verified:

1. Integrate the exact verified endpoint, layer, CRS, and request construction into the map adapter.
2. Load the imagery in the actual Lunar Mission Planner map panel.
3. Open the application in a browser.
4. Confirm the browser receives successful image/tile requests.
5. Confirm the map displays the real returned lunar imagery.
6. Confirm the selected coordinate `-89.50°, 0.00°` is transformed and positioned correctly for the selected lunar projection.
7. Confirm the red selection rectangle, centre crosshair, and coordinate callout remain visible.
8. Pan and zoom the map and verify the marker remains anchored to the same geographic coordinate.
9. Confirm the map is not displaying the decorative page background as a substitute for map imagery.
10. Check that the map panel has no WMS error overlay after successful retrieval.

A standalone GetMap image test is necessary but not sufficient. The image must also load in the real application.

## 6. Diagnose common failure categories

Report the actual failure category rather than displaying only a generic error.

| Failure | How to identify it | Required response |
|---|---|---|
| DNS/network failure | No HTTP response; DNS/connectivity error | Verify host/network and retry safely |
| TLS/certificate failure | TLS handshake or certificate error | Inspect certificate chain and runtime trust |
| Wrong endpoint | 404, redirect to unrelated page, or non-WMS response | Verify official endpoint path |
| Invalid layer | WMS exception for unknown layer | Use exact layer name from capabilities |
| Unsupported CRS | WMS exception or no coverage for CRS | Select advertised CRS and correct transform |
| Wrong BBOX axis order | Image is misplaced, empty, or exception returned | Correct axis order for WMS version/CRS |
| Unsupported image format | WMS exception or unexpected content type | Use advertised image format |
| CORS restriction | Browser blocks response although server may be reachable | Use an appropriate server-side proxy if permitted |
| No high-resolution coverage | Valid service but no data for requested region/scale | Use a verified global/base layer fallback |
| XML/HTML error with HTTP 200 | Content type/body is not an image | Treat as failure; parse and report error |
| Blank/transparent image | Image decodes but contains no useful map pixels | Check coverage, BBOX, layer, style, and opacity |

## 7. CORS and server-side proxy

If direct browser requests fail due to CORS:

- Confirm the exact browser console error.
- Verify whether the service permits cross-origin requests.
- If required, implement a server-side route/proxy that requests only the approved LROC endpoint.
- Validate and allowlist layer names, CRS, image format, BBOX, width, and height.
- Set request timeouts and response-size limits.
- Forward the actual image bytes and correct content type.
- Do not create an unrestricted open proxy.
- Do not expose credentials or server configuration.
- Do not proxy arbitrary user-supplied URLs.

A proxy is not a substitute for verifying the upstream GetMap image. Test the upstream request and then test the proxy response separately.

## 8. Fallback behavior

If the selected high-resolution layer has no coverage at the user's location:

1. Check the capabilities metadata and provider documentation for a verified global/base layer.
2. Request that fallback layer with its own supported CRS and bounds.
3. Retrieve and decode the fallback image.
4. Visually inspect it.
5. Use it only after confirming it contains lunar imagery.
6. Clearly identify the active layer in the UI.

Do not label a global lower-resolution layer as high resolution.

If no valid imagery can be retrieved, retain the coordinate overlay and show a useful error with a retry action. Do not display fabricated map content.

## 9. Automated tests

Use the project's existing test stack.

### Unit/contract tests
- Capabilities XML parser extracts exact layer names and CRS values.
- Unsupported layer is rejected.
- GetMap request includes the correct WMS version and parameters.
- BBOX axis order is correct for the selected WMS version and CRS.
- User coordinates are transformed without mutation.
- WMS exception XML is recognized.
- HTML error body is not accepted as an image.
- Unexpected content type is rejected.
- Empty/invalid image bytes are rejected.
- Valid image bytes decode and dimensions are checked.
- No-coverage fallback is selected only when configured and verified.

### Integration tests
- Perform a controlled GetCapabilities request when network access is available.
- Perform a real GetMap request for a known supported region.
- Save and decode the returned image.
- Test the server-side proxy separately if used.
- Verify the application map panel displays the returned imagery.

Use mocked responses for deterministic CI tests. Keep live provider tests optional or separately gated so external outages do not make ordinary CI flaky.

## 10. Required debug evidence

Create a debug report at:

```text
debug-artifacts/lroc-map-debug-report.md
```

The report must include:

1. Date/time of test and runtime environment.
2. Original endpoint and final URL after redirects.
3. GetCapabilities HTTP status and content type.
4. WMS version.
5. Exact layer identifier retrieved from capabilities.
6. Supported CRS and image formats for that layer.
7. Exact GetMap parameters, with no secrets.
8. GetMap HTTP status.
9. Response content type and byte length.
10. Whether the body was recognized as an exception, HTML, or image.
11. Image decoder result.
12. Actual image dimensions.
13. Path to the saved retrieved image artifact.
14. A note confirming the saved image was visually inspected.
15. Whether the same imagery successfully rendered in the application.
16. Coordinate/projection/marker alignment result.
17. Browser console/network errors, if any.
18. Root cause and fix.
19. Remaining limitations.

Do not include secrets, access tokens, or sensitive environment variables in the report.

## 11. Strict acceptance criteria

The LROC map may be marked:

### `VERIFIED — IMAGE RETRIEVED AND DISPLAYED`

Only if all are true:
- [ ] Official service metadata was retrieved and parsed.
- [ ] Exact layer and CRS were confirmed from service metadata.
- [ ] A real GetMap request was sent.
- [ ] Actual response bytes were retrieved.
- [ ] Response was confirmed to be an image, not XML/HTML.
- [ ] Image decoded successfully.
- [ ] Image dimensions and byte size were recorded.
- [ ] Saved image was visually inspected and showed lunar imagery.
- [ ] The same real imagery rendered in the application.
- [ ] The selected coordinate marker aligned with the imagery.
- [ ] No dummy/static background was counted as map imagery.

### `NOT VERIFIED`

Use this status if any required check above fails or cannot be performed. State exactly which step failed. Do not report “fixed,” “working,” or “OK” merely because the endpoint responds.

## 12. Final implementation report

When finished, provide:
- Root cause of the original error.
- Correct endpoint and verified layer name.
- Projection/CRS and axis-order configuration.
- Actual GetCapabilities and GetMap test outcomes.
- Image response content type, bytes, and dimensions.
- Path to the saved retrieved image.
- Confirmation of visual inspection.
- Confirmation that the actual application displayed the image.
- Marker alignment result.
- Files changed.
- Tests run and pass/fail results.
- Final status: `VERIFIED — IMAGE RETRIEVED AND DISPLAYED` or `NOT VERIFIED`.

**Never mark the LROC map as working without retrieving, decoding, visually inspecting, and displaying an actual map image from the service.**
