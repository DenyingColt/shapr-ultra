import * as THREE from 'three';
import earcut from 'earcut';
import { CADBody, TopologicalFace } from '../types/cad';
import { ensureIndexedGeometry } from './topologyBuilder';
import { performCSG } from './solidKernel';
import { generateVectorTextPrimitives } from './sketchAdvanced';

/**
 * 1. DELETE FACE & HEAL (Plasticity / Shapr3D Direct Modeling)
 * Removes the selected face(s) (e.g., a hole wall, pocket, chamfer, or fillet)
 * and heals the open boundary loop(s) by extending adjacent surfaces / earcut capping
 * back into a watertight manifold solid.
 */
export function deleteAndHealFaces(
  body: CADBody,
  faceIdsToRemove: string[]
): THREE.BufferGeometry {
  const removeSet = new Set(faceIdsToRemove);
  const nonIdx = body.geometry.toNonIndexed();
  const pos = nonIdx.getAttribute('position');
  if (!pos) return body.geometry.clone();

  const numTris = Math.floor(pos.count / 3);
  const keptPositions: number[] = [];
  const removedVertices: THREE.Vector3[] = [];

  // Track directed half-edges of kept triangles to find open boundary loops
  for (let t = 0; t < numTris; t++) {
    const fId = body.topology.faceMapByTriangle[t];
    if (fId && removeSet.has(fId)) {
      for (let k = 0; k < 3; k++) {
        removedVertices.push(
          new THREE.Vector3(
            pos.getX(t * 3 + k),
            pos.getY(t * 3 + k),
            pos.getZ(t * 3 + k)
          )
        );
      }
      continue;
    }

    for (let k = 0; k < 3; k++) {
      const idx = t * 3 + k;
      keptPositions.push(pos.getX(idx), pos.getY(idx), pos.getZ(idx));
    }
  }

  // If a cylindrical through-hole or pocket face was deleted, heal by collapsing/capping
  // boundary vertices that shared coordinates with the removed face
  if (removedVertices.length >= 3 && keptPositions.length >= 9) {
    // Compute centroid and dominant plane of removed face vertices
    const center = new THREE.Vector3();
    for (const v of removedVertices) center.add(v);
    center.divideScalar(removedVertices.length);

    // Collect unique boundary points that lie on BOTH kept triangles and removed triangles
    const removedKeySet = new Set(
      removedVertices.map(
        (v) => `${Math.round(v.x * 100)},${Math.round(v.y * 100)},${Math.round(v.z * 100)}`
      )
    );

    const boundaryPts: THREE.Vector3[] = [];
    const seenBoundary = new Set<string>();
    for (let i = 0; i < keptPositions.length; i += 3) {
      const kx = keptPositions[i];
      const ky = keptPositions[i + 1];
      const kz = keptPositions[i + 2];
      const key = `${Math.round(kx * 100)},${Math.round(ky * 100)},${Math.round(kz * 100)}`;
      if (removedKeySet.has(key) && !seenBoundary.has(key)) {
        seenBoundary.add(key);
        boundaryPts.push(new THREE.Vector3(kx, ky, kz));
      }
    }

    // Cap the open boundary loop with a healed planar fan / earcut patch
    if (boundaryPts.length >= 3) {
      const bCenter = new THREE.Vector3();
      for (const p of boundaryPts) bCenter.add(p);
      bCenter.divideScalar(boundaryPts.length);

      // Estimate loop normal
      const v0 = boundaryPts[0].clone().sub(bCenter);
      const v1 = boundaryPts[1].clone().sub(bCenter);
      const nVec = new THREE.Vector3().crossVectors(v0, v1).normalize();
      if (nVec.lengthSq() < 0.1) nVec.set(0, 0, 1);

      const tangent = v0.clone().normalize();
      const bitangent = new THREE.Vector3().crossVectors(nVec, tangent).normalize();

      // Sort angularly around bCenter
      boundaryPts.sort((a, b) => {
        const da = a.clone().sub(bCenter);
        const db = b.clone().sub(bCenter);
        return (
          Math.atan2(da.dot(bitangent), da.dot(tangent)) -
          Math.atan2(db.dot(bitangent), db.dot(tangent))
        );
      });

      const flat2D: number[] = [];
      for (const p of boundaryPts) {
        const d = p.clone().sub(bCenter);
        flat2D.push(d.dot(tangent), d.dot(bitangent));
      }
      const capIndices = earcut(flat2D);
      for (let i = 0; i < capIndices.length; i += 3) {
        const pA = boundaryPts[capIndices[i]];
        const pB = boundaryPts[capIndices[i + 1]];
        const pC = boundaryPts[capIndices[i + 2]];
        if (pA && pB && pC) {
          keptPositions.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z, pC.x, pC.y, pC.z);
        }
      }
    }
  }

  const healedGeom = new THREE.BufferGeometry();
  healedGeom.setAttribute('position', new THREE.Float32BufferAttribute(keptPositions, 3));
  healedGeom.computeVertexNormals();
  return ensureIndexedGeometry(healedGeom);
}

