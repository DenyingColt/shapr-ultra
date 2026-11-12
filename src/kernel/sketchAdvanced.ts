import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { CADBody, SketchPlane, SketchPrimitive, Vec2, Vec3 } from '../types/cad';

/**
 * 1. SLOT TOOLS (Straight Center-to-Center, Overall Length, and Arc Slot)
 */
export function generateStraightSlotPoints(
  p1: Vec2,
  p2: Vec2,
  slotWidth: number,
  mode: 'center_to_center' | 'overall_length' = 'center_to_center',
  capSegments = 16
): Vec2[] {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dist = Math.hypot(dx, dy);
  const r = Math.max(0.5, slotWidth / 2);

  const ux = dist > 1e-5 ? dx / dist : 1;
  const uy = dist > 1e-5 ? dy / dist : 0;

  let c1: Vec2 = [p1[0], p1[1]];
  let c2: Vec2 = [p2[0], p2[1]];

  if (mode === 'overall_length' && dist > 2 * r) {
    c1 = [p1[0] + ux * r, p1[1] + uy * r];
    c2 = [p2[0] - ux * r, p2[1] - uy * r];
  }

  const baseAngle = Math.atan2(uy, ux);
  const contour: Vec2[] = [];

  // Semicircle around c2 from -PI/2 to +PI/2 relative to baseAngle
  for (let i = 0; i <= capSegments; i++) {
    const theta = baseAngle - Math.PI / 2 + (i / capSegments) * Math.PI;
    contour.push([c2[0] + Math.cos(theta) * r, c2[1] + Math.sin(theta) * r]);
  }

  // Semicircle around c1 from +PI/2 to +3*PI/2 relative to baseAngle
  for (let i = 0; i <= capSegments; i++) {
    const theta = baseAngle + Math.PI / 2 + (i / capSegments) * Math.PI;
    contour.push([c1[0] + Math.cos(theta) * r, c1[1] + Math.sin(theta) * r]);
  }

  return contour;
}

export function generateArcSlotPoints(
  center: Vec2,
  arcRadius: number,
  startAngleRad: number,
  endAngleRad: number,
  slotWidth: number,
  arcSegments = 24
): Vec2[] {
  const rSlot = Math.max(0.5, slotWidth / 2);
  const rOuter = arcRadius + rSlot;
  const rInner = Math.max(0.5, arcRadius - rSlot);
  const contour: Vec2[] = [];

  // Outer arc from startAngle to endAngle
  for (let i = 0; i <= arcSegments; i++) {
    const t = i / arcSegments;
    const a = startAngleRad + t * (endAngleRad - startAngleRad);
    contour.push([center[0] + Math.cos(a) * rOuter, center[1] + Math.sin(a) * rOuter]);
  }

  // End semicircle cap at endAngle
  const endCenter: Vec2 = [
    center[0] + Math.cos(endAngleRad) * arcRadius,
    center[1] + Math.sin(endAngleRad) * arcRadius,
  ];
  for (let i = 1; i < 12; i++) {
    const a = endAngleRad + (i / 12) * Math.PI;
    contour.push([
      endCenter[0] + Math.cos(a) * rSlot,
      endCenter[1] + Math.sin(a) * rSlot,
    ]);
  }

  // Inner arc from endAngle back to startAngle
  for (let i = 0; i <= arcSegments; i++) {
    const t = i / arcSegments;
    const a = endAngleRad - t * (endAngleRad - startAngleRad);
    contour.push([center[0] + Math.cos(a) * rInner, center[1] + Math.sin(a) * rInner]);
  }

  // Start semicircle cap at startAngle
  const startCenter: Vec2 = [
    center[0] + Math.cos(startAngleRad) * arcRadius,
    center[1] + Math.sin(startAngleRad) * arcRadius,
  ];
  for (let i = 1; i < 12; i++) {
    const a = startAngleRad + Math.PI + (i / 12) * Math.PI;
    contour.push([
      startCenter[0] + Math.cos(a) * rSlot,
      startCenter[1] + Math.sin(a) * rSlot,
    ]);
  }

  return contour;
}

/**
 * 2. CONIC, SPIRAL & EQUATION-DRIVEN CURVES
 * Rational quadratic Bezier conic curve with rho in (0.01, 0.99):
 * rho < 0.5: Ellipse, rho = 0.5: Parabola, rho > 0.5: Hyperbola
 */
