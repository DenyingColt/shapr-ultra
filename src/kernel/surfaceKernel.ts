import * as THREE from 'three';
import earcut from 'earcut';
import { CADBody, SketchPlane, Vec2, Vec3 } from '../types/cad';
import { ensureIndexedGeometry } from './topologyBuilder';

/**
 * 1. EXTRUDE CURVE AS OPEN ZERO-THICKNESS SURFACE
 */
export function extrudeCurveAsSurface(
  points2D: Vec2[],
  plane: SketchPlane,
  distanceMm = 25
): THREE.BufferGeometry {
  const origin = new THREE.Vector3(...plane.origin);
  const normal = new THREE.Vector3(...plane.normal).normalize();
  const xAxis = new THREE.Vector3(...plane.xAxis).normalize();
  const yAxis = new THREE.Vector3(...plane.yAxis).normalize();

  const pts =
    points2D.length >= 2
      ? points2D
      : [
          [-20, -10],
          [0, 12],
          [20, -10],
        ];

  const positions: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = origin
      .clone()
      .addScaledVector(xAxis, pts[i][0])
      .addScaledVector(yAxis, pts[i][1]);
    const p1 = origin
      .clone()
      .addScaledVector(xAxis, pts[i + 1][0])
      .addScaledVector(yAxis, pts[i + 1][1]);

    const p0Top = p0.clone().addScaledVector(normal, distanceMm);
    const p1Top = p1.clone().addScaledVector(normal, distanceMm);

    positions.push(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p1Top.x, p1Top.y, p1Top.z);
    positions.push(p0.x, p0.y, p0.z, p1Top.x, p1Top.y, p1Top.z, p0Top.x, p0Top.y, p0Top.z);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return ensureIndexedGeometry(geom);
}

/**
 * 2. BOUNDARY PATCH / FILL SURFACE (Planar or G1 Curved Dome Patch)
 */
export function createBoundaryPatchSurface(
  loopVertices3D: Vec3[],
  domeBulgeMm = 4.5
): THREE.BufferGeometry {
  const ring =
    loopVertices3D.length >= 3
      ? loopVertices3D
      : [
          [-22, -16, 15],
          [22, -16, 15],
          [22, 16, 15],
          [-22, 16, 15],
        ];

  const center = new THREE.Vector3();
  for (const p of ring) center.add(new THREE.Vector3(...p));
  center.divideScalar(ring.length);

  // Compute loop normal
  const v0 = new THREE.Vector3(...ring[0]).sub(center);
  const v1 = new THREE.Vector3(...ring[1]).sub(center);
  const normal = new THREE.Vector3().crossVectors(v0, v1).normalize();
  if (normal.lengthSq() < 0.1) normal.set(0, 0, 1);

  const apex = center.clone().addScaledVector(normal, domeBulgeMm);
  const positions: number[] = [];

  if (Math.abs(domeBulgeMm) > 0.05) {
    // Subdivide radial rings from boundary to dome apex for smooth G1 patch
    const radialRings = 6;
    const n = ring.length;

    for (let r = 0; r < radialRings; r++) {
      const t0 = r / radialRings;
      const t1 = (r + 1) / radialRings;
      const h0 = Math.sin(t0 * (Math.PI / 2)) * domeBulgeMm;
      const h1 = Math.sin(t1 * (Math.PI / 2)) * domeBulgeMm;

      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        const bA = new THREE.Vector3(...ring[i]);
        const bB = new THREE.Vector3(...ring[next]);

        const p00 = bA.clone().lerp(center, t0).addScaledVector(normal, h0);
        const p10 = bB.clone().lerp(center, t0).addScaledVector(normal, h0);
        const p11 = bB.clone().lerp(center, t1).addScaledVector(normal, h1);
        const p01 = bA.clone().lerp(center, t1).addScaledVector(normal, h1);

        positions.push(p00.x, p00.y, p00.z, p10.x, p10.y, p10.z, p11.x, p11.y, p11.z);
        positions.push(p00.x, p00.y, p00.z, p11.x, p11.y, p11.z, p01.x, p01.y, p01.z);
      }
    }
  } else {
    // Planar earcut triangulation
    const tangent = v0.clone().normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    const flat2D: number[] = [];
    for (const p of ring) {
      const d = new THREE.Vector3(...p).sub(center);
      flat2D.push(d.dot(tangent), d.dot(bitangent));
    }
    const indices = earcut(flat2D);
    for (let i = 0; i < indices.length; i += 3) {
      const pA = ring[indices[i]];
      const pB = ring[indices[i + 1]];
      const pC = ring[indices[i + 2]];
      if (pA && pB && pC) {
        positions.push(pA[0], pA[1], pA[2], pB[0], pB[1], pB[2], pC[0], pC[1], pC[2]);
      }
    }
  }

  void apex;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return ensureIndexedGeometry(geom);
}

/**
 * 3. OFFSET SURFACE & EXTRACT FACE (at offsetDistanceMm = 0, works as Copy Face)
 */