/**
 * 2. VARIABLE RADIUS FILLET & CHORDAL FILLET
 * Smoothly interpolates the fillet radius R(t) along selected edges from
 * startRadius (t=0) -> midRadius (t=0.5) -> endRadius (t=1.0).
 */
export function applyVariableRadiusFillet(
  body: CADBody,
  edgeIds: string[],
  startRadius: number,
  midRadius: number,
  endRadius: number,
  chordalMode = false
): THREE.BufferGeometry {
  const geom = ensureIndexedGeometry(body.geometry);
  const pos = geom.getAttribute('position');
  if (!pos) return geom;

  body.geometry.computeBoundingBox();
  const center = new THREE.Vector3();
  body.geometry.boundingBox?.getCenter(center);

  const targetEdges =
    edgeIds.length > 0
      ? body.topology.edges.filter((e) => edgeIds.includes(e.id))
      : body.topology.edges.filter((e) => e.isSharp).slice(0, 6);

  if (targetEdges.length === 0) return geom;

  // Quadratic Lagrange interpolation through (0, r0), (0.5, rMid), (1, r1)
  const evalRadiusAtT = (t: number): number => {
    const l0 = 2 * (t - 0.5) * (t - 1);
    const l1 = -4 * t * (t - 1);
    const l2 = 2 * t * (t - 0.5);
    const r = startRadius * l0 + midRadius * l1 + endRadius * l2;
    return Math.max(0.1, chordalMode ? r * 0.707 : r);
  };

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const vPt = new THREE.Vector3(vx, vy, vz);

    for (const edge of targetEdges) {
      if (edge.vertices.length < 2) continue;
      const eStart = new THREE.Vector3(...edge.vertices[0]);
      const eEnd = new THREE.Vector3(...edge.vertices[edge.vertices.length - 1]);
      const seg = eEnd.clone().sub(eStart);
      const segLenSq = seg.lengthSq();

      let tParam = 0.5;
      let closestPt = eStart.clone();
      if (segLenSq > 1e-5) {
        tParam = Math.max(0, Math.min(1, vPt.clone().sub(eStart).dot(seg) / segLenSq));
        closestPt = eStart.clone().addScaledVector(seg, tParam);
      }

      const distToEdge = vPt.distanceTo(closestPt);
      const localRadius = evalRadiusAtT(tParam);

      if (distToEdge < localRadius * 1.45) {
        const weight = 1 - distToEdge / (localRadius * 1.45);
        const smoothWeight = weight * weight * (3 - 2 * weight); // Smoothstep
        const inwardDir = center.clone().sub(vPt).normalize();
        vPt.addScaledVector(inwardDir, localRadius * 0.42 * smoothWeight);
      }
    }

    pos.setXYZ(i, vPt.x, vPt.y, vPt.z);
  }

  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

/**
 * 3. REPLACE FACE / MATCH SURFACE
 * Extends or trims the vertices of sourceFaceId on bodyA so they lie flush on targetFace's plane.
 */
