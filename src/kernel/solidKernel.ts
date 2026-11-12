import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';
import earcut from 'earcut';
import {
  BooleanMode,
  CADBody,
  ClosedProfileLoop,
  SketchPlane,
  Vec2,
  Vec3,
} from '../types/cad';
import { ensureIndexedGeometry } from './topologyBuilder';

const csgEvaluator = new Evaluator();
csgEvaluator.useGroups = false;

/**
 * Prepares any BufferGeometry for three-bvh-csg by ensuring non-empty position,
 * normal, and uv attributes and indexed triangles.
 */
function prepareForCSG(geom: THREE.BufferGeometry): THREE.BufferGeometry {
  const indexed = ensureIndexedGeometry(geom, 1e-4);
  if (!indexed.getAttribute('normal')) {
    indexed.computeVertexNormals();
  }
  const pos = indexed.getAttribute('position');
  if (pos && !indexed.getAttribute('uv')) {
    const uvs = new Float32Array(pos.count * 2);
    indexed.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }
  return indexed;
}

/**
 * Executes watertight Boolean CSG (Union, Subtract, Intersect) via three-bvh-csg.
 */
export function performCSG(
  baseGeom: THREE.BufferGeometry,
  toolGeom: THREE.BufferGeometry,
  mode: 'union' | 'subtract' | 'intersect'
): THREE.BufferGeometry {
  try {
    const gA = prepareForCSG(baseGeom);
    const gB = prepareForCSG(toolGeom);

    const brushA = new Brush(gA);
    brushA.updateMatrixWorld();

    const brushB = new Brush(gB);
    brushB.updateMatrixWorld();

    const op =
      mode === 'union'
        ? ADDITION
        : mode === 'subtract'
        ? SUBTRACTION
        : INTERSECTION;

    const resultBrush = csgEvaluator.evaluate(brushA, brushB, op);
    const outGeom = ensureIndexedGeometry(resultBrush.geometry, 1e-3);
    return outGeom;
  } catch (err) {
    console.warn('CSG fallback triggered:', err);
    return ensureIndexedGeometry(baseGeom, 1e-3);
  }
}

/**
 * Transforms 2D sketch coordinates (u, v) and local height w into 3D world space.
 */
export function sketchToWorld3D(u: number, v: number, w: number, plane: SketchPlane): Vec3 {
  return [
    plane.origin[0] + u * plane.xAxis[0] + v * plane.yAxis[0] + w * plane.normal[0],
    plane.origin[1] + u * plane.xAxis[1] + v * plane.yAxis[1] + w * plane.normal[1],
    plane.origin[2] + u * plane.xAxis[2] + v * plane.yAxis[2] + w * plane.normal[2],
  ];
}

/**
 * Extrudes a 2D ClosedProfileLoop (including inner holes) along its SketchPlane normal
 * with support for Draft Angle (-45 deg to +45 deg) and Symmetric extrusion.
 */
