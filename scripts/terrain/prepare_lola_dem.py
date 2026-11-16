#!/usr/bin/env python3
"""Prepare a LOLA DEM patch for the Lunar Mission Planner.

This script validates the selected site against the official NASA/GSFC PGDA LOLA
South-Pole DEM product, prepares a native-resolution crop, and writes a browser-ready
height grid together with a machine-readable manifest for the later 3D terrain phase.
"""

from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

import numpy as np

try:
    import rasterio
    from rasterio.enums import Resampling
    from rasterio.transform import from_origin
    from rasterio.warp import reproject
    from rasterio.windows import Window, from_bounds
except ImportError as exc:  # pragma: no cover
    raise SystemExit("rasterio is required. Install: python -m pip install -r scripts/terrain/requirements.txt") from exc

try:
    from pyproj import CRS, Transformer
except ImportError as exc:  # pragma: no cover
    raise SystemExit("pyproj is required. Install: python -m pip install -r scripts/terrain/requirements.txt") from exc

DEFAULT_CROP_METERS = 10000.0
DEFAULT_TARGET_SPACING = 10.0
DEFAULT_DEM_URL = "https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldem_87s_5mpp.tif"
DEFAULT_COUNT_MAP_URL = "https://pgda.gsfc.nasa.gov/data/LOLA_5mpp/87S/ldec_87s_5mpp.tif"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inspect and prepare a locally cropped LOLA DEM patch.")
    parser.add_argument("--dem", type=str, default="", help="Local DEM GeoTIFF path.")
    parser.add_argument("--count-map", type=str, default="", help="Optional local count-map GeoTIFF.")
    parser.add_argument("--dem-url", type=str, default=DEFAULT_DEM_URL, help="Remote DEM URL.")
    parser.add_argument("--count-map-url", type=str, default=DEFAULT_COUNT_MAP_URL, help="Remote count map URL.")
    parser.add_argument("--latitude", type=float, help="Selected lunar latitude in degrees; required when cropping.")
    parser.add_argument("--longitude", type=float, help="Selected lunar longitude in degrees; required when cropping.")
    parser.add_argument("--crop-width-meters", type=float, default=DEFAULT_CROP_METERS, help="Local crop width in metres.")
    parser.add_argument("--crop-height-meters", type=float, default=DEFAULT_CROP_METERS, help="Local crop height in metres.")
    parser.add_argument("--target-spacing", type=float, default=DEFAULT_TARGET_SPACING, help="Target output sample spacing in metres.")
    parser.add_argument("--output-dir", type=str, default="data/lunar-terrain/processed", help="Output directory for processed terrain files.")
    parser.add_argument("--inspect-only", action="store_true", help="Fetch metadata and print the inspection report without writing a crop.")
    parser.add_argument("--download", action="store_true", help="Attempt a direct download of the official DEM and count map to data/lunar-terrain/raw.")
    parser.add_argument("--preview", action="store_true", help="Generate a preview PNG when local data is available.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing processed outputs.")
    return parser.parse_args()


