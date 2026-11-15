# Horizons Sun Request Diagnostic

- **Target:** Sun (Body 10)
- **Observer Configuration:** Lunar planetodetic surface (`coord@301`)
- **Observer Site Coordinates:** `0, -86.00, 0` (Longitude: 0.00° East, Latitude: -86.00° North, Altitude: 0 km)
- **Requested Epoch:** `2028-01-15 12:00 UTC`
- **Stop Epoch:** `2028-01-15 12:01 UTC` (1m interval)
- **Ephemeris Type:** `OBSERVER`
- **Output Quantities:** `4` (Apparent azimuth & elevation, airless)
- **Upstream Host:** `https://ssd.jpl.nasa.gov`
- **API Path:** `/api/horizons.api`
- **HTTP Method:** `GET`
- **HTTP Status:** `200 OK`
- **Content-Type:** `application/json`
- **Provider Signature:** `NASA/JPL Horizons API v1.2`

## Parsed Output
- **Sun Azimuth:** `317.07°` (measured East of local North)
- **Sun Elevation:** `3.13°` (above local geometric horizon)
- **Geometric Status:** `Above horizon`
- **isGeometricAboveHorizon:** `true`
- **Source:** `JPL Horizons (Target 10)`
- **Observation Epoch:** `2028-01-15 12:00 UTC`