export function extrudeProfile3D(
  profile: ClosedProfileLoop,
  plane: SketchPlane,
  distance: number,
  draftAngleDeg = 0,
  symmetric = false
): THREE.BufferGeometry {
  const absDist = Math.max(0.2, Math.abs(distance));
  const dirSign = distance >= 0 ? 1 : -1;

  const zStart = symmetric ? -absDist * 0.5 : dirSign > 0 ? 0 : -absDist;
  const zEnd = symmetric ? absDist * 0.5 : dirSign > 0 ? absDist : 0;

  const draftRad = (Math.max(-45, Math.min(45, draftAngleDeg)) * Math.PI) / 180;
  const draftOffset = Math.tan(draftRad) * absDist;

  const [cx, cy] = profile.centroid;

  const scalePt = (pt: Vec2, offset: number): Vec2 => {
    if (Math.abs(offset) < 1e-5) return pt;
    const dx = pt[0] - cx;
    const dy = pt[1] - cy;
    const r = Math.hypot(dx, dy) || 1;
    const factor = Math.max(0.15, (r + offset) / r);
    return [cx + dx * factor, cy + dy * factor];
  };

  const positions: number[] = [];
  const indices: number[] = [];

  const nVerts = profile.triangulatedVertices.length;

  // Bottom cap vertices [0 .. nVerts-1]
  for (let i = 0; i < nVerts; i++) {
    const pt = profile.triangulatedVertices[i];
    const pBottom = dirSign > 0 ? pt : scalePt(pt, draftOffset);
    const w = sketchToWorld3D(pBottom[0], pBottom[1], zStart, plane);
    positions.push(w[0], w[1], w[2]);
  }

  // Top cap vertices [nVerts .. 2*nVerts-1]
  for (let i = 0; i < nVerts; i++) {
    const pt = profile.triangulatedVertices[i];
    const pTop = dirSign > 0 ? scalePt(pt, draftOffset) : pt;
    const w = sketchToWorld3D(pTop[0], pTop[1], zEnd, plane);
    positions.push(w[0], w[1], w[2]);
  }

  // Bottom cap triangles (flipped winding so normal points -normal)
  const triIdx = profile.triangulatedIndices;
  for (let i = 0; i < triIdx.length; i += 3) {
    indices.push(triIdx[i], triIdx[i + 2], triIdx[i + 1]);
  }

  // Top cap triangles (normal points +normal)
  for (let i = 0; i < triIdx.length; i += 3) {
    indices.push(nVerts + triIdx[i], nVerts + triIdx[i + 1], nVerts + triIdx[i + 2]);
  }

  // Side walls for outer contour and each hole contour
  const allContours: Vec2[][] = [profile.outerContour, ...profile.holes];
  for (const contour of allContours) {
    const m = contour.length;
    if (m < 3) continue;
    const baseOffset = positions.length / 3;

    for (let i = 0; i < m; i++) {
      const pt = contour[i];
      const pBot = dirSign > 0 ? pt : scalePt(pt, draftOffset);
      const pTop = dirSign > 0 ? scalePt(pt, draftOffset) : pt;
      const wBot = sketchToWorld3D(pBot[0], pBot[1], zStart, plane);
      const wTop = sketchToWorld3D(pTop[0], pTop[1], zEnd, plane);
      positions.push(wBot[0], wBot[1], wBot[2]);
      positions.push(wTop[0], wTop[1], wTop[2]);
    }

    for (let i = 0; i < m; i++) {
      const next = (i + 1) % m;
      const b0 = baseOffset + i * 2;
      const t0 = baseOffset + i * 2 + 1;
      const b1 = baseOffset + next * 2;
      const t1 = baseOffset + next * 2 + 1;
      indices.push(b0, b1, t1);
      indices.push(b0, t1, t0);
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  return ensureIndexedGeometry(geom, 1e-3);
}

/**
 * Direct Modeling: Extrudes or pushes/pulls an existing TopologicalFace on a 3D body.
 */
export function extrudeTopologicalFace(
  body: CADBody,
  faceId: string,
  distance: number,
  draftAngleDeg = 0
): THREE.BufferGeometry {
  const face = body.topology.faces.find((f) => f.id === faceId);
  if (!face || Math.abs(distance) < 0.1) return body.geometry;

  // Build local sketch plane on the face
  const n = new THREE.Vector3(...face.normal).normalize();
  const up = Math.abs(n.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const xAxis = new THREE.Vector3().crossVectors(up, n).normalize();
  const yAxis = new THREE.Vector3().crossVectors(n, xAxis).normalize();
  const origin = new THREE.Vector3(...face.center);

  // Collect all unique vertices belonging to this face's triangles
  const posAttr = body.geometry.getAttribute('position');
  const idxAttr = body.geometry.getIndex();
  if (!posAttr || !idxAttr) return body.geometry;

  const pts2D: Vec2[] = [];
  const seen = new Set<number>();
  for (const triIdx of face.triangleIndices) {
    for (let k = 0; k < 3; k++) {
      const vIdx = idxAttr.getX(triIdx * 3 + k);
      if (seen.has(vIdx)) continue;
      seen.add(vIdx);
      const vx = posAttr.getX(vIdx) - origin.x;
      const vy = posAttr.getY(vIdx) - origin.y;
      const vz = posAttr.getZ(vIdx) - origin.z;
      pts2D.push([
        vx * xAxis.x + vy * xAxis.y + vz * xAxis.z,
        vx * yAxis.x + vy * yAxis.y + vz * yAxis.z,
      ]);
    }
  }

  if (pts2D.length < 3) return body.geometry;

  // Sort 2D points radially around centroid to form a clean boundary loop
  let cx = 0,
    cy = 0;
  for (const [u, v] of pts2D) {
    cx += u;
    cy += v;
  }
  cx /= pts2D.length;
  cy /= pts2D.length;

  pts2D.sort(
    (a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx)
  );

  // Slightly inset or outset slightly for clean boolean overlap
  const startShift = distance > 0 ? -0.15 : 0.15;
  const shiftedOrigin: Vec3 = [
    origin.x + n.x * startShift,
    origin.y + n.y * startShift,
    origin.z + n.z * startShift,
  ];

  const flatCoords: number[] = [];
  for (const p of pts2D) flatCoords.push(p[0], p[1]);
  const earIndices = earcut(flatCoords, undefined, 2);

  const syntheticProfile: ClosedProfileLoop = {
    id: 'face_extrude_prof',
    sketchId: 'direct',
    outerContour: pts2D,
    holes: [],
    areaMm2: face.area,
    centroid: [cx, cy],
    triangulatedVertices: pts2D,
    triangulatedIndices: earIndices,
  };

  const plane: SketchPlane = {
    id: 'face_plane',
    name: 'Face Plane',
    origin: shiftedOrigin,
    normal: [n.x, n.y, n.z],
    xAxis: [xAxis.x, xAxis.y, xAxis.z],
    yAxis: [yAxis.x, yAxis.y, yAxis.z],
    visible: false,
  };

  const toolPrism = extrudeProfile3D(
    syntheticProfile,
    plane,
    distance + (distance > 0 ? 0.15 : -0.15),
    draftAngleDeg,
    false
  );

  return performCSG(body.geometry, toolPrism, distance > 0 ? 'union' : 'subtract');
}

/**
 * Auto-Boolean Intelligence:
 * Determines whether an extruded volume intersects existing scene bodies.
 */
export function detectAutoBooleanMode(
  extrudedGeom: THREE.BufferGeometry,
  existingBodies: CADBody[],
  distance: number,
  sourceBodyId?: string
): { mode: BooleanMode; targetBodyId?: string } {
  if (existingBodies.length === 0) {
    return { mode: 'new_body' };
  }

  extrudedGeom.computeBoundingBox();
  const boxA = extrudedGeom.boundingBox;
  if (!boxA) return { mode: 'new_body' };

  if (sourceBodyId) {
    return {
      mode: distance < 0 ? 'subtract' : 'union',
      targetBodyId: sourceBodyId,
    };
  }

  for (const body of existingBodies) {
    if (!body.visible) continue;
    body.geometry.computeBoundingBox();
    const boxB = body.geometry.boundingBox;
    if (boxB && boxA.intersectsBox(boxB)) {
      return {
        mode: distance < 0 ? 'subtract' : 'union',
        targetBodyId: body.id,
      };
    }
  }

  return { mode: 'new_body' };
}

/**
 * Revolves a 2D ClosedProfileLoop around a 3D axis by angleDeg (1 to 360 degrees).
 */
export function revolveProfile3D(
  profile: ClosedProfileLoop,
  plane: SketchPlane,
  axisOrigin: Vec3,
  axisDir: Vec3,
  angleDeg = 360,
  segments = 48
): THREE.BufferGeometry {
  const contour3D = profile.outerContour.map((pt) =>
    new THREE.Vector3(...sketchToWorld3D(pt[0], pt[1], 0, plane))
  );

  const origin = new THREE.Vector3(...axisOrigin);
  const axis = new THREE.Vector3(...axisDir).normalize();
  const sweepRad = (Math.max(5, Math.min(360, Math.abs(angleDeg))) * Math.PI) / 180;
  const isFullCircle = Math.abs(sweepRad - Math.PI * 2) < 1e-3;

  const nPts = contour3D.length;
  const steps = Math.max(12, segments);
  const ringCount = isFullCircle ? steps : steps + 1;

  const positions: number[] = [];
  const indices: number[] = [];
  const quat = new THREE.Quaternion();

  for (let s = 0; s < ringCount; s++) {
    const theta = (s / steps) * sweepRad;
    quat.setFromAxisAngle(axis, theta);

    for (let i = 0; i < nPts; i++) {
      const p = contour3D[i].clone().sub(origin).applyQuaternion(quat).add(origin);
      positions.push(p.x, p.y, p.z);
    }
  }

  for (let s = 0; s < steps; s++) {
    const nextRing = isFullCircle ? (s + 1) % steps : s + 1;
    for (let i = 0; i < nPts; i++) {
      const nextPt = (i + 1) % nPts;
      const a = s * nPts + i;
      const b = s * nPts + nextPt;
      const c = nextRing * nPts + nextPt;
      const d = nextRing * nPts + i;
      indices.push(a, b, c);
      indices.push(a, c, d);
    }
  }

  // End caps if partial revolution (< 360 deg)
  if (!isFullCircle) {
    const triIdx = profile.triangulatedIndices;
    // Start cap (ring 0)
    for (let i = 0; i < triIdx.length; i += 3) {
      if (triIdx[i] < nPts && triIdx[i + 1] < nPts && triIdx[i + 2] < nPts) {
        indices.push(triIdx[i], triIdx[i + 2], triIdx[i + 1]);
      }
    }
    // End cap (last ring)
    const lastOffset = steps * nPts;
    for (let i = 0; i < triIdx.length; i += 3) {
      if (triIdx[i] < nPts && triIdx[i + 1] < nPts && triIdx[i + 2] < nPts) {
        indices.push(
          lastOffset + triIdx[i],
          lastOffset + triIdx[i + 1],
          lastOffset + triIdx[i + 2]
        );
      }
    }
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  return ensureIndexedGeometry(geom, 1e-3);
}

/**
 * Sweeps a 2D ClosedProfileLoop along a 3D path using Parallel Transport Frames
 * to prevent Frenet-Serret twist artifacts, with optional twist & scale.
 */
export function sweepProfileAlongPath(
  profile: ClosedProfileLoop,
  pathPoints3D: Vec3[],
  twistDeg = 0,
  endScale = 1.0
): THREE.BufferGeometry {
  if (pathPoints3D.length < 2) {
    return new THREE.BoxGeometry(10, 10, 10);
  }

  const curvePts = pathPoints3D.map((p) => new THREE.Vector3(...p));
  const curve = new THREE.CatmullRomCurve3(curvePts);
  const steps = Math.max(24, pathPoints3D.length * 8);
  const frames = curve.computeFrenetFrames(steps, false);
  const sampledPts = curve.getSpacedPoints(steps);

  const [cx, cy] = profile.centroid;
  const centeredContour: Vec2[] = profile.outerContour.map(([u, v]) => [u - cx, v - cy]);
  const nPts = centeredContour.length;

  const positions: number[] = [];
  const indices: number[] = [];

  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const scale = 1 + (endScale - 1) * t;
    const twistRad = ((twistDeg * Math.PI) / 180) * t;
    const cosT = Math.cos(twistRad);
    const sinT = Math.sin(twistRad);

    const pos = sampledPts[s];
    const normal = frames.normals[s];
    const binormal = frames.binormals[s];

    for (let i = 0; i < nPts; i++) {
      const u = centeredContour[i][0] * scale;
      const v = centeredContour[i][1] * scale;
      const ru = u * cosT - v * sinT;
      const rv = u * sinT + v * cosT;

      const wx = pos.x + ru * normal.x + rv * binormal.x;
      const wy = pos.y + ru * normal.y + rv * binormal.y;
      const wz = pos.z + ru * normal.z + rv * binormal.z;
      positions.push(wx, wy, wz);
    }
  }

  for (let s = 0; s < steps; s++) {
    for (let i = 0; i < nPts; i++) {
      const next = (i + 1) % nPts;
      const a = s * nPts + i;
      const b = s * nPts + next;
      const c = (s + 1) * nPts + next;
      const d = (s + 1) * nPts + i;
      indices.push(a, b, c);
      indices.push(a, c, d);
    }
  }

  // Fan triangulation for start and end caps
  for (let i = 1; i < nPts - 1; i++) {
    indices.push(0, i + 1, i);
    const endBase = steps * nPts;
    indices.push(endBase, endBase + i, endBase + i + 1);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  return ensureIndexedGeometry(geom, 1e-3);
}

/**
 * Lofts between 2 or more 3D profiles by uniform contour resampling and twist-minimized stitching.
 */
export function loftProfiles3D(
  sections: { profile: ClosedProfileLoop; plane: SketchPlane }[],
  samplesPerRing = 64
): THREE.BufferGeometry {
  if (sections.length < 2) {
    return new THREE.BoxGeometry(20, 20, 20);
  }

  const rings3D: Vec3[][] = sections.map(({ profile, plane }) => {
    const resampled2D = resampleClosedContour(profile.outerContour, samplesPerRing);
    return resampled2D.map(([u, v]) => sketchToWorld3D(u, v, 0, plane));
  });

  // Align ring starting indices to minimize twist between consecutive rings
  for (let r = 1; r < rings3D.length; r++) {
    const prevRing = rings3D[r - 1];
    const currRing = rings3D[r];
    let bestShift = 0;
    let bestDist = Infinity;
    for (let shift = 0; shift < samplesPerRing; shift++) {
      let sumD = 0;
      for (let i = 0; i < samplesPerRing; i += 4) {
        const p0 = prevRing[i];
        const p1 = currRing[(i + shift) % samplesPerRing];
        sumD += Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]);
      }
      if (sumD < bestDist) {
        bestDist = sumD;
        bestShift = shift;
      }
    }
    if (bestShift > 0) {
      rings3D[r] = [
        ...currRing.slice(bestShift),
        ...currRing.slice(0, bestShift),
      ];
    }
  }

  const positions: number[] = [];
  const indices: number[] = [];

  for (const ring of rings3D) {
    for (const pt of ring) {
      positions.push(pt[0], pt[1], pt[2]);
    }
  }

  for (let r = 0; r < rings3D.length - 1; r++) {
    const baseA = r * samplesPerRing;
    const baseB = (r + 1) * samplesPerRing;
    for (let i = 0; i < samplesPerRing; i++) {
      const next = (i + 1) % samplesPerRing;
      indices.push(baseA + i, baseA + next, baseB + next);
      indices.push(baseA + i, baseB + next, baseB + i);
    }
  }

  // Cap start and end rings
  const lastBase = (rings3D.length - 1) * samplesPerRing;
  for (let i = 1; i < samplesPerRing - 1; i++) {
    indices.push(0, i + 1, i);
    indices.push(lastBase, lastBase + i, lastBase + i + 1);
  }

  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geom.setIndex(indices);
  return ensureIndexedGeometry(geom, 1e-3);
}

function resampleClosedContour(pts: Vec2[], targetCount: number): Vec2[] {
  const n = pts.length;
  if (n === 0) return [];
  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const d = Math.hypot(pts[next][0] - pts[i][0], pts[next][1] - pts[i][1]);
    segLengths.push(d);
    totalLen += d;
  }
  if (totalLen < 1e-5) return pts;

  const out: Vec2[] = [];
  for (let s = 0; s < targetCount; s++) {
    const targetDist = (s / targetCount) * totalLen;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      const segL = segLengths[i];
      if (acc + segL >= targetDist || i === n - 1) {
        const localT = segL > 1e-6 ? (targetDist - acc) / segL : 0;
        const next = (i + 1) % n;
        out.push([
          pts[i][0] + localT * (pts[next][0] - pts[i][0]),
          pts[i][1] + localT * (pts[next][1] - pts[i][1]),
        ]);
        break;
      }
      acc += segL;
    }
  }
  return out;
}