export function generateConicCurvePoints(
  p0: Vec2,
  apex: Vec2,
  p2: Vec2,
  rho = 0.5,
  segments = 36
): Vec2[] {
  const clampedRho = Math.max(0.02, Math.min(0.98, rho));
  const w = clampedRho / (1 - clampedRho);
  const pts: Vec2[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const u = 1 - t;
    const b0 = u * u;
    const b1 = 2 * w * u * t;
    const b2 = t * t;
    const denom = b0 + b1 + b2;

    const x = (b0 * p0[0] + b1 * apex[0] + b2 * p2[0]) / denom;
    const y = (b0 * p0[1] + b1 * apex[1] + b2 * p2[1]) / denom;
    pts.push([x, y]);
  }

  return pts;
}

export function generateArchimedeanSpiralPoints(
  center: Vec2,
  startRadius = 4,
  endRadius = 28,
  revolutions = 3.5,
  clockwise = false,
  segmentsPerRev = 32
): Vec2[] {
  const totalSteps = Math.max(16, Math.round(revolutions * segmentsPerRev));
  const totalAngle = revolutions * Math.PI * 2;
  const dir = clockwise ? -1 : 1;
  const pts: Vec2[] = [];

  for (let i = 0; i <= totalSteps; i++) {
    const t = i / totalSteps;
    const theta = dir * t * totalAngle;
    const r = startRadius + t * (endRadius - startRadius);
    pts.push([center[0] + Math.cos(theta) * r, center[1] + Math.sin(theta) * r]);
  }

  return pts;
}

export function generateHelix3DPoints(
  center: Vec3,
  startRadius = 15,
  endRadius = 15,
  pitchMm = 8,
  revolutions = 4,
  clockwise = false,
  segmentsPerRev = 32
): Vec3[] {
  const totalSteps = Math.max(16, Math.round(revolutions * segmentsPerRev));
  const totalAngle = revolutions * Math.PI * 2;
  const totalHeight = revolutions * pitchMm;
  const dir = clockwise ? -1 : 1;
  const pts: Vec3[] = [];

  for (let i = 0; i <= totalSteps; i++) {
    const t = i / totalSteps;
    const theta = dir * t * totalAngle;
    const r = startRadius + t * (endRadius - startRadius);
    pts.push([
      center[0] + Math.cos(theta) * r,
      center[1] + Math.sin(theta) * r,
      center[2] + t * totalHeight,
    ]);
  }

  return pts;
}

/**
 * Evaluates a parametric or Cartesian equation curve:
 * - Explicit: yExpr = "12 * sin(t * 2)" with xExpr = "t * 10"
 * - Cam / Epitrochoid: xExpr = "22 * cos(t) + 4 * cos(5*t)", yExpr = "22 * sin(t) + 4 * sin(5*t)"
 */
export function generateEquationCurvePoints(
  xExpression: string,
  yExpression: string,
  tMin = 0,
  tMax = Math.PI * 2,
  steps = 72
): Vec2[] {
  const evalAtT = (expr: string, tVal: number): number => {
    const sanitized = expr
      .replace(/\bPI\b/gi, String(Math.PI))
      .replace(/\bsin\b/g, 'Math.sin')
      .replace(/\bcos\b/g, 'Math.cos')
      .replace(/\btan\b/g, 'Math.tan')
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\babs\b/g, 'Math.abs')
      .replace(/\bpow\b/g, 'Math.pow')
      .replace(/\bt\b/g, `(${tVal})`)
      .replace(/\bx\b/g, `(${tVal})`);
    try {
      const fn = new Function(`"use strict"; return (${sanitized});`);
      const res = Number(fn());
      return Number.isFinite(res) ? res : 0;
    } catch {
      return 0;
    }
  };

  const pts: Vec2[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = tMin + (i / steps) * (tMax - tMin);
    const x = evalAtT(xExpression, t);
    const y = evalAtT(yExpression, t);
    pts.push([x, y]);
  }
  return pts;
}

/**
 * 3. VECTOR TEXT GLYPH GENERATOR (Extrudable 2D Closed Profiles + Text on Path)
 */