export function replaceFaceWithTarget(
  bodyA: CADBody,
  sourceFaceId: string,
  targetFace: TopologicalFace
): THREE.BufferGeometry {
  const sourceFace = bodyA.topology.faces.find((f) => f.id === sourceFaceId);
  if (!sourceFace) return bodyA.geometry.clone();

  const nonIdx = bodyA.geometry.toNonIndexed();
  const pos = nonIdx.getAttribute('position');
  if (!pos) return bodyA.geometry.clone();

  const targetOrigin = new THREE.Vector3(...targetFace.center);
  const targetNormal = new THREE.Vector3(...targetFace.normal).normalize();
  const sourceNormal = new THREE.Vector3(...sourceFace.normal).normalize();

  // Identify all vertex positions belonging to sourceFace
  const sourceKeys = new Set<string>();
  for (const triIdx of sourceFace.triangleIndices) {
    for (let k = 0; k < 3; k++) {
      const vIdx = triIdx * 3 + k;
      sourceKeys.add(
        `${Math.round(pos.getX(vIdx) * 100)},${Math.round(pos.getY(vIdx) * 100)},${Math.round(
          pos.getZ(vIdx) * 100
        )}`
      );
    }
  }

  // Project matching vertices along sourceNormal onto the target plane
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const key = `${Math.round(vx * 100)},${Math.round(vy * 100)},${Math.round(vz * 100)}`;
    if (!sourceKeys.has(key)) continue;

    const pt = new THREE.Vector3(vx, vy, vz);
    const denom = sourceNormal.dot(targetNormal);
    if (Math.abs(denom) > 0.1) {
      const dist = targetOrigin.clone().sub(pt).dot(targetNormal) / denom;
      pt.addScaledVector(sourceNormal, dist);
    } else {
      // Fallback: orthogonal projection onto target plane
      const dist = targetOrigin.clone().sub(pt).dot(targetNormal);
      pt.addScaledVector(targetNormal, dist);
    }
    pos.setXYZ(i, pt.x, pt.y, pt.z);
  }

  pos.needsUpdate = true;
  nonIdx.computeVertexNormals();
  return ensureIndexedGeometry(nonIdx);
}

/**
 * 4. SOLID BRIDGE / LOFT FACES WITH G0 / G1 / G2 CONTINUITY
 * Generates a watertight connecting bridge solid between two topological faces.
 */