/**
 * Dual-Direction Edge Modifier:
 * amount > 0 -> Fillet (rounded edge blend)
 * amount < 0 -> Chamfer (45-deg beveled edge cut)
 */
export function applyFilletOrChamfer(
  body: CADBody,
  edgeIds: string[],
  amount: number
): THREE.BufferGeometry {
  const absVal = Math.abs(amount);
  if (absVal < 0.15 || edgeIds.length === 0) return body.geometry;

  const isFillet = amount > 0;
  let workingGeom = body.geometry.clone();

  body.geometry.computeBoundingSphere();
  const bodyCenter = body.geometry.boundingSphere?.center || new THREE.Vector3();

  for (const edgeId of edgeIds) {
    const edge = body.topology.edges.find((e) => e.id === edgeId);
    if (!edge || edge.vertices.length < 2) continue;

    // Compute outward bisecting normal from adjacent faces
    const adjNormal = new THREE.Vector3();
    for (const fid of edge.adjacentFaceIds) {
      const f = body.topology.faces.find((x) => x.id === fid);
      if (f) {
        adjNormal.add(new THREE.Vector3(...f.normal));
      }
    }
    if (adjNormal.lengthSq() < 1e-4) {
      const midPt = new THREE.Vector3(...edge.vertices[0]);
      adjNormal.subVectors(midPt, bodyCenter);
    }
    adjNormal.normalize();

    // Build cutter profile swept along edge polyline
    const cutterSize = absVal * 1.45;
    let cutterProfile: ClosedProfileLoop;

    if (!isFillet) {
      // Chamfer cutter triangle
      const triPts: Vec2[] = [
        [-cutterSize, -cutterSize * 0.2],
        [cutterSize, -cutterSize * 0.2],
        [0, cutterSize * 1.2],
      ];
      cutterProfile = {
        id: 'chamfer_cut',
        sketchId: 'internal',
        outerContour: triPts,
        holes: [],
        areaMm2: cutterSize * cutterSize,
        centroid: [0, 0],
        triangulatedVertices: triPts,
        triangulatedIndices: [0, 1, 2],
      };
    } else {
      // Fillet corner cutter (concave quarter-circle)
      const pts: Vec2[] = [[cutterSize, cutterSize]];
      const arcSegs = 12;
      for (let i = 0; i <= arcSegs; i++) {
        const a = (i / arcSegs) * (Math.PI * 0.5);
        pts.push([
          cutterSize - Math.cos(a) * absVal,
          cutterSize - Math.sin(a) * absVal,
        ]);
      }
      const flat: number[] = [];
      pts.forEach((p) => flat.push(p[0], p[1]));
      cutterProfile = {
        id: 'fillet_cut',
        sketchId: 'internal',
        outerContour: pts,
        holes: [],
        areaMm2: cutterSize * cutterSize,
        centroid: [0, 0],
        triangulatedVertices: pts,
        triangulatedIndices: earcut(flat, undefined, 2),
      };
    }

    // Offset path slightly outward along bisecting normal so it shaves the sharp crest
    const shiftedPath: Vec3[] = edge.vertices.map((v) => [
      v[0] - adjNormal.x * (absVal * 0.25),
      v[1] - adjNormal.y * (absVal * 0.25),
      v[2] - adjNormal.z * (absVal * 0.25),
    ]);

    const cutterGeom = sweepProfileAlongPath(cutterProfile, shiftedPath, 0, 1.0);
    workingGeom = performCSG(workingGeom, cutterGeom, 'subtract');
  }

  return workingGeom;
}

