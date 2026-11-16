import type {
  PreparedTerrainGrid,
  TerrainLayerStyle,
} from "./terrain-package-types";
import { projectedMetersToLunarLatLon } from "./terrain-package-types";

export interface MeshChunkData {
  positions: Float64Array; // (x, y, z) in Moon-centred Cartesian meters
  normals: Float32Array; // (nx, ny, nz) normalized outward
  textureCoordinates: Float32Array; // (u, v) normalized [0, 1]
  indices: Uint16Array | Uint32Array;
  minElevation: number;
  maxElevation: number;
}

export interface TerrainMeshData {
  chunks: MeshChunkData[];
  totalVertices: number;
  totalTriangles: number;
  minElevation: number;
  maxElevation: number;
  meanElevation: number;
  centerCartesian: [number, number, number];
}

/**
 * Builds non-flat 3D lunar terrain mesh geometry from a PreparedTerrainGrid.
 * Chunks the mesh into blocks for WebGL efficiency and index safety.
 */
export function buildTerrainMeshData(
  grid: PreparedTerrainGrid,
  options: {
    stride?: number; // 1 = full 10m (1000x1000), 2 = 20m (500x500)
    chunkSize?: number; // e.g. 250 samples per chunk edge
    verticalExaggeration?: number; // Default 1.0 (true vertical scale)
  } = {},
): TerrainMeshData {
  const stride = Math.max(1, Math.floor(options.stride || 2));
  const chunkSize = Math.max(50, Math.floor(options.chunkSize || 250));
  const exaggeration = options.verticalExaggeration ?? 1.0;

  const width = grid.gridWidth;
  const height = grid.gridHeight;
  const transform = grid.geodesy.outputTransform;
  const bodyRadius = grid.geodesy.bodyRadiusMeters;

  const effectiveWidth = Math.floor(width / stride);
  const effectiveHeight = Math.floor(height / stride);

  // Compute 3D Cartesian coordinates for the sampled grid
  // Pre-allocate position grid: [row][col] -> [x, y, z]
  const posCount = effectiveWidth * effectiveHeight;
  const allPositionsX = new Float64Array(posCount);
  const allPositionsY = new Float64Array(posCount);
  const allPositionsZ = new Float64Array(posCount);
  const allValid = new Uint8Array(posCount);

  let sumX = 0;
  let sumY = 0;
  let sumZ = 0;
  let validCenterCount = 0;

  for (let r = 0; r < effectiveHeight; r++) {
    const origRow = r * stride;
    // Pixel-centre projected coordinate
    const projY = transform[5] + (origRow + 0.5) * transform[4];

    for (let c = 0; c < effectiveWidth; c++) {
      const origCol = c * stride;
      const idx = origRow * width + origCol;
      const posIdx = r * effectiveWidth + c;

      const isValid = grid.validityMask[idx] === 1;
      allValid[posIdx] = isValid ? 1 : 0;

      if (!isValid) {
        continue;
      }

      const projX = transform[2] + (origCol + 0.5) * transform[0];
      const { latitude, longitude } = projectedMetersToLunarLatLon(projX, projY, bodyRadius);

      const elev = grid.elevations[idx] * exaggeration;
      const rTotal = bodyRadius + elev;

      const latRad = (latitude * Math.PI) / 180.0;
      const lonRad = (longitude * Math.PI) / 180.0;

      const cosLat = Math.cos(latRad);
      const px = rTotal * cosLat * Math.cos(lonRad);
      const py = rTotal * cosLat * Math.sin(lonRad);
      const pz = rTotal * Math.sin(latRad);

      allPositionsX[posIdx] = px;
      allPositionsY[posIdx] = py;
      allPositionsZ[posIdx] = pz;

      sumX += px;
      sumY += py;
      sumZ += pz;
      validCenterCount++;
    }
  }

  const centerCartesian: [number, number, number] =
    validCenterCount > 0
      ? [sumX / validCenterCount, sumY / validCenterCount, sumZ / validCenterCount]
      : [0, 0, -bodyRadius];

  // Compute vertex normals via central difference on grid
  const allNormalsX = new Float32Array(posCount);
  const allNormalsY = new Float32Array(posCount);
  const allNormalsZ = new Float32Array(posCount);

  for (let r = 0; r < effectiveHeight; r++) {
    for (let c = 0; c < effectiveWidth; c++) {
      const posIdx = r * effectiveWidth + c;
      if (allValid[posIdx] === 0) continue;

      // Tangent X (c+1 - c-1)
      const cPrev = Math.max(0, c - 1);
      const cNext = Math.min(effectiveWidth - 1, c + 1);
      const idxL = r * effectiveWidth + cPrev;
      const idxR = r * effectiveWidth + cNext;

      const tx = allPositionsX[idxR] - allPositionsX[idxL];
      const ty = allPositionsY[idxR] - allPositionsY[idxL];
      const tz = allPositionsZ[idxR] - allPositionsZ[idxL];

      // Tangent Y (r+1 - r-1)
      const rPrev = Math.max(0, r - 1);
      const rNext = Math.min(effectiveHeight - 1, r + 1);
      const idxT = rPrev * effectiveWidth + c;
      const idxB = rNext * effectiveWidth + c;

      const bx = allPositionsX[idxB] - allPositionsX[idxT];
      const by = allPositionsY[idxB] - allPositionsY[idxT];
      const bz = allPositionsZ[idxB] - allPositionsZ[idxT];

      // Cross product: T x B
      let nx = ty * bz - tz * by;
      let ny = tz * bx - tx * bz;
      let nz = tx * by - ty * bx;

      // Ensure outward-facing normal (dot product with position > 0)
      const px = allPositionsX[posIdx];
      const py = allPositionsY[posIdx];
      const pz = allPositionsZ[posIdx];
      if (nx * px + ny * py + nz * pz < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }

      const len = Math.hypot(nx, ny, nz);
      if (len > 1e-8) {
        allNormalsX[posIdx] = nx / len;
        allNormalsY[posIdx] = ny / len;
        allNormalsZ[posIdx] = nz / len;
      } else {
        // Fallback: radial normal from Moon center
        const pLen = Math.hypot(px, py, pz);
        allNormalsX[posIdx] = px / pLen;
        allNormalsY[posIdx] = py / pLen;
        allNormalsZ[posIdx] = pz / pLen;
      }
    }
  }

  // Partition the grid into chunks
  const chunks: MeshChunkData[] = [];
  const chunkCols = Math.ceil(effectiveWidth / chunkSize);
  const chunkRows = Math.ceil(effectiveHeight / chunkSize);

  let totalTriangles = 0;
  let totalVertices = 0;

  for (let cr = 0; cr < chunkRows; cr++) {
    const rowStart = cr * chunkSize;
    const rowEnd = Math.min(effectiveHeight - 1, (cr + 1) * chunkSize);
    const chunkH = rowEnd - rowStart + 1;

    for (let cc = 0; cc < chunkCols; cc++) {
      const colStart = cc * chunkSize;
      const colEnd = Math.min(effectiveWidth - 1, (cc + 1) * chunkSize);
      const chunkW = colEnd - colStart + 1;

      const numVertices = chunkW * chunkH;
      const positions = new Float64Array(numVertices * 3);
      const normals = new Float32Array(numVertices * 3);
      const textureCoordinates = new Float32Array(numVertices * 2);

      let chunkMinElev = Number.POSITIVE_INFINITY;
      let chunkMaxElev = Number.NEGATIVE_INFINITY;

      for (let lr = 0; lr < chunkH; lr++) {
        const gr = rowStart + lr;
        for (let lc = 0; lc < chunkW; lc++) {
          const gc = colStart + lc;
          const globalIdx = gr * effectiveWidth + gc;
          const localIdx = lr * chunkW + lc;

          const px = allPositionsX[globalIdx];
          const py = allPositionsY[globalIdx];
          const pz = allPositionsZ[globalIdx];

          positions[localIdx * 3] = px;
          positions[localIdx * 3 + 1] = py;
          positions[localIdx * 3 + 2] = pz;

          normals[localIdx * 3] = allNormalsX[globalIdx];
          normals[localIdx * 3 + 1] = allNormalsY[globalIdx];
          normals[localIdx * 3 + 2] = allNormalsZ[globalIdx];

          // Texture coordinates: [0, 1] across entire grid
          textureCoordinates[localIdx * 2] = gc / (effectiveWidth - 1);
          textureCoordinates[localIdx * 2 + 1] = 1.0 - gr / (effectiveHeight - 1);

          const origIdx = (gr * stride) * width + (gc * stride);
          const elev = grid.elevations[origIdx];
          if (Number.isFinite(elev)) {
            if (elev < chunkMinElev) chunkMinElev = elev;
            if (elev > chunkMaxElev) chunkMaxElev = elev;
          }
        }
      }

      // Generate triangle indices (2 triangles per quad)
      // Exclude quads with invalid NoData vertices
      const indexList: number[] = [];
      for (let lr = 0; lr < chunkH - 1; lr++) {
        const gr = rowStart + lr;
        for (let lc = 0; lc < chunkW - 1; lc++) {
          const gc = colStart + lc;

          const g00 = gr * effectiveWidth + gc;
          const g10 = (gr + 1) * effectiveWidth + gc;
          const g01 = gr * effectiveWidth + (gc + 1);
          const g11 = (gr + 1) * effectiveWidth + (gc + 1);

          // All 4 vertices must be valid to form the quad
          if (
            allValid[g00] === 1 &&
            allValid[g10] === 1 &&
            allValid[g01] === 1 &&
            allValid[g11] === 1
          ) {
            const v00 = lr * chunkW + lc;
            const v10 = (lr + 1) * chunkW + lc;
            const v01 = lr * chunkW + (lc + 1);
            const v11 = (lr + 1) * chunkW + (lc + 1);

            // Triangle 1: (v00, v10, v01)
            indexList.push(v00, v10, v01);
            // Triangle 2: (v01, v10, v11)
            indexList.push(v01, v10, v11);
          }
        }
      }

      if (indexList.length > 0) {
        const indices =
          numVertices <= 65535 ? new Uint16Array(indexList) : new Uint32Array(indexList);

        chunks.push({
          positions,
          normals,
          textureCoordinates,
          indices,
          minElevation: Number.isFinite(chunkMinElev) ? chunkMinElev : grid.minElevation,
          maxElevation: Number.isFinite(chunkMaxElev) ? chunkMaxElev : grid.maxElevation,
        });

        totalTriangles += indexList.length / 3;
        totalVertices += numVertices;
      }
    }
  }

  return {
    chunks,
    totalVertices,
    totalTriangles,
    minElevation: grid.minElevation,
    maxElevation: grid.maxElevation,
    meanElevation: grid.meanElevation,
    centerCartesian,
  };
}