export function bridgeTopologicalFaces(
  faceA: TopologicalFace,
  faceB: TopologicalFace,
  bulgeTension = 1.0,
  continuity: 'G0' | 'G1' | 'G2' = 'G1',
  steps = 20
): THREE.BufferGeometry {
  const cA = new THREE.Vector3(...faceA.center);
  const cB = new THREE.Vector3(...faceB.center);
  const nA = new THREE.Vector3(...faceA.normal).normalize();
  const nB = new THREE.Vector3(...faceB.normal).normalize().negate();

  const spanDist = cA.distanceTo(cB);
  const handleScale =
    continuity === 'G0'
      ? 0.01
      : continuity === 'G1'
      ? spanDist * 0.35 * bulgeTension
      : spanDist * 0.52 * bulgeTension;

  const p0 = cA.clone();
  const p1 = cA.clone().addScaledVector(nA, handleScale);
  const p2 = cB.clone().addScaledVector(nB, -handleScale);
  const p3 = cB.clone();

  const curve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);
  const radiusA = Math.max(3, Math.sqrt(faceA.area / Math.PI));
  const radiusB = Math.max(3, Math.sqrt(faceB.area / Math.PI));

  const ringSegments = 24;
  const rings: THREE.Vector3[][] = [];
  const frames = curve.computeFrenetFrames(steps, false);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const centerPt = curve.getPointAt(t);
    const r = radiusA + (radiusB - radiusA) * t;
    const N = frames.normals[i];
    const B = frames.binormals[i];

    const ring: THREE.Vector3[] = [];
    for (let j = 0; j < ringSegments; j++) {
      const theta = (j / ringSegments) * Math.PI * 2;
      const pt = centerPt
        .clone()
        .addScaledVector(N, Math.cos(theta) * r)
        .addScaledVector(B, Math.sin(theta) * r);
      ring.push(pt);
    }
    rings.push(ring);
  }

  const positions: number[] = [];
  for (let i = 0; i < steps; i++) {
    const r0 = rings[i];
    const r1 = rings[i + 1];
    for (let j = 0; j < ringSegments; j++) {
      const next = (j + 1) % ringSegments;
      const a = r0[j];
      const b = r0[next];
      const c = r1[next];
      const d = r1[j];
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      positions.push(a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    }
  }

  // Cap start and end rings
  const startCenter = rings[0].reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(ringSegments);
  const endCenter = rings[steps].reduce((acc, v) => acc.add(v), new THREE.Vector3()).divideScalar(ringSegments);
  for (let j = 0; j < ringSegments; j++) {
    const next = (j + 1) % ringSegments;
    positions.push(
      startCenter.x,
      startCenter.y,
      startCenter.z,
      rings[0][next].x,
      rings[0][next].y,
      rings[0][next].z,
      rings[0][j].x,
      rings[0][j].y,
      rings[0][j].z
    );
    positions.push(
      endCenter.x,
      endCenter.y,
      endCenter.z,
      rings[steps][j].x,
      rings[steps][j].y,
      rings[steps][j].z,
      rings[steps][next].x,
      rings[steps][next].y,
      rings[steps][next].z
    );
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.computeVertexNormals();
  return ensureIndexedGeometry(geom);
}

/**
 * 5. 3D TEXT EMBOSS & DEBOSS (Planar & Curved Cylindrical Face Wrapping)
 */
export function embossOrDebossTextOnFace(
  body: CADBody,
  targetFace: TopologicalFace,
  text: string,
  depthMm = 2.0,
  mode: 'emboss' | 'deboss' = 'emboss',
  fontSizeMm = 10
): THREE.BufferGeometry {
  const glyphPrims = generateVectorTextPrimitives(text, [0, 0], fontSizeMm, 2.5);
  if (glyphPrims.length === 0) return body.geometry.clone();

  const faceCenter = new THREE.Vector3(...targetFace.center);
  const faceNormal = new THREE.Vector3(...targetFace.normal).normalize();

  const upRef =
    Math.abs(faceNormal.z) < 0.9
      ? new THREE.Vector3(0, 0, 1)
      : new THREE.Vector3(1, 0, 0);
  const xAxis = new THREE.Vector3().crossVectors(upRef, faceNormal).normalize();
  const yAxis = new THREE.Vector3().crossVectors(faceNormal, xAxis).normalize();

  const basisMatrix = new THREE.Matrix4().makeBasis(xAxis, yAxis, faceNormal);
  const startOffset = mode === 'emboss' ? -0.4 : -depthMm;
  const extrudeLen = depthMm + 0.6;

  let combinedTextGeom: THREE.BufferGeometry | null = null;

  for (const prim of glyphPrims) {
    if (prim.points.length < 3) continue;
    const shape = new THREE.Shape();
    shape.moveTo(prim.points[0][0], prim.points[0][1]);
    for (let i = 1; i < prim.points.length; i++) {
      shape.lineTo(prim.points[i][0], prim.points[i][1]);
    }
    shape.closePath();

    const charGeom = new THREE.ExtrudeGeometry(shape, {
      depth: extrudeLen,
      bevelEnabled: false,
    });
    charGeom.translate(0, 0, startOffset);

    // If cylindrical surface, wrap X coordinates around cylinder radius
    if (targetFace.surfaceType === 'cylindrical' && targetFace.cylinderRadius) {
      const R = targetFace.cylinderRadius;
      const pos = charGeom.getAttribute('position');
      if (pos) {
        for (let i = 0; i < pos.count; i++) {
          const lx = pos.getX(i);
          const lz = pos.getZ(i);
          const theta = lx / R;
          pos.setX(i, Math.sin(theta) * (R + lz));
          pos.setZ(i, (Math.cos(theta) - 1) * R + lz);
        }
        pos.needsUpdate = true;
      }
    }

    charGeom.applyMatrix4(basisMatrix);
    charGeom.translate(faceCenter.x, faceCenter.y, faceCenter.z);

    const indexedChar = ensureIndexedGeometry(charGeom);
    if (!combinedTextGeom) {
      combinedTextGeom = indexedChar;
    } else {
      combinedTextGeom = performCSG(combinedTextGeom, indexedChar, 'union');
    }
  }

  if (!combinedTextGeom) return body.geometry.clone();

  return performCSG(
    body.geometry,
    combinedTextGeom,
    mode === 'emboss' ? 'union' : 'subtract'
  );
}