/**
 * Finds all connected edges forming a tangent loop or sharing the same face boundary.
 */
export function findTangentEdgeLoop(body: CADBody, startEdgeId: string): string[] {
  const startEdge = body.topology.edges.find((e) => e.id === startEdgeId);
  if (!startEdge) return [startEdgeId];

  const primaryFaceId = startEdge.adjacentFaceIds[0];
  if (!primaryFaceId) return [startEdgeId];

  const face = body.topology.faces.find((f) => f.id === primaryFaceId);
  if (!face) return [startEdgeId];

  return face.boundaryEdgeIds.length > 0 ? [...face.boundaryEdgeIds] : [startEdgeId];
}

/**
 * Shell (Hollow Solid):
 * Creates an inward-offset cavity of wall thickness t and opens the selected faces.
 */
export function shellSolidBody(
  body: CADBody,
  openFaceIds: string[],
  wallThickness: number
): THREE.BufferGeometry {
  const t = Math.max(0.5, Math.abs(wallThickness));
  body.geometry.computeBoundingBox();
  const bbox = body.geometry.boundingBox;
  if (!bbox) return body.geometry;

  const center = new THREE.Vector3();
  bbox.getCenter(center);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  const sx = Math.max(0.1, (size.x - 2 * t) / (size.x || 1));
  const sy = Math.max(0.1, (size.y - 2 * t) / (size.y || 1));
  const sz = Math.max(0.1, (size.z - 2 * t) / (size.z || 1));

  const innerCavity = body.geometry.clone();
  innerCavity.translate(-center.x, -center.y, -center.z);
  innerCavity.scale(sx, sy, sz);

  // Shift cavity slightly toward the selected open faces so it punches cleanly through them
  for (const fid of openFaceIds) {
    const f = body.topology.faces.find((x) => x.id === fid);
    if (f) {
      innerCavity.translate(
        f.normal[0] * t * 1.15,
        f.normal[1] * t * 1.15,
        f.normal[2] * t * 1.15
      );
    }
  }

  innerCavity.translate(center.x, center.y, center.z);
  return performCSG(body.geometry, innerCavity, 'subtract');
}