/**
 * Creates Cesium Primitive and appearances from TerrainMeshData.
 */
export function createCesiumTerrainPrimitive(
  Cesium: typeof import("cesium"),
  meshData: TerrainMeshData,
  layerStyle: TerrainLayerStyle = "hillshade",
): InstanceType<typeof import("cesium").Primitive> {
  const instances = meshData.chunks.map((chunk, index) => {
    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: chunk.positions,
        }),
        normal: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: chunk.normals,
        }),
        st: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: chunk.textureCoordinates,
        }),
      } as unknown as InstanceType<typeof Cesium.Geometry>["attributes"],
      indices: chunk.indices,
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      boundingSphere: Cesium.BoundingSphere.fromVertices(chunk.positions),
    });

    return new Cesium.GeometryInstance({
      geometry,
      id: `lola_terrain_chunk_${index}`,
    });
  });

  let material: InstanceType<typeof import("cesium").Material>;

  if (layerStyle === "elevation-color") {
    // Custom elevation-gradient shader material
    material = new Cesium.Material({
      fabric: {
        type: "ElevationRamp",
        uniforms: {
          minElev: meshData.minElevation,
          maxElev: meshData.maxElevation,
        },
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput) {
            czm_material material = czm_getDefaultMaterial(materialInput);
            float u = materialInput.st.t; // Normalized vertical ramp
            // Lunar hypsometric tint: deep blue -> teal -> olive -> amber -> white
            vec3 color = mix(vec3(0.08, 0.18, 0.36), vec3(0.35, 0.55, 0.45), smoothstep(0.0, 0.4, u));
            color = mix(color, vec3(0.72, 0.58, 0.35), smoothstep(0.4, 0.75, u));
            color = mix(color, vec3(0.92, 0.92, 0.95), smoothstep(0.75, 1.0, u));
            material.diffuse = color;
            material.specular = 0.05;
            material.shininess = 1.0;
            return material;
          }
        `,
      },
    });
  } else {
    // Default: Lunar regolith hillshade material
    material = new Cesium.Material({
      fabric: {
        type: "LunarRegolith",
        uniforms: {
          color: new Cesium.Color(0.68, 0.72, 0.78, 1.0),
        },
        source: `
          czm_material czm_getMaterial(czm_materialInput materialInput) {
            czm_material material = czm_getDefaultMaterial(materialInput);
            material.diffuse = vec3(0.65, 0.68, 0.73);
            material.specular = 0.02;
            material.shininess = 1.0;
            return material;
          }
        `,
      },
    });
  }

  const appearance = new Cesium.MaterialAppearance({
    material,
    translucent: false,
    closed: false,
    renderState: {
      wireframe: layerStyle === "wireframe",
    },
  });

  return new Cesium.Primitive({
    geometryInstances: instances,
    appearance,
    asynchronous: false,
    allowPicking: false,
  });
}
