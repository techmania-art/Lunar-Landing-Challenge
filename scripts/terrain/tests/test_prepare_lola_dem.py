import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import sys
from pathlib import Path

import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin
from pyproj import CRS

ROOT = Path(__file__).resolve().parents[3]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.terrain.prepare_lola_dem import (
    compute_site_coverage,
    download_file_resumable,
    inspect_local_dem,
    parse_args,
    prepare_crop,
    projected_point_for_site,
    site_key,
    validate_source_file_size,
)

LUNAR_STEREOGRAPHIC_WKT = (
    'PROJCS["Moon2000_spole",GEOGCS["GCS_Moon",DATUM["D_Moon_2000",'
    'SPHEROID["Moon_2000_IAU_IAG",1737400,0]],PRIMEM["Reference_Meridian",0],'
    'UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]]],'
    'PROJECTION["Polar_Stereographic"],PARAMETER["latitude_of_origin",-90],'
    'PARAMETER["central_meridian",0],PARAMETER["false_easting",0],'
    'PARAMETER["false_northing",0],UNIT["metre",1],'
    'AXIS["Easting",NORTH],AXIS["Northing",NORTH]]'
)

DOWNLOAD_CONTENT = b"validated-test-file-content"


class DownloadHandler(BaseHTTPRequestHandler):
    def do_HEAD(self) -> None:
        self.send_response(200)
        self.send_header("Content-Length", str(len(self.server.data)))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("ETag", self.server.etag)
        self.send_header("Last-Modified", self.server.last_modified)
        self.end_headers()

    def do_GET(self) -> None:
        range_header = self.headers.get("Range")
        self.server.requests.append((range_header, self.headers.get("If-Range")))

        if range_header and not self.server.ignore_range:
            start = int(range_header.removeprefix("bytes=").removesuffix("-"))
            body = self.server.data[start:]
            response_status = 206
            range_start = 0 if self.server.bad_content_range else start
        else:
            start = 0
            body = self.server.data
            response_status = 200
            range_start = 0

        expected_response_length = len(body)
        self.send_response(response_status)
        self.send_header("Content-Length", str(expected_response_length))
        self.send_header("ETag", self.server.etag)
        self.send_header("Last-Modified", self.server.last_modified)
        if response_status == 206:
            self.send_header(
                "Content-Range",
                f"bytes {range_start}-{len(self.server.data) - 1}/{len(self.server.data)}",
            )
        self.end_headers()

        if self.server.truncate:
            body = body[:-4]
        self.wfile.write(body)

    def log_message(self, _format: str, *_args: object) -> None:
        return


@pytest.fixture
def download_server():
    server = ThreadingHTTPServer(("127.0.0.1", 0), DownloadHandler)
    server.data = DOWNLOAD_CONTENT
    server.etag = '"test-etag-v1"'
    server.last_modified = "Mon, 16 Nov 2026 10:00:00 GMT"
    server.ignore_range = False
    server.bad_content_range = False
    server.truncate = False
    server.requests = []
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield server
    finally:
        server.shutdown()
        thread.join()
        server.server_close()


def _download_url(server: ThreadingHTTPServer) -> str:
    return f"http://127.0.0.1:{server.server_address[1]}/source.tif"


def _write_resume_state(target: Path, url: str, server: ThreadingHTTPServer, prefix: bytes) -> Path:
    partial = Path(f"{target}.part")
    partial.write_bytes(prefix)
    metadata = {
        "sourceUrl": url,
        "finalUrl": url,
        "contentLength": len(DOWNLOAD_CONTENT),
        "etag": server.etag,
        "lastModified": server.last_modified,
    }
    Path(f"{partial}.json").write_text(json.dumps(metadata), encoding="utf-8")
    return partial


def test_site_key_formats_hemispheres() -> None:
    assert site_key(-89.5, 0.0) == "site_89_50S_00_00E"
    assert site_key(12.34, -56.78) == "site_12_34N_56_78W"