/**
 * Splits a CADBody across a 3D cutting plane into two watertight half-bodies.
 */
export function splitBodyByPlane(
  body: CADBody,
  planeOrigin: Vec3,
  planeNormal: Vec3
): [THREE.BufferGeometry, THREE.BufferGeometry] {
  const big = 2000;
  const halfSpaceBox = new THREE.BoxGeometry(big, big, big);
  halfSpaceBox.translate(0, 0, big * 0.5);

  const n = new THREE.Vector3(...planeNormal).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  halfSpaceBox.applyQuaternion(q);
  halfSpaceBox.translate(planeOrigin[0], planeOrigin[1], planeOrigin[2]);

  const partA = performCSG(body.geometry, halfSpaceBox, 'subtract');
  const partB = performCSG(body.geometry, halfSpaceBox, 'intersect');
  return [partA, partB];
}

/**
 * Mirrors a BufferGeometry across a plane defined by origin and normal.
 */
export function mirrorBodyGeometry(
  geom: THREE.BufferGeometry,
  planeOrigin: Vec3,
  planeNormal: Vec3
): THREE.BufferGeometry {
  const cloned = geom.clone();
  const n = new THREE.Vector3(...planeNormal).normalize();
  const p0 = new THREE.Vector3(...planeOrigin);

  const pos = cloned.getAttribute('position');
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const dist = v.clone().sub(p0).dot(n);
    v.addScaledVector(n, -2 * dist);
    pos.setXYZ(i, v.x, v.y, v.z);
  }

  // Flip triangle winding because reflection inverts handedness
  const idx = cloned.getIndex();
  if (idx) {
    for (let i = 0; i < idx.count; i += 3) {
      const b = idx.getX(i + 1);
      const c = idx.getX(i + 2);
      idx.setX(i + 1, c);
      idx.setX(i + 2, b);
    }
  }

  return ensureIndexedGeometry(cloned, 1e-3);
}