const GLYPH_STROKES: Record<string, Vec2[][]> = {
  A: [[[0, 0], [0.5, 1], [1, 0]], [[0.2, 0.4], [0.8, 0.4]]],
  B: [[[0, 0], [0, 1], [0.7, 1], [0.9, 0.75], [0.7, 0.5], [0, 0.5]], [[0.7, 0.5], [0.9, 0.25], [0.7, 0], [0, 0]]],
  C: [[[1, 0.85], [0.7, 1], [0.2, 1], [0, 0.7], [0, 0.3], [0.2, 0], [0.7, 0], [1, 0.15]]],
  D: [[[0, 0], [0, 1], [0.65, 1], [1, 0.7], [1, 0.3], [0.65, 0], [0, 0]]],
  E: [[[1, 1], [0, 1], [0, 0], [1, 0]], [[0, 0.5], [0.75, 0.5]]],
  F: [[[0, 0], [0, 1], [1, 1]], [[0, 0.5], [0.75, 0.5]]],
  G: [[[1, 0.85], [0.7, 1], [0.2, 1], [0, 0.7], [0, 0.3], [0.2, 0], [0.8, 0], [1, 0.3], [1, 0.5], [0.55, 0.5]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  I: [[[0.2, 1], [0.8, 1]], [[0.5, 0], [0.5, 1]], [[0.2, 0], [0.8, 0]]],
  J: [[[0.8, 1], [0.8, 0.25], [0.55, 0], [0.2, 0], [0, 0.25]]],
  K: [[[0, 0], [0, 1]], [[1, 1], [0, 0.5], [1, 0]]],
  L: [[[0, 1], [0, 0], [1, 0]]],
  M: [[[0, 0], [0, 1], [0.5, 0.45], [1, 1], [1, 0]]],
  N: [[[0, 0], [0, 1], [1, 0], [1, 1]]],
  O: [[[0.2, 0], [0.8, 0], [1, 0.3], [1, 0.7], [0.8, 1], [0.2, 1], [0, 0.7], [0, 0.3], [0.2, 0]]],
  P: [[[0, 0], [0, 1], [0.75, 1], [1, 0.75], [0.75, 0.5], [0, 0.5]]],
  Q: [[[0.2, 0], [0.8, 0], [1, 0.3], [1, 0.7], [0.8, 1], [0.2, 1], [0, 0.7], [0, 0.3], [0.2, 0]], [[0.6, 0.3], [1.05, -0.05]]],
  R: [[[0, 0], [0, 1], [0.75, 1], [1, 0.75], [0.75, 0.5], [0, 0.5]], [[0.55, 0.5], [1, 0]]],
  S: [[[1, 0.85], [0.7, 1], [0.2, 1], [0, 0.75], [0.2, 0.5], [0.8, 0.5], [1, 0.25], [0.8, 0], [0.2, 0], [0, 0.15]]],
  T: [[[0, 1], [1, 1]], [[0.5, 0], [0.5, 1]]],
  U: [[[0, 1], [0, 0.25], [0.25, 0], [0.75, 0], [1, 0.25], [1, 1]]],
  V: [[[0, 1], [0.5, 0], [1, 1]]],
  W: [[[0, 1], [0.25, 0], [0.5, 0.55], [0.75, 0], [1, 1]]],
  X: [[[0, 1], [1, 0]], [[0, 0], [1, 1]]],
  Y: [[[0, 1], [0.5, 0.5], [1, 1]], [[0.5, 0.5], [0.5, 0]]],
  Z: [[[0, 1], [1, 1], [0, 0], [1, 0]]],
  '0': [[[0.2, 0], [0.8, 0], [1, 0.25], [1, 0.75], [0.8, 1], [0.2, 1], [0, 0.75], [0, 0.25], [0.2, 0]]],
  '1': [[[0.2, 0.8], [0.5, 1], [0.5, 0]], [[0.2, 0], [0.8, 0]]],
  '2': [[[0, 0.75], [0.25, 1], [0.75, 1], [1, 0.75], [0, 0], [1, 0]]],
  '3': [[[0, 0.85], [0.3, 1], [0.8, 1], [1, 0.75], [0.7, 0.5], [0.3, 0.5]], [[0.7, 0.5], [1, 0.25], [0.8, 0], [0.2, 0], [0, 0.15]]],
  '4': [[[0.75, 0], [0.75, 1], [0, 0.35], [1, 0.35]]],
  '5': [[[1, 1], [0, 1], [0, 0.55], [0.75, 0.55], [1, 0.3], [0.75, 0], [0.2, 0], [0, 0.15]]],
  '6': [[[0.85, 1], [0.3, 1], [0, 0.65], [0, 0.2], [0.25, 0], [0.75, 0], [1, 0.25], [0.75, 0.55], [0, 0.55]]],
  '7': [[[0, 1], [1, 1], [0.35, 0]]],
  '8': [[[0.2, 0.5], [0, 0.75], [0.2, 1], [0.8, 1], [1, 0.75], [0.8, 0.5], [0.2, 0.5], [0, 0.25], [0.2, 0], [0.8, 0], [1, 0.25], [0.8, 0.5]]],
  '9': [[[1, 0.45], [0.25, 0.45], [0, 0.75], [0.25, 1], [0.75, 1], [1, 0.75], [1, 0.25], [0.7, 0], [0.2, 0]]],
  '-': [[[0.15, 0.5], [0.85, 0.5]]],
  '+': [[[0.5, 0.15], [0.5, 0.85]], [[0.15, 0.5], [0.85, 0.5]]],
};

function expandPolylineToClosedBand(polyline: Vec2[], halfThickness: number): Vec2[] {
  if (polyline.length < 2) return polyline;
  const leftSide: Vec2[] = [];
  const rightSide: Vec2[] = [];

  for (let i = 0; i < polyline.length; i++) {
    const pCurr = polyline[i];
    const pPrev = i > 0 ? polyline[i - 1] : pCurr;
    const pNext = i < polyline.length - 1 ? polyline[i + 1] : pCurr;
    const dx = pNext[0] - pPrev[0];
    const dy = pNext[1] - pPrev[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    leftSide.push([pCurr[0] + nx * halfThickness, pCurr[1] + ny * halfThickness]);
    rightSide.unshift([pCurr[0] - nx * halfThickness, pCurr[1] - ny * halfThickness]);
  }

  return [...leftSide, ...rightSide, leftSide[0]];
}

export function generateVectorTextPrimitives(
  text: string,
  origin: Vec2 = [-25, 0],
  fontSizeMm = 12,
  letterSpacingMm = 3.2,
  arcPathRadius = 0 // If > 0, curves text along circular arc of this radius!
): SketchPrimitive[] {
  const upper = text.toUpperCase();
  const charWidth = fontSizeMm * 0.68;
  const strokeHalf = Math.max(0.55, fontSizeMm * 0.085);
  const primitives: SketchPrimitive[] = [];

  const totalWidth =
    upper.length * charWidth + Math.max(0, upper.length - 1) * letterSpacingMm;
  const startX = origin[0] - totalWidth / 2;

  for (let cIdx = 0; cIdx < upper.length; cIdx++) {
    const ch = upper[cIdx];
    const strokes = GLYPH_STROKES[ch];
    if (!strokes) continue;

    const charOffsetX = startX + cIdx * (charWidth + letterSpacingMm);

    for (const stroke of strokes) {
      const scaledStroke: Vec2[] = stroke.map(([gx, gy]) => {
        const lx = charOffsetX + gx * charWidth;
        const ly = origin[1] + (gy - 0.5) * fontSizeMm;

        if (arcPathRadius > 5) {
          // Wrap along circular path centered at (origin[0], origin[1] - arcPathRadius)
          const angle = (lx - origin[0]) / arcPathRadius;
          const r = arcPathRadius + (ly - origin[1]);
          return [
            origin[0] + Math.sin(angle) * r,
            origin[1] - arcPathRadius + Math.cos(angle) * r,
          ];
        }
        return [lx, ly];
      });

      const closedBand = expandPolylineToClosedBand(scaledStroke, strokeHalf);
      primitives.push({
        id: uuidv4(),
        type: 'text',
        points: closedBand,
        text: ch,
        fontSize: fontSizeMm,
        isConstruction: false,
        status: 'fully',
      });
    }
  }

  return primitives;
}

/**
 * 4. SKETCH FILLET, SKETCH CHAMFER & SPLIT CURVE
 */
export function applySketchCornerFillet(
  primA: SketchPrimitive,
  primB: SketchPrimitive,
  filletRadius: number
): { updatedA: SketchPrimitive; updatedB: SketchPrimitive; arcPrim: SketchPrimitive } | null {
  if (primA.points.length < 2 || primB.points.length < 2) return null;

  // Assume shared corner is primA.points[1] and primB.points[0]
  const pCorner = primA.points[1];
  const pStart = primA.points[0];
  const pEnd = primB.points[primB.points.length - 1];

  const v1x = pStart[0] - pCorner[0];
  const v1y = pStart[1] - pCorner[1];
  const len1 = Math.hypot(v1x, v1y);

  const v2x = pEnd[0] - pCorner[0];
  const v2y = pEnd[1] - pCorner[1];
  const len2 = Math.hypot(v2x, v2y);

  if (len1 < 1e-3 || len2 < 1e-3) return null;

  const u1x = v1x / len1;
  const u1y = v1y / len1;
  const u2x = v2x / len2;
  const u2y = v2y / len2;

  const dot = Math.max(-0.99, Math.min(0.99, u1x * u2x + u1y * u2y));
  const halfAngle = Math.acos(dot) / 2;
  const tanHalf = Math.tan(halfAngle);
  if (tanHalf < 1e-3) return null;

  const trimDist = Math.min(len1 * 0.45, len2 * 0.45, filletRadius / tanHalf);
  const actualRadius = trimDist * tanHalf;

  const t1: Vec2 = [pCorner[0] + u1x * trimDist, pCorner[1] + u1y * trimDist];
  const t2: Vec2 = [pCorner[0] + u2x * trimDist, pCorner[1] + u2y * trimDist];

  const bx = u1x + u2x;
  const by = u1y + u2y;
  const bLen = Math.hypot(bx, by) || 1;
  const centerDist = actualRadius / Math.sin(halfAngle);
  const arcCenter: Vec2 = [
    pCorner[0] + (bx / bLen) * centerDist,
    pCorner[1] + (by / bLen) * centerDist,
  ];

  // Sample 12 points along the tangent fillet arc from t1 to t2
  const a1 = Math.atan2(t1[1] - arcCenter[1], t1[0] - arcCenter[0]);
  let a2 = Math.atan2(t2[1] - arcCenter[1], t2[0] - arcCenter[0]);
  let diff = a2 - a1;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  const arcPts: Vec2[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = a1 + (i / 12) * diff;
    arcPts.push([
      arcCenter[0] + Math.cos(a) * actualRadius,
      arcCenter[1] + Math.sin(a) * actualRadius,
    ]);
  }

  return {
    updatedA: { ...primA, points: [pStart, t1] },
    updatedB: { ...primB, points: [t2, pEnd] },
    arcPrim: {
      id: uuidv4(),
      type: 'arc',
      points: arcPts,
      radius: actualRadius,
      isConstruction: false,
      status: 'fully',
    },
  };
}

export function applySketchCornerChamfer(
  primA: SketchPrimitive,
  primB: SketchPrimitive,
  distance1: number,
  distance2 = distance1
): { updatedA: SketchPrimitive; updatedB: SketchPrimitive; bevelPrim: SketchPrimitive } | null {
  if (primA.points.length < 2 || primB.points.length < 2) return null;

  const pCorner = primA.points[1];
  const pStart = primA.points[0];
  const pEnd = primB.points[primB.points.length - 1];

  const v1x = pStart[0] - pCorner[0];
  const v1y = pStart[1] - pCorner[1];
  const len1 = Math.hypot(v1x, v1y);

  const v2x = pEnd[0] - pCorner[0];
  const v2y = pEnd[1] - pCorner[1];
  const len2 = Math.hypot(v2x, v2y);

  if (len1 < 1e-3 || len2 < 1e-3) return null;

  const d1 = Math.min(len1 * 0.48, distance1);
  const d2 = Math.min(len2 * 0.48, distance2);

  const t1: Vec2 = [pCorner[0] + (v1x / len1) * d1, pCorner[1] + (v1y / len1) * d1];
  const t2: Vec2 = [pCorner[0] + (v2x / len2) * d2, pCorner[1] + (v2y / len2) * d2];

  return {
    updatedA: { ...primA, points: [pStart, t1] },
    updatedB: { ...primB, points: [t2, pEnd] },
    bevelPrim: {
      id: uuidv4(),
      type: 'line',
      points: [t1, t2],
      isConstruction: false,
      status: 'fully',
    },
  };
}

export function splitSketchPrimitiveAtPoint(
  prim: SketchPrimitive,
  splitPt?: Vec2
): SketchPrimitive[] {
  if (prim.points.length < 2) return [prim];
  const p0 = prim.points[0];
  const p1 = prim.points[prim.points.length - 1];
  const mid: Vec2 = splitPt || [(p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5];

  return [
    {
      ...prim,
      id: uuidv4(),
      points: [p0, mid],
    },
    {
      ...prim,
      id: uuidv4(),
      points: [mid, p1],
    },
  ];
}

/**
 * 5. INTERSECTION CURVE & PROJECT TO 3D SURFACE
 */
export function computePlaneBodyIntersectionCurve(
  plane: SketchPlane,
  body: CADBody
): Vec2[] {
  const planeNormal = new THREE.Vector3(...plane.normal).normalize();
  const planeOrigin = new THREE.Vector3(...plane.origin);
  const xAxis = new THREE.Vector3(...plane.xAxis).normalize();
  const yAxis = new THREE.Vector3(...plane.yAxis).normalize();
  const threePlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    planeNormal,
    planeOrigin
  );

  const nonIdx = body.geometry.toNonIndexed();
  const pos = nonIdx.getAttribute('position');
  if (!pos) return [];

  const numTris = Math.floor(pos.count / 3);
  const hitPts2D: Vec2[] = [];

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const line = new THREE.Line3();
  const hit = new THREE.Vector3();

  for (let t = 0; t < numTris; t++) {
    vA.fromBufferAttribute(pos, t * 3);
    vB.fromBufferAttribute(pos, t * 3 + 1);
    vC.fromBufferAttribute(pos, t * 3 + 2);

    const edges: [THREE.Vector3, THREE.Vector3][] = [
      [vA, vB],
      [vB, vC],
      [vC, vA],
    ];
    for (const [e0, e1] of edges) {
      line.set(e0, e1);
      if (threePlane.intersectLine(line, hit)) {
        const rel = hit.clone().sub(planeOrigin);
        hitPts2D.push([rel.dot(xAxis), rel.dot(yAxis)]);
      }
    }
  }

  if (hitPts2D.length < 3) return hitPts2D;

  // Order intersection points angularly around centroid to form a clean closed loop
  let cx = 0;
  let cy = 0;
  for (const p of hitPts2D) {
    cx += p[0];
    cy += p[1];
  }
  cx /= hitPts2D.length;
  cy /= hitPts2D.length;

  hitPts2D.sort(
    (a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx)
  );
  // Deduplicate nearby points
  const deduped: Vec2[] = [];
  for (const pt of hitPts2D) {
    if (
      deduped.length === 0 ||
      Math.hypot(
        pt[0] - deduped[deduped.length - 1][0],
        pt[1] - deduped[deduped.length - 1][1]
      ) > 0.8
    ) {
      deduped.push(pt);
    }
  }
  if (deduped.length > 2) deduped.push(deduped[0]);
  return deduped;
}

export function projectSketchCurveOntoBodySurface(
  points2D: Vec2[],
  plane: SketchPlane,
  targetBody: CADBody
): Vec3[] {
  const origin = new THREE.Vector3(...plane.origin);
  const normal = new THREE.Vector3(...plane.normal).normalize();
  const xAxis = new THREE.Vector3(...plane.xAxis).normalize();
  const yAxis = new THREE.Vector3(...plane.yAxis).normalize();

  const tempMesh = new THREE.Mesh(
    targetBody.geometry,
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
  );
  tempMesh.position.set(...targetBody.transform.position);
  tempMesh.rotation.set(...targetBody.transform.rotation);
  tempMesh.scale.set(...targetBody.transform.scale);
  tempMesh.updateMatrixWorld(true);

  const raycaster = new THREE.Raycaster();
  const projected3D: Vec3[] = [];

  for (const [u, v] of points2D) {
    const ptWorld = origin
      .clone()
      .addScaledVector(xAxis, u)
      .addScaledVector(yAxis, v);

    // Cast ray both along -normal and +normal to find closest surface point
    raycaster.set(ptWorld.clone().addScaledVector(normal, 120), normal.clone().negate());
    const hitsDown = raycaster.intersectObject(tempMesh, false);
    if (hitsDown.length > 0) {
      const p = hitsDown[0].point;
      projected3D.push([p.x, p.y, p.z]);
    } else {
      projected3D.push([ptWorld.x, ptWorld.y, ptWorld.z]);
    }
  }

  return projected3D;
}