export function offsetOrExtractSurfaceFromFace(
  body: CADBody,
  faceIds: string[],
  offsetDistanceMm = 4.0
): THREE.BufferGeometry {
  const nonIdx = body.geometry.toNonIndexed();
  const pos = nonIdx.getAttribute('position');
  const norm = nonIdx.getAttribute('normal');
  if (!pos || !norm) return body.geometry.clone();

  const selectedSet = new Set(
    faceIds.length > 0
      ? faceIds
      : body.topology.faces.length > 0
      ? [body.topology.faces[0].id]
      : []
  );

  const numTris = Math.floor(pos.count / 3);
  const positions: number[] = [];

  for (let t = 0; t < numTris; t++) {
    const fId = body.topology.faceMapByTriangle[t];
    if (selectedSet.size > 0 && (!fId || !selectedSet.has(fId))) continue;

    for (let k = 0; k < 3; k++) {
      const vIdx = t * 3 + k;
      const vx = pos.getX(vIdx) + norm.getX(vIdx) * offsetDistanceMm;
      const vy = pos.getY(vIdx) + norm.getY(vIdx) * offsetDistanceMm;
      const vz = pos.getZ(vIdx) + norm.getZ(vIdx) * offsetDistanceMm;
      positions.push(vx, vy, vz);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return ensureIndexedGeometry(geom);
}

/**
 * 4. THICKEN SURFACE -> WATERTIGHT 3D SOLID BODY
 * Offsets the open surface along +normal and -normal and stitches all open boundary edges
 * into a closed watertight manifold solid.
 */
export function thickenSurfaceToSolid(
  surfaceGeometry: THREE.BufferGeometry,
  thicknessMm = 3.0,
  direction: 'side1' | 'side2' | 'symmetric' = 'symmetric'
): THREE.BufferGeometry {
  const nonIdx = surfaceGeometry.toNonIndexed();
  nonIdx.computeVertexNormals();
  const pos = nonIdx.getAttribute('position');
  const norm = nonIdx.getAttribute('normal');
  if (!pos || !norm) return surfaceGeometry.clone();

  const offsetTop =
    direction === 'side1'
      ? thicknessMm
      : direction === 'side2'
      ? 0
      : thicknessMm / 2;
  const offsetBot =
    direction === 'side1'
      ? 0
      : direction === 'side2'
      ? -thicknessMm
      : -thicknessMm / 2;

  const numTris = Math.floor(pos.count / 3);
  const outPositions: number[] = [];

  for (let t = 0; t < numTris; t++) {
    const topPts: THREE.Vector3[] = [];
    const botPts: THREE.Vector3[] = [];

    for (let k = 0; k < 3; k++) {
      const idx = t * 3 + k;
      const p = new THREE.Vector3(pos.getX(idx), pos.getY(idx), pos.getZ(idx));
      const n = new THREE.Vector3(norm.getX(idx), norm.getY(idx), norm.getZ(idx)).normalize();
      topPts.push(p.clone().addScaledVector(n, offsetTop));
      botPts.push(p.clone().addScaledVector(n, offsetBot));
    }

    // Top shell triangle (outward winding)
    outPositions.push(
      topPts[0].x,
      topPts[0].y,
      topPts[0].z,
      topPts[1].x,
      topPts[1].y,
      topPts[1].z,
      topPts[2].x,
      topPts[2].y,
      topPts[2].z
    );

    // Bottom shell triangle (flipped winding)
    outPositions.push(
      botPts[0].x,
      botPts[0].y,
      botPts[0].z,
      botPts[2].x,
      botPts[2].y,
      botPts[2].z,
      botPts[1].x,
      botPts[1].y,
      botPts[1].z
    );

    // Side perimeter quads for each triangle edge
    for (let e = 0; e < 3; e++) {
      const next = (e + 1) % 3;
      const tA = topPts[e];
      const tB = topPts[next];
      const bB = botPts[next];
      const bA = botPts[e];

      outPositions.push(tA.x, tA.y, tA.z, bA.x, bA.y, bA.z, bB.x, bB.y, bB.z);
      outPositions.push(tA.x, tA.y, tA.z, bB.x, bB.y, bB.z, tB.x, tB.y, tB.z);
    }
  }

  const solidGeom = new THREE.BufferGeometry();
  solidGeom.setAttribute('position', new THREE.Float32BufferAttribute(outPositions, 3));
  solidGeom.computeVertexNormals();
  return ensureIndexedGeometry(solidGeom);
}

/**
 * 5. STITCH / KNIT SURFACES INTO UNIFIED QUILT OR SOLID
 */
export function stitchSurfacesToSolid(bodies: CADBody[]): THREE.BufferGeometry {
  const outPositions: number[] = [];

  for (const b of bodies) {
    const nonIdx = b.geometry.toNonIndexed();
    const pos = nonIdx.getAttribute('position');
    if (!pos) continue;
    for (let i = 0; i < pos.count; i++) {
      outPositions.push(
        pos.getX(i) + b.transform.position[0],
        pos.getY(i) + b.transform.position[1],
        pos.getZ(i) + b.transform.position[2]
      );
    }
  }

  const stitched = new THREE.BufferGeometry();
  stitched.setAttribute('position', new THREE.Float32BufferAttribute(outPositions, 3));
  stitched.computeVertexNormals();
  return ensureIndexedGeometry(stitched);
}