def safe_float(value: Any, default: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def site_key(latitude: float, longitude: float) -> str:
    lat_dir = "N" if latitude >= 0 else "S"
    lon_dir = "E" if longitude >= 0 else "W"
    return f"site_{abs(latitude):05.2f}{lat_dir}_{abs(longitude):05.2f}{lon_dir}".replace(".", "_").replace("-", "")


def http_head(url: str) -> dict[str, Any]:
    request = Request(url, method="HEAD", headers={"User-Agent": "LunarMissionPlanner/Phase34"})
    try:
        with urlopen(request, timeout=30) as response:
            headers = dict(response.headers.items())
            return {
                "url": url,
                "status": getattr(response, "status", response.getcode()),
                "content_type": headers.get("Content-Type", ""),
                "content_length": safe_float(headers.get("Content-Length", "0"), 0.0),
                "accept_ranges": headers.get("Accept-Ranges", ""),
                "last_modified": headers.get("Last-Modified", ""),
                "etag": headers.get("ETag", ""),
                "final_url": getattr(response, "geturl", lambda: url)(),
            }
    except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:  # pragma: no cover
        return {
            "url": url,
            "status": "ERROR",
            "error": str(exc),
            "content_type": "",
            "content_length": 0.0,
            "accept_ranges": "",
            "last_modified": "",
            "etag": "",
            "final_url": url,
        }


def validate_source_file_size(local_path: str | Path, url: str) -> dict[str, Any]:
    remote = http_head(url)
    if remote["status"] != 200 or not remote["content_length"]:
        raise RuntimeError(f"Unable to verify expected source size for {url}: {remote.get('error', remote['status'])}")
    expected_size = int(remote["content_length"])
    actual_size = Path(local_path).stat().st_size
    if actual_size != expected_size:
        raise ValueError(
            f"Source file size is incomplete or unexpected: {local_path} has {actual_size} bytes; expected {expected_size}."
        )
    return remote


def download_file_resumable(url: str, target_path: str | Path, force: bool = False) -> dict[str, Any]:
    target = Path(target_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    partial = Path(f"{target}.part")
    metadata_path = Path(f"{partial}.json")

    head_request = Request(url, method="HEAD", headers={"User-Agent": "LunarMissionPlanner/Phase34"})
    with urlopen(head_request, timeout=60) as response:
        remote_headers = response.headers
        remote = {
            "sourceUrl": url,
            "finalUrl": response.geturl(),
            "contentLength": int(remote_headers.get("Content-Length", "0")),
            "acceptRanges": remote_headers.get("Accept-Ranges", "").lower(),
            "etag": remote_headers.get("ETag", ""),
            "lastModified": remote_headers.get("Last-Modified", ""),
        }
        if response.status != 200 or remote["contentLength"] <= 0:
            raise RuntimeError(f"Source did not provide a valid full-object length: HTTP {response.status}.")

    if target.exists() and not force and target.stat().st_size == remote["contentLength"]:
        return {**remote, "path": str(target), "status": "existing-size-matches"}
    if target.exists() and not force:
        raise RuntimeError(
            f"Existing file is incomplete or has an unexpected length; preserving it rather than overwriting: {target}"
        )

    if partial.exists() and not metadata_path.exists():
        raise RuntimeError(f"Cannot safely resume partial file without source metadata; preserving it: {partial}")

    if metadata_path.exists():
        saved = json.loads(metadata_path.read_text(encoding="utf-8"))
        for key in ("sourceUrl", "finalUrl", "contentLength", "etag", "lastModified"):
            if saved.get(key) != remote[key]:
                raise RuntimeError(f"Remote source identity changed ({key}); preserving partial download: {partial}")
    else:
        saved = {**remote, "startedAtUtc": datetime.now(timezone.utc).isoformat()}
        temporary_metadata = Path(f"{metadata_path}.tmp")
        temporary_metadata.write_text(json.dumps(saved, indent=2), encoding="utf-8")
        os.replace(temporary_metadata, metadata_path)

    expected_length = remote["contentLength"]
    last_transient_error: Exception | None = None
    for attempt in range(5):
        offset = partial.stat().st_size if partial.exists() else 0
        if offset > expected_length:
            raise RuntimeError(f"Partial file exceeds the current source length; preserving it: {partial}")
        if offset == expected_length:
            break
        if offset and remote["acceptRanges"] != "bytes":
            raise RuntimeError(f"Server does not support byte ranges; preserving partial file: {partial}")

        headers = {"User-Agent": "LunarMissionPlanner/Phase34"}
        if offset:
            validator = remote["etag"] if remote["etag"] and not remote["etag"].startswith("W/") else remote["lastModified"]
            if not validator:
                raise RuntimeError(f"No stable validator is available for a safe resume; preserving partial file: {partial}")
            headers.update({"Range": f"bytes={offset}-", "If-Range": validator})

        request = Request(url, headers=headers)
        try:
            with urlopen(request, timeout=60) as response:
                expected_status = 206 if offset else 200
                if response.status != expected_status:
                    reason = "Server ignored the requested Range header" if offset and response.status == 200 else "Unexpected response"
                    raise RuntimeError(f"{reason}: HTTP {response.status}; preserving partial file: {partial}")
                if response.geturl() != remote["finalUrl"]:
                    raise RuntimeError("The final source URL changed during download; preserving the partial file.")

                response_etag = response.headers.get("ETag", "")
                response_modified = response.headers.get("Last-Modified", "")
                if remote["etag"] and response_etag and response_etag != remote["etag"]:
                    raise RuntimeError(f"ETag changed during download; preserving partial file: {partial}")
                if remote["lastModified"] and response_modified and response_modified != remote["lastModified"]:
                    raise RuntimeError(f"Last-Modified changed during download; preserving partial file: {partial}")

                if offset:
                    content_range = response.headers.get("Content-Range", "")
                    match = re.fullmatch(r"bytes\s+(\d+)-(\d+)/(\d+)", content_range)
                    if not match or int(match.group(1)) != offset or int(match.group(3)) != expected_length:
                        raise RuntimeError(
                            f"Invalid Content-Range for resume offset {offset}: {content_range!r}; preserving partial file."
                        )
                    if int(match.group(2)) != expected_length - 1:
                        raise RuntimeError(f"Range response did not cover the remaining source bytes: {content_range!r}")

                response_length = response.headers.get("Content-Length")
                if response_length and int(response_length) != expected_length - offset:
                    raise RuntimeError(
                        f"Unexpected response length {response_length}; expected {expected_length - offset}."
                    )

                mode = "ab" if offset else "wb"
                with partial.open(mode) as output:
                    while True:
                        chunk = response.read(1024 * 1024)
                        if not chunk:
                            break
                        output.write(chunk)
                    output.flush()
                    os.fsync(output.fileno())
        except HTTPError as exc:
            if exc.code not in (408, 425, 429) and not 500 <= exc.code < 600:
                raise RuntimeError(f"HTTP {exc.code} while downloading {url}; preserving {partial}.") from exc
            last_transient_error = exc
        except (http.client.IncompleteRead, URLError, TimeoutError) as exc:
            last_transient_error = exc

        actual_length = partial.stat().st_size if partial.exists() else 0
        if actual_length == expected_length:
            last_transient_error = None
            break
        if last_transient_error is None:
            last_transient_error = RuntimeError(
                f"Truncated or incomplete response: received {actual_length} of {expected_length} bytes."
            )
        if attempt < 4:
            time.sleep(min(2**attempt, 8))

    actual_length = partial.stat().st_size if partial.exists() else 0
    if actual_length != expected_length:
        raise RuntimeError(
            f"Truncated or incomplete download after bounded retries: received {actual_length} of "
            f"{expected_length} bytes; preserving {partial}."
        ) from last_transient_error

    os.replace(partial, target)
    metadata_path.unlink(missing_ok=True)
    return {**remote, "path": str(target), "bytes": actual_length, "status": "downloaded"}


def file_sha256(path: str) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def manifest_nodata(value: Any) -> float | str | None:
    if value is None:
        return None
    numeric = float(value)
    return "NaN" if np.isnan(numeric) else numeric


def inspect_local_dem(dem_path: str, latitude: float | None = None, longitude: float | None = None) -> dict[str, Any]:
    with rasterio.open(dem_path) as src:
        valid_count = 0
        no_data_count = 0
        value_sum = 0.0
        minimum = float("inf")
        maximum = float("-inf")
        for _, window in src.block_windows(1):
            data = src.read(1, window=window, masked=True)
            values = np.asarray(data.compressed(), dtype=np.float64)
            valid_count += int(values.size)
            no_data_count += int(data.size - values.size)
            if values.size:
                value_sum += float(values.sum(dtype=np.float64))
                minimum = min(minimum, float(values.min()))
                maximum = max(maximum, float(values.max()))

        site_window: dict[str, Any] | None = None
        if latitude is not None and longitude is not None:
            if src.crs is None:
                raise ValueError("The DEM CRS is required to inspect a selected-site sample.")
            x, y = projected_point_for_site(latitude, longitude, src.crs)
            row, column = src.index(x, y)
            if 0 <= row < src.height and 0 <= column < src.width:
                window = Window(
                    max(column - 2, 0),
                    max(row - 2, 0),
                    min(5, src.width - max(column - 2, 0)),
                    min(5, src.height - max(row - 2, 0)),
                )
                site_data = src.read(1, window=window, masked=True)
                site_values = np.asarray(site_data.compressed(), dtype=np.float32)
                site_window = {
                    "status": "read",
                    "latitudeDegrees": float(latitude),
                    "longitudeDegrees": float(longitude),
                    "projectedX": float(x),
                    "projectedY": float(y),
                    "row": int(row),
                    "column": int(column),
                    "width": int(site_data.shape[1]),
                    "height": int(site_data.shape[0]),
                    "values": site_data.filled(np.nan).tolist(),
                    "validSampleCount": int(site_values.size),
                }
            else:
                site_window = {
                    "status": "outside",
                    "latitudeDegrees": float(latitude),
                    "longitudeDegrees": float(longitude),
                    "projectedX": float(x),
                    "projectedY": float(y),
                }

        stats = {
            "path": dem_path,
            "size_bytes": Path(dem_path).stat().st_size,
            "width": int(src.width),
            "height": int(src.height),
            "band_count": int(src.count),
            "dtype": str(src.dtypes[0]),
            "nodata": src.nodata,
            "crs": src.crs.to_wkt() if src.crs is not None else None,
            "bounds": {
                "left": float(src.bounds.left),
                "bottom": float(src.bounds.bottom),
                "right": float(src.bounds.right),
                "top": float(src.bounds.top),
            },
            "transform": list(src.transform),
            "pixel_size_meters": {
                "x": float(src.transform.a),
                "y": abs(float(src.transform.e)),
            },
            "num_valid_pixels": valid_count,
            "num_nodata_pixels": no_data_count,
            "valid_sample_percentage": float(valid_count / (src.width * src.height) * 100.0) if src.width * src.height else 0.0,
            "min": minimum if valid_count else None,
            "max": maximum if valid_count else None,
            "mean": value_sum / valid_count if valid_count else None,
            "scale": float(src.scales[0]) if len(src.scales) else 1.0,
            "offset": float(src.offsets[0]) if len(src.offsets) else 0.0,
            "compression": str(src.compression) if src.compression is not None else None,
            "driver": src.driver,
            "metadata_tags": src.tags(),
            "selected_site_window": site_window,
        }
        return stats


def projected_point_for_site(latitude: float, longitude: float, crs: Any) -> tuple[float, float]:
    if crs is None:
        raise ValueError("Raster CRS is required to transform the selected site into the DEM coordinate system.")
    lunar_crs = CRS.from_user_input(crs)
    geographic_crs = lunar_crs.geodetic_crs
    if geographic_crs is None:
        raise ValueError("The raster CRS must define its lunar geographic coordinate system.")
    transformer = Transformer.from_crs(geographic_crs, lunar_crs, always_xy=True)
    x, y = transformer.transform(longitude, latitude)
    return float(x), float(y)


def compute_site_coverage(site_latitude: float, site_longitude: float, dem_path: str) -> dict[str, Any]:
    with rasterio.open(dem_path) as src:
        crs = src.crs
        if crs is None:
            return {"status": "missing-crs", "message": "DEM file has no CRS metadata."}
        x, y = projected_point_for_site(site_latitude, site_longitude, crs)
        bounds = src.bounds
        inside = bounds.left <= x <= bounds.right and bounds.bottom <= y <= bounds.top
        return {
            "status": "inside" if inside else "outside",
            "raster_projection_x_m": x,
            "raster_projection_y_m": y,
            "raster_bounds": {"left": bounds.left, "bottom": bounds.bottom, "right": bounds.right, "top": bounds.top},
            "inside_raster_bounds": inside,
            "crs": crs.to_wkt(),
        }


def ensure_output_dir(output_dir: str) -> Path:
    path = Path(output_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def validate_crop_bounds(left: float, right: float, bottom: float, top: float, raster_bounds: Any) -> None:
    if left < raster_bounds.left or right > raster_bounds.right or bottom < raster_bounds.bottom or top > raster_bounds.top:
        raise ValueError(
            f"Requested crop exceeds raster bounds: crop=[{left}, {right}, {bottom}, {top}] source=[{raster_bounds.left}, {raster_bounds.right}, {raster_bounds.bottom}, {raster_bounds.top}]"
        )


def write_preview(heightmap: np.ndarray, output_path: Path) -> None:
    try:
        from PIL import Image
    except ImportError as exc:  # pragma: no cover
        raise RuntimeError("Pillow is required to generate preview images.") from exc

    finite = np.isfinite(heightmap)
    if not finite.any():
        canvas = np.zeros((256, 256), dtype=np.uint8)
        Image.fromarray(canvas, mode="L").save(output_path)
        return

    values = heightmap[finite]
    minimum = float(np.min(values))
    maximum = float(np.max(values))
    span = max(maximum - minimum, 1.0)
    normalized = np.where(finite, ((heightmap - minimum) / span) * 255.0, 0.0)
    image = Image.fromarray(np.clip(normalized, 0, 255).astype(np.uint8), mode="L")
    image = image.resize((512, 512), Image.Resampling.BILINEAR)
    image.save(output_path)


def prepare_crop(
    dem_path: str,
    latitude: float,
    longitude: float,
    crop_width_m: float,
    crop_height_m: float,
    target_spacing: float,
    output_dir: str,
    count_map: str | None = None,
    preview: bool = False,
    force: bool = False,
    dem_url: str | None = None,
    count_map_url: str | None = None,
) -> dict[str, Any]:
    if not os.path.exists(dem_path):
        raise FileNotFoundError(f"DEM file not found: {dem_path}")
    if count_map and not os.path.exists(count_map):
        raise FileNotFoundError(f"Count map file not found: {count_map}")

    output_root = ensure_output_dir(os.path.join(output_dir, site_key(latitude, longitude)))
    required_paths = [
        output_root / "dem-native-crop.tif",
        output_root / "heightmap-10m.f32",
        output_root / "quality-counts-10m.f32",
        output_root / "validity-mask-10m.bin",
        output_root / "terrain-manifest.json",
    ]
    if not force and all(path.exists() for path in required_paths):
        existing_manifest = json.loads((output_root / "terrain-manifest.json").read_text(encoding="utf-8"))
        existing_site = existing_manifest.get("site", {})
        existing_crop = existing_manifest.get("crop", {})
        if (
            existing_site.get("latitudeDegrees") == float(latitude)
            and existing_site.get("longitudeDegrees") == float(longitude)
            and existing_crop.get("widthMeters") == float(crop_width_m)
            and existing_crop.get("heightMeters") == float(crop_height_m)
            and existing_manifest.get("browserGrid", {}).get("actualSpacingMeters") == float(target_spacing)
            and (not preview or existing_manifest.get("paths", {}).get("previewImage"))
        ):
            return existing_manifest
        raise FileExistsError(f"Existing output does not match the requested crop; preserving it: {output_root}")
    if not force and output_root.exists() and any(path.exists() for path in output_root.iterdir()):
        raise FileExistsError(f"Output directory contains prior or partial files; preserving it: {output_root}")

    with rasterio.open(dem_path) as src:
        if src.crs is None:
            raise ValueError("The DEM CRS is required to crop and validate the selected site.")

        x_center, y_center = projected_point_for_site(latitude, longitude, src.crs)
        half_width = crop_width_m / 2.0
        half_height = crop_height_m / 2.0

        left = x_center - half_width
        right = x_center + half_width
        bottom = y_center - half_height
        top = y_center + half_height

        validate_crop_bounds(left, right, bottom, top, src.bounds)

        window = from_bounds(left, bottom, right, top, transform=src.transform)
        read_window = window.round_offsets().round_lengths()
        native_data = src.read(1, window=read_window, masked=True, out_dtype=np.float32)
        native_nodata = src.nodata if src.nodata is not None else np.nan
        native_array = np.asarray(native_data.filled(np.nan), dtype=np.float32)
        native_transform = rasterio.windows.transform(read_window, src.transform)

        dem_crop_path = output_root / "dem-native-crop.tif"
        with rasterio.open(
            dem_crop_path,
            "w",
            driver="GTiff",
            width=native_array.shape[1],
            height=native_array.shape[0],
            count=1,
            dtype="float32",
            crs=src.crs,
            transform=native_transform,
            nodata=np.nan,
        ) as dst:
            dst.write(native_array, 1)
            dst.scales = src.scales
            dst.offsets = src.offsets

        sample_rows = sorted({0, native_array.shape[0] // 2, native_array.shape[0] - 1})
        sample_columns = sorted({0, native_array.shape[1] // 2, native_array.shape[1] - 1})
        sample_positions = {
            (sample_rows[0], sample_columns[0]),
            (sample_rows[0], sample_columns[-1]),
            (sample_rows[-1], sample_columns[0]),
            (sample_rows[-1], sample_columns[-1]),
            (sample_rows[len(sample_rows) // 2], sample_columns[len(sample_columns) // 2]),
        }
        source_sample_comparisons = []
        with rasterio.open(dem_crop_path) as cropped_source:
            for row, column in sorted(sample_positions):
                source_value = src.read(
                    1,
                    window=Window(read_window.col_off + column, read_window.row_off + row, 1, 1),
                )[0, 0]
                crop_value = cropped_source.read(1, window=Window(column, row, 1, 1))[0, 0]
                values_match = bool(np.isclose(source_value, crop_value, equal_nan=True))
                if not values_match:
                    raise RuntimeError(
                        f"Prepared crop sample mismatch at row={row}, column={column}: "
                        f"source={source_value}, crop={crop_value}."
                    )
                source_sample_comparisons.append(
                    {
                        "row": row,
                        "column": column,
                        "sourceValueMeters": float(source_value) if np.isfinite(source_value) else None,
                        "cropValueMeters": float(crop_value) if np.isfinite(crop_value) else None,
                        "bothNoData": bool(np.isnan(source_value) and np.isnan(crop_value)),
                        "match": values_match,
                    }
                )

        target_pixel_size = max(float(target_spacing), 1e-6)
        out_width = max(int(round((right - left) / target_pixel_size)), 1)
        out_height = max(int(round((top - bottom) / target_pixel_size)), 1)
        out_transform = from_origin(left, top, target_pixel_size, target_pixel_size)
        heightmap = np.full((out_height, out_width), np.nan, dtype=np.float32)
        reproject(
            source=native_array,
            destination=heightmap,
            src_transform=native_transform,
            src_crs=src.crs,
            dst_transform=out_transform,
            dst_crs=src.crs,
            src_nodata=native_nodata,
            dst_nodata=np.nan,
            resampling=Resampling.average,
        )

        heightmap_path = output_root / "heightmap-10m.f32"
        heightmap.astype(np.float32, copy=False).tofile(heightmap_path)

        validity_mask = np.isfinite(heightmap).astype(np.uint8)
        validity_mask_path = output_root / "validity-mask-10m.bin"
        validity_mask.tofile(validity_mask_path)

        count_array = None
        quality_path = output_root / "quality-counts-10m.f32"
        if count_map:
            with rasterio.open(count_map) as count_src:
                if count_src.crs is None:
                    raise ValueError("The count map CRS is required for alignment.")
                if count_src.crs != src.crs:
                    raise ValueError("Count map CRS does not match DEM CRS. Reproject before proceeding.")
                count_window = from_bounds(left, bottom, right, top, transform=count_src.transform)
                count_read_window = count_window.round_offsets().round_lengths()
                validate_crop_bounds(
                    left,
                    right,
                    bottom,
                    top,
                    count_src.bounds,
                )
                count_native = count_src.read(1, window=count_read_window, masked=True, out_dtype=np.float32)
                count_native_array = np.asarray(count_native.filled(np.nan), dtype=np.float32)
                count_grid = np.full((out_height, out_width), np.nan, dtype=np.float32)
                reproject(
                    source=count_native_array,
                    destination=count_grid,
                    src_transform=rasterio.windows.transform(count_read_window, count_src.transform),
                    src_crs=count_src.crs,
                    dst_transform=out_transform,
                    dst_crs=count_src.crs,
                    src_nodata=np.nan,
                    dst_nodata=np.nan,
                    resampling=Resampling.sum,
                )
                count_array = count_grid
                count_grid.astype(np.float32, copy=False).tofile(quality_path)
        else:
            np.full((out_height, out_width), np.nan, dtype=np.float32).tofile(quality_path)

        valid_count = int(np.isfinite(heightmap).sum())
        no_data_count = int(np.isnan(heightmap).sum())
        finite_values = heightmap[np.isfinite(heightmap)]

        dem_path_obj = Path(dem_path)
        dem_file_stat = dem_path_obj.stat()
        dem_remote_metadata = http_head(dem_url) if dem_url else None
        count_path_obj = Path(count_map) if count_map else None
        count_remote_metadata = http_head(count_map_url) if count_map and count_map_url else None
        outputs = [
            ("demNativeCrop", dem_crop_path),
            ("heightmap10m", heightmap_path),
            ("qualityCounts10m", quality_path),
            ("validityMask10m", validity_mask_path),
        ]
        preview_path = output_root / "terrain-preview.png"
        if preview:
            write_preview(heightmap, preview_path)
            outputs.append(("previewImage", preview_path))

        output_files = [
            {
                "key": key,
                "path": str(path),
                "sizeBytes": path.stat().st_size,
                "sha256": file_sha256(str(path)),
            }
            for key, path in outputs
        ]
        source_count_bounds = None
        count_source_metadata: dict[str, Any] | None = None
        if count_map:
            with rasterio.open(count_map) as count_source:
                source_count_bounds = {
                    "left": float(count_source.bounds.left),
                    "bottom": float(count_source.bounds.bottom),
                    "right": float(count_source.bounds.right),
                    "top": float(count_source.bounds.top),
                }
                count_stat = count_path_obj.stat() if count_path_obj else None
                count_source_metadata = {
                    "path": str(count_path_obj),
                    "sizeBytes": count_stat.st_size if count_stat else None,
                    "fileLastWriteTimeUtc": datetime.fromtimestamp(count_stat.st_mtime, timezone.utc).isoformat()
                    if count_stat
                    else None,
                    "width": int(count_source.width),
                    "height": int(count_source.height),
                    "bandCount": int(count_source.count),
                    "dtype": str(count_source.dtypes[0]),
                    "crsWkt": count_source.crs.to_wkt() if count_source.crs else None,
                    "transform": list(count_source.transform),
                    "bounds": source_count_bounds,
                    "nodata": manifest_nodata(count_source.nodata),
                    "scale": float(count_source.scales[0]) if len(count_source.scales) else 1.0,
                    "offset": float(count_source.offsets[0]) if len(count_source.offsets) else 0.0,
                    "remoteMetadata": count_remote_metadata,
                }

        browser_site_row, browser_site_column = rasterio.transform.rowcol(out_transform, x_center, y_center)
        browser_site_x, browser_site_y = rasterio.transform.xy(
            out_transform, browser_site_row, browser_site_column, offset="center"
        )
        site_to_browser_sample_distance = float(
            np.hypot(browser_site_x - x_center, browser_site_y - y_center)
        )

        warnings = [
            "The DEM mosaic contains interpolated fill in sparse areas; use the quality map and validity mask before treating a cell as direct measurement.",
            "This local crop is prepared only for the selected site and is not a global terrain surface.",
            "The 10 m browser grid averages 5 m source pixels and does not create independent 10 m measurements.",
        ]
        if src.tags().get("AREA_OR_POINT") == "Area" and src.tags().get("NC_GLOBAL#node_offset") == "1":
            warnings.append(
                "The GeoTIFF AREA_OR_POINT tag says Area while the PGDA product documentation and GMT node_offset=1 indicate pixel-centred registration; the source affine transform is preserved."
            )

        manifest = {
            "schemaVersion": 1,
            "site": {
                "latitudeDegrees": float(latitude),
                "longitudeDegrees": float(longitude),
                "longitudeConvention": "east-positive",
                "siteKey": site_key(latitude, longitude),
                "source": "explicit-cli-arguments",
            },
            "crop": {
                "widthMeters": float(crop_width_m),
                "heightMeters": float(crop_height_m),
                "centreProjectedX": float(x_center),
                "centreProjectedY": float(y_center),
                "requestedSiteToCropCentreDistanceMeters": 0.0,
                "left": float(left),
                "right": float(right),
                "bottom": float(bottom),
                "top": float(top),
            },
            "sourceProduct": {
                "title": "NASA/GSFC PGDA South Pole LOLA DEM Mosaic",
                "version": "87S 5 m/pixel mosaic",
                "page": "https://pgda.gsfc.nasa.gov/products/81",
                "demUrl": dem_url or DEFAULT_DEM_URL,
                "countMapUrl": count_map_url or DEFAULT_COUNT_MAP_URL,
                "citation": "Barker et al. (2021), Improved LOLA Elevation Maps for South Pole Landing Sites: Error Estimates and Their Impact on Illumination Conditions, Planetary & Space Science 203, 105119.",
                "publishedSizeBytes": {
                    "dem": 3465285714,
                    "countMap": 145895726,
                },
                "demRemoteMetadata": dem_remote_metadata,
                "countMapRemoteMetadata": count_remote_metadata,
                "demSourceFile": {
                    "path": str(dem_path_obj),
                    "sizeBytes": dem_file_stat.st_size,
                    "fileLastWriteTimeUtc": datetime.fromtimestamp(dem_file_stat.st_mtime, timezone.utc).isoformat(),
                },
                "countMapSourceFile": count_source_metadata,
            },
            "geodesy": {
                "crsWkt": src.crs.to_wkt(),
                "projection": "south-polar stereographic",
                "xYUnits": "metres",
                "bodyFrame": "MOON_ME / JPL DE421",
                "bodyRadiusMeters": 1737400.0,
                "ellipsoid": {"semiMajorAxisMeters": 1737400.0, "semiMinorAxisMeters": 1737400.0},
                "pixelRegistration": "pixel-centre",
                "pixelRegistrationEvidence": {
                    "productPage": "PGDA product 81 documents GMT pixel-registered coordinates as pixel centres",
                    "gmtNodeOffset": src.tags().get("NC_GLOBAL#node_offset"),
                    "geoTiffAreaOrPointTag": src.tags().get("AREA_OR_POINT"),
                },
                "nativeTransform": list(src.transform),
                "nativeBounds": {"left": float(src.bounds.left), "bottom": float(src.bounds.bottom), "right": float(src.bounds.right), "top": float(src.bounds.top)},
                "outputTransform": list(out_transform),
                "outputSpacingMeters": float(target_pixel_size),
                "outputSpacingMetersXY": {"x": float(target_pixel_size), "y": float(target_pixel_size)},
                "width": int(out_width),
                "height": int(out_height),
            },
            "sourceRaster": {
                "path": str(dem_path_obj),
                "sizeBytes": dem_file_stat.st_size,
                "fileLastWriteTimeUtc": datetime.fromtimestamp(dem_file_stat.st_mtime, timezone.utc).isoformat(),
                "width": int(src.width),
                "height": int(src.height),
                "bandCount": int(src.count),
                "dtype": str(src.dtypes[0]),
                "crsWkt": src.crs.to_wkt(),
                "transform": list(src.transform),
                "bounds": {
                    "left": float(src.bounds.left),
                    "bottom": float(src.bounds.bottom),
                    "right": float(src.bounds.right),
                    "top": float(src.bounds.top),
                },
                "pixelSpacingMeters": {"x": float(src.transform.a), "y": abs(float(src.transform.e))},
                "nodata": manifest_nodata(src.nodata),
                "scale": float(src.scales[0]) if len(src.scales) else 1.0,
                "offset": float(src.offsets[0]) if len(src.offsets) else 0.0,
                "elevationUnits": "metres",
                "pixelRegistrationTag": src.tags().get("AREA_OR_POINT"),
                "gmtNodeOffset": src.tags().get("NC_GLOBAL#node_offset"),
            },
            "vertical": {
                "units": "metres",
                "sourceNodata": manifest_nodata(native_nodata),
                "outputNodata": "NaN",
                "scale": float(src.scales[0]) if len(src.scales) else 1.0,
                "offset": float(src.offsets[0]) if len(src.offsets) else 0.0,
                "validSamplePercentage": float(valid_count / (out_width * out_height) * 100.0) if out_width * out_height else 0.0,
                "noDataPercentage": float(no_data_count / (out_width * out_height) * 100.0) if out_width * out_height else 0.0,
            },
            "nativeRaster": {
                "path": str(dem_crop_path),
                "width": int(native_array.shape[1]),
                "height": int(native_array.shape[0]),
                "dtype": "float32",
                "nodata": "NaN",
                "spacingMeters": float(abs(src.transform.a)),
                "bounds": {
                    "left": float(native_transform.c),
                    "bottom": float(native_transform.f + native_transform.e * native_array.shape[0]),
                    "right": float(native_transform.c + native_transform.a * native_array.shape[1]),
                    "top": float(native_transform.f),
                },
            },
            "browserGrid": {
                "path": str(heightmap_path),
                "width": int(out_width),
                "height": int(out_height),
                "dtype": "float32",
                "byteOrder": "little-endian",
                "actualSpacingMeters": float(target_pixel_size),
                "actualSpacingMetersXY": {"x": float(target_pixel_size), "y": float(target_pixel_size)},
                "resamplingMethod": "average",
                "nodataEncoding": "NaN",
                "validSampleCount": int(valid_count),
            },
            "quality": {
                "path": str(quality_path),
                "countMapPresent": bool(count_map),
                "status": "available" if count_map else "unavailable",
                "alignmentMethod": "reproject-to-output-grid",
                "sourceBounds": source_count_bounds,
                "countSemantics": "sum of source LDEC return-support values reprojected to each 10 m output pixel; mosaicked support can include blended values",
                "countZeroMeaning": "source count of zero means no LOLA returns in that source pixel; zero remains valid count data",
                "countNaNMeaning": "count data unavailable or outside source coverage",
            },
            "statistics": {
                "min": float(np.min(finite_values)) if valid_count else None,
                "max": float(np.max(finite_values)) if valid_count else None,
                "mean": float(np.mean(finite_values)) if valid_count else None,
                "median": float(np.median(finite_values)) if valid_count else None,
                "validSampleCount": int(valid_count),
                "noDataSampleCount": int(no_data_count),
            },
            "verification": {
                "sourceToCropSampleComparisons": source_sample_comparisons,
                "sourceToCropSamplesMatch": all(sample["match"] for sample in source_sample_comparisons),
                "selectedSiteProjectedCoordinatesMeters": {"x": float(x_center), "y": float(y_center)},
                "selectedSiteInsideSourceBounds": True,
                "selectedSiteToNearestBrowserGridSampleMeters": site_to_browser_sample_distance,
                "pixelCenterToleranceMeters": float(target_pixel_size * np.sqrt(2.0) / 2.0),
            },
            "preparation": {
                "timestampUtc": datetime.now(timezone.utc).isoformat(),
                "script": "scripts/terrain/prepare_lola_dem.py",
                "pythonInterpreter": sys.version.split()[0],
                "rasterioVersion": rasterio.__version__,
                "pyprojVersion": __import__("pyproj").__version__,
                "numpyVersion": np.__version__,
                "force": bool(force),
            },
            "integrity": {"outputs": output_files},
            "warnings": warnings,
            "paths": {
                "demNativeCrop": str(dem_crop_path),
                "heightmap10m": str(heightmap_path),
                "qualityCounts10m": str(quality_path),
                "validityMask10m": str(validity_mask_path),
                "previewImage": str(preview_path) if preview else None,
                "manifest": str(output_root / "terrain-manifest.json"),
            },
        }

        manifest_path = output_root / "terrain-manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2, allow_nan=False), encoding="utf-8")

        return manifest


def main() -> int:
    args = parse_args()

    if args.download:
        target_dir = Path("data/lunar-terrain/raw")
        target_dir.mkdir(parents=True, exist_ok=True)
        for url, filename in [(args.dem_url, "ldem_87s_5mpp.tif"), (args.count_map_url, "ldec_87s_5mpp.tif")]:
            target = target_dir / filename
            print(f"Downloading {url} -> {target}")
            try:
                print(json.dumps(download_file_resumable(url, target, force=args.force), indent=2))
            except (OSError, RuntimeError, URLError, ValueError) as exc:  # pragma: no cover
                print(f"Download failed for {url}: {exc}", file=sys.stderr)
                return 1

    if args.dem and os.path.exists(args.dem):
        try:
            validate_source_file_size(args.dem, args.dem_url)
            if args.count_map:
                validate_source_file_size(args.count_map, args.count_map_url)
        except (OSError, RuntimeError, ValueError) as exc:  # pragma: no cover
            print(f"Source validation failed: {exc}", file=sys.stderr)
            return 1
        if args.inspect_only:
            print(json.dumps(inspect_local_dem(args.dem, args.latitude, args.longitude), indent=2))
            return 0
        if args.latitude is None or args.longitude is None:
            print("Cropping requires explicit --latitude and --longitude values.", file=sys.stderr)
            return 2
        manifest = prepare_crop(
            dem_path=args.dem,
            latitude=args.latitude,
            longitude=args.longitude,
            crop_width_m=args.crop_width_meters,
            crop_height_m=args.crop_height_meters,
            target_spacing=args.target_spacing,
            output_dir=args.output_dir,
            count_map=args.count_map or None,
            preview=args.preview,
            force=args.force,
            dem_url=args.dem_url,
            count_map_url=args.count_map_url,
        )
        print(json.dumps(manifest, indent=2))
        return 0

    report = {
        "site": {
            "latitudeDegrees": args.latitude,
            "longitudeDegrees": args.longitude,
        },
        "product": {
            "demUrl": args.dem_url,
            "countMapUrl": args.count_map_url,
        },
        "sourceStatus": {
            "dem": http_head(args.dem_url),
            "countMap": http_head(args.count_map_url),
        },
        "inspectionNotes": [
            "No local GeoTIFF was supplied; this execution is a source-validation pass only.",
            "The 5 m South Pole mosaic is a large product and must be downloaded before a native crop is generated.",
            "The active site remains read from the CLI input or app state; default values are not proof of live selection.",
        ],
    }
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