def test_cli_does_not_silently_supply_mission_coordinates(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(sys, "argv", ["prepare_lola_dem.py"])

    args = parse_args()

    assert args.latitude is None
    assert args.longitude is None


def test_projected_point_uses_raster_lunar_geographic_crs() -> None:
    lunar_crs = CRS.from_wkt(LUNAR_STEREOGRAPHIC_WKT)
    x, y = projected_point_for_site(-89.5, 0.0, lunar_crs)

    assert abs(x) < 1e-6
    assert abs(y - 15161.7714) < 0.01


def test_download_resumes_from_offset_and_validates_content_range(
    tmp_path: Path, download_server: ThreadingHTTPServer
) -> None:
    url = _download_url(download_server)
    target = tmp_path / "source.tif"
    partial = _write_resume_state(target, url, download_server, DOWNLOAD_CONTENT[:7])

    result = download_file_resumable(url, target)

    assert download_server.requests == [(f"bytes=7-", download_server.etag)]
    assert target.read_bytes() == DOWNLOAD_CONTENT
    assert result["status"] == "downloaded"
    assert not partial.exists()
    assert not Path(f"{partial}.json").exists()


def test_download_refuses_server_that_ignores_range(
    tmp_path: Path, download_server: ThreadingHTTPServer
) -> None:
    download_server.ignore_range = True
    url = _download_url(download_server)
    target = tmp_path / "source.tif"
    partial = _write_resume_state(target, url, download_server, DOWNLOAD_CONTENT[:7])

    with pytest.raises(RuntimeError, match="ignored the requested Range"):
        download_file_resumable(url, target)

    assert partial.read_bytes() == DOWNLOAD_CONTENT[:7]
    assert not target.exists()


def test_download_refuses_invalid_content_range(
    tmp_path: Path, download_server: ThreadingHTTPServer
) -> None:
    download_server.bad_content_range = True
    url = _download_url(download_server)
    target = tmp_path / "source.tif"
    partial = _write_resume_state(target, url, download_server, DOWNLOAD_CONTENT[:7])

    with pytest.raises(RuntimeError, match="Invalid Content-Range"):
        download_file_resumable(url, target)

    assert partial.read_bytes() == DOWNLOAD_CONTENT[:7]
    assert not target.exists()


@pytest.mark.parametrize("changed_header", ["etag", "last_modified"])
def test_download_refuses_changed_remote_identity(
    tmp_path: Path, download_server: ThreadingHTTPServer, changed_header: str
) -> None:
    url = _download_url(download_server)
    target = tmp_path / "source.tif"
    partial = _write_resume_state(target, url, download_server, DOWNLOAD_CONTENT[:7])
    if changed_header == "etag":
        download_server.etag = '"test-etag-v2"'
    else:
        download_server.last_modified = "Tue, 17 Nov 2026 10:00:00 GMT"

    with pytest.raises(RuntimeError, match="source identity changed"):
        download_file_resumable(url, target)

    assert download_server.requests == []
    assert partial.read_bytes() == DOWNLOAD_CONTENT[:7]
    assert not target.exists()


def test_download_detects_truncated_response_and_preserves_partial(
    tmp_path: Path, download_server: ThreadingHTTPServer, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("scripts.terrain.prepare_lola_dem.time.sleep", lambda _seconds: None)
    download_server.truncate = True
    target = tmp_path / "source.tif"

    with pytest.raises(RuntimeError, match="Truncated or incomplete"):
        download_file_resumable(_download_url(download_server), target)

    partial = Path(f"{target}.part")
    assert len(download_server.requests) == 5
    assert partial.exists()
    assert partial.stat().st_size < len(DOWNLOAD_CONTENT)
    assert not target.exists()


def test_existing_partial_without_identity_metadata_is_not_overwritten(
    tmp_path: Path, download_server: ThreadingHTTPServer
) -> None:
    target = tmp_path / "source.tif"
    target.write_bytes(DOWNLOAD_CONTENT[:7])

    with pytest.raises(RuntimeError, match="preserving it rather than overwriting"):
        download_file_resumable(_download_url(download_server), target)

    assert target.read_bytes() == DOWNLOAD_CONTENT[:7]


def test_source_size_validation_rejects_partial_file(
    tmp_path: Path, download_server: ThreadingHTTPServer
) -> None:
    target = tmp_path / "source.tif"
    target.write_bytes(DOWNLOAD_CONTENT)
    remote = validate_source_file_size(target, _download_url(download_server))
    assert remote["content_length"] == len(DOWNLOAD_CONTENT)

    target.write_bytes(DOWNLOAD_CONTENT[:7])
    with pytest.raises(ValueError, match="incomplete or unexpected"):
        validate_source_file_size(target, _download_url(download_server))


def test_prepare_crop_creates_manifest_and_outputs(tmp_path: Path) -> None:
    dem_path = tmp_path / "demo-dem.tif"
    count_path = tmp_path / "demo-count.tif"

    arr = np.array([[10.0, 11.0], [12.0, np.nan]], dtype=np.float32)
    count = np.array([[2.0, 5.0], [0.0, np.nan]], dtype=np.float32)

    transform = from_origin(0.0, 2.0, 1.0, 1.0)
    with rasterio.open(
        dem_path,
        "w",
        driver="GTiff",
        height=2,
        width=2,
        count=1,
        dtype="float32",
        crs="EPSG:4326",
        transform=transform,
        nodata=np.nan,
    ) as dst:
        dst.write(arr, 1)

    with rasterio.open(
        count_path,
        "w",
        driver="GTiff",
        height=2,
        width=2,
        count=1,
        dtype="float32",
        crs="EPSG:4326",
        transform=transform,
        nodata=np.nan,
    ) as dst:
        dst.write(count, 1)

    manifest = prepare_crop(
        dem_path=str(dem_path),
        count_map=str(count_path),
        latitude=1.0,
        longitude=1.0,
        crop_width_m=2.0,
        crop_height_m=2.0,
        target_spacing=1.0,
        output_dir=str(tmp_path / "processed"),
        preview=True,
        force=True,
    )

    assert manifest["site"]["siteKey"] == site_key(1.0, 1.0)
    assert manifest["browserGrid"]["actualSpacingMeters"] == 1.0
    root = tmp_path / "processed" / site_key(1.0, 1.0)
    assert (root / "heightmap-10m.f32").exists()
    assert (root / "quality-counts-10m.f32").exists()
    assert (root / "validity-mask-10m.bin").exists()
    assert (root / "terrain-preview.png").exists()
    assert (root / "terrain-manifest.json").exists()
    payload = json.loads((root / "terrain-manifest.json").read_text(encoding="utf-8"))
    assert payload["browserGrid"]["width"] > 0
    assert payload["browserGrid"]["height"] == 2
    assert payload["geodesy"]["outputTransform"] == list(transform)
    assert payload["sourceRaster"]["width"] == 2
    assert payload["sourceRaster"]["height"] == 2
    assert payload["sourceRaster"]["nodata"] == "NaN"
    assert payload["quality"]["status"] == "available"
    assert len(payload["integrity"]["outputs"]) == 5
    assert payload["verification"]["sourceToCropSamplesMatch"] is True
    assert all(sample["match"] for sample in payload["verification"]["sourceToCropSampleComparisons"])
    assert (
        payload["verification"]["selectedSiteToNearestBrowserGridSampleMeters"]
        <= payload["verification"]["pixelCenterToleranceMeters"]
    )

    with rasterio.open(dem_path) as source, rasterio.open(root / "dem-native-crop.tif") as crop:
        np.testing.assert_array_equal(crop.read(1), source.read(1))
        assert crop.transform == source.transform
        assert crop.bounds == source.bounds
        assert crop.scales == source.scales
        assert crop.offsets == source.offsets

    heightmap_path = root / "heightmap-10m.f32"
    heightmap = np.fromfile(heightmap_path, dtype="<f4").reshape((2, 2))
    np.testing.assert_array_equal(heightmap, arr)
    assert heightmap_path.stat().st_size == payload["browserGrid"]["width"] * payload["browserGrid"]["height"] * 4
    assert payload["browserGrid"]["actualSpacingMeters"] == pytest.approx(1.0)

    quality = np.fromfile(root / "quality-counts-10m.f32", dtype="<f4").reshape((2, 2))
    np.testing.assert_array_equal(quality, count)
    validity = np.fromfile(root / "validity-mask-10m.bin", dtype=np.uint8).reshape((2, 2))
    np.testing.assert_array_equal(validity, np.array([[1, 1], [1, 0]], dtype=np.uint8))

    source_info = inspect_local_dem(str(dem_path), latitude=1.0, longitude=1.0)
    assert source_info["width"] == 2
    assert source_info["height"] == 2
    assert source_info["num_valid_pixels"] == 3
    assert source_info["num_nodata_pixels"] == 1
    assert source_info["selected_site_window"]["status"] == "read"


def test_crop_bounds_outside_source_are_rejected(tmp_path: Path) -> None:
    dem_path = tmp_path / "small-dem.tif"
    with rasterio.open(
        dem_path,
        "w",
        driver="GTiff",
        height=2,
        width=2,
        count=1,
        dtype="float32",
        crs="EPSG:4326",
        transform=from_origin(0.0, 2.0, 1.0, 1.0),
        nodata=np.nan,
    ) as dst:
        dst.write(np.ones((2, 2), dtype=np.float32), 1)

    with pytest.raises(ValueError, match="exceeds raster bounds"):
        prepare_crop(
            dem_path=str(dem_path),
            latitude=10.0,
            longitude=10.0,
            crop_width_m=2.0,
            crop_height_m=2.0,
            target_spacing=1.0,
            output_dir=str(tmp_path / "processed"),
        )


def test_missing_count_map_remains_unknown_not_zero(tmp_path: Path) -> None:
    dem_path = tmp_path / "dem-without-counts.tif"
    with rasterio.open(
        dem_path,
        "w",
        driver="GTiff",
        height=2,
        width=2,
        count=1,
        dtype="float32",
        crs="EPSG:4326",
        transform=from_origin(0.0, 2.0, 1.0, 1.0),
        nodata=np.nan,
    ) as dst:
        dst.write(np.ones((2, 2), dtype=np.float32), 1)

    manifest = prepare_crop(
        dem_path=str(dem_path),
        latitude=1.0,
        longitude=1.0,
        crop_width_m=2.0,
        crop_height_m=2.0,
        target_spacing=1.0,
        output_dir=str(tmp_path / "processed"),
    )

    quality = np.fromfile(manifest["paths"]["qualityCounts10m"], dtype="<f4")
    assert manifest["quality"]["status"] == "unavailable"
    assert np.isnan(quality).all()


def test_count_map_quality_aggregates_support_values_when_downsampling(tmp_path: Path) -> None:
    dem_path = tmp_path / "dem.tif"
    count_path = tmp_path / "counts.tif"
    transform = from_origin(0.0, 2.0, 1.0, 1.0)
    with rasterio.open(
        dem_path,
        "w",
        driver="GTiff",
        height=2,
        width=2,
        count=1,
        dtype="float32",
        crs="EPSG:4326",
        transform=transform,
        nodata=np.nan,
    ) as dst:
        dst.write(np.array([[10.0, 11.0], [12.0, 13.0]], dtype=np.float32), 1)
    with rasterio.open(
        count_path,
        "w",
        driver="GTiff",
        height=2,
        width=2,
        count=1,
        dtype="uint8",
        crs="EPSG:4326",
        transform=transform,
    ) as dst:
        dst.write(np.array([[2, 5], [0, 3]], dtype=np.uint8), 1)

    manifest = prepare_crop(
        dem_path=str(dem_path),
        count_map=str(count_path),
        latitude=1.0,
        longitude=1.0,
        crop_width_m=2.0,
        crop_height_m=2.0,
        target_spacing=2.0,
        output_dir=str(tmp_path / "processed"),
    )

    quality = np.fromfile(manifest["paths"]["qualityCounts10m"], dtype="<f4")
    assert quality.tolist() == [10.0]
    assert "sum of source" in manifest["quality"]["countSemantics"]


def test_compute_site_coverage_uses_lunar_crs(tmp_path: Path) -> None:
    dem_path = tmp_path / "lunar-dem.tif"
    lunar_crs = CRS.from_wkt(LUNAR_STEREOGRAPHIC_WKT)
    transform = from_origin(-50000.0, 50000.0, 50.0, 50.0)
    with rasterio.open(
        dem_path,
        "w",
        driver="GTiff",
        height=2000,
        width=2000,
        count=1,
        dtype="float32",
        crs=lunar_crs.to_wkt(),
        transform=transform,
        nodata=np.nan,
    ):
        pass

    coverage = compute_site_coverage(-89.5, 0.0, str(dem_path))

    assert coverage["status"] == "inside"
    assert coverage["inside_raster_bounds"] is True
    assert coverage["raster_projection_x_m"] == pytest.approx(0.0)
    assert coverage["raster_projection_y_m"] == pytest.approx(15161.7714, abs=0.01)
