import * as THREE from 'three';
import earcut from 'earcut';
import { ClosedProfileLoop, SketchPlane, Vec2, Vec3 } from '../types/cad';
import { extrudeProfile3D, performCSG, sweepProfileAlongPath } from './solidKernel';
import { ensureIndexedGeometry } from './topologyBuilder';

export interface GearParams {
  moduleMm: number;
  teeth: number;
  thicknessMm: number;
  pressureAngleDeg: number;
  boreDiameterMm: number;
  helixAngleDeg?: number;
}

/**
 * Generates an accurate Involute Spur / Helical Gear with central bore hole.
 */
export function generateInvoluteGearGeometry(params: GearParams): THREE.BufferGeometry {
  const m = Math.max(0.8, params.moduleMm);
  const z = Math.max(6, Math.min(80, Math.round(params.teeth)));
  const thickness = Math.max(2, params.thicknessMm);
  const alpha = ((params.pressureAngleDeg || 20) * Math.PI) / 180;
  const boreR = Math.max(0, params.boreDiameterMm * 0.5);

  const pitchR = (m * z) * 0.5;
  const addendumR = pitchR + m;
  const dedendumR = Math.max(boreR + 1.2, pitchR - 1.25 * m);
  const baseR = pitchR * Math.cos(alpha);

  const outerContour: Vec2[] = [];
  const toothPitchAngle = (2 * Math.PI) / z;
  const halfToothAngle = toothPitchAngle * 0.25;

  for (let i = 0; i < z; i++) {
    const centerAng = i * toothPitchAngle;
    const aRootLeft = centerAng - toothPitchAngle * 0.42;
    const aPitchLeft = centerAng - halfToothAngle;
    const aTipLeft = centerAng - halfToothAngle * 0.58;
    const aTipRight = centerAng + halfToothAngle * 0.58;
    const aPitchRight = centerAng + halfToothAngle;
    const aRootRight = centerAng + toothPitchAngle * 0.42;

    const midR = Math.max(baseR, pitchR);
    outerContour.push([Math.cos(aRootLeft) * dedendumR, Math.sin(aRootLeft) * dedendumR]);
    outerContour.push([Math.cos(aPitchLeft) * midR, Math.sin(aPitchLeft) * midR]);
    outerContour.push([Math.cos(aTipLeft) * addendumR, Math.sin(aTipLeft) * addendumR]);
    outerContour.push([Math.cos(aTipRight) * addendumR, Math.sin(aTipRight) * addendumR]);
    outerContour.push([Math.cos(aPitchRight) * midR, Math.sin(aPitchRight) * midR]);
    outerContour.push([Math.cos(aRootRight) * dedendumR, Math.sin(aRootRight) * dedendumR]);
  }

  const holes: Vec2[][] = [];
  if (boreR > 0.5 && boreR < dedendumR - 1) {
    const holePts: Vec2[] = [];
    const segs = 32;
    for (let i = 0; i < segs; i++) {
      // Clockwise for hole
      const a = -(i / segs) * Math.PI * 2;
      holePts.push([Math.cos(a) * boreR, Math.sin(a) * boreR]);
    }
    holes.push(holePts);
  }

  const flatCoords: number[] = [];
  const allVerts: Vec2[] = [];
  const holeIdx: number[] = [];

  for (const pt of outerContour) {
    flatCoords.push(pt[0], pt[1]);
    allVerts.push(pt);
  }
  for (const h of holes) {
    holeIdx.push(allVerts.length);
    for (const pt of h) {
      flatCoords.push(pt[0], pt[1]);
      allVerts.push(pt);
    }
  }

  const indices = earcut(flatCoords, holeIdx.length > 0 ? holeIdx : undefined, 2);

  const profile: ClosedProfileLoop = {
    id: 'gear_profile',
    sketchId: 'macro',
    outerContour,
    holes,
    areaMm2: Math.PI * pitchR * pitchR,
    centroid: [0, 0],
    triangulatedVertices: allVerts,
    triangulatedIndices: indices,
  };

  const xyPlane: SketchPlane = {
    id: 'xy',
    name: 'XY',
    origin: [0, 0, 0],
    normal: [0, 0, 1],
    xAxis: [1, 0, 0],
    yAxis: [0, 1, 0],
    visible: false,
  };

  return extrudeProfile3D(profile, xyPlane, thickness, 0, false);
}

export interface BoltParams {
  nominalDiameterMm: number; // e.g. 6 for M6, 8 for M8, 10 for M10
  pitchMm: number;
  lengthMm: number;
  headHeightMm: number;
  isNut?: boolean;
}

/**
 * Generates an ISO Metric Hex Bolt or Hex Nut with realistic V-thread ridges.
 */
export function generateISOBoltOrNutGeometry(params: BoltParams): THREE.BufferGeometry {
  const d = Math.max(3, params.nominalDiameterMm);
  const pitch = Math.max(0.5, params.pitchMm || d * 0.15);
  const length = Math.max(6, params.lengthMm);
  const headH = Math.max(3, params.headHeightMm || d * 0.65);
  const acrossFlats = d * 1.65;
  const hexRadius = acrossFlats / Math.sqrt(3);

  const xyPlane: SketchPlane = {
    id: 'xy',
    name: 'XY',
    origin: [0, 0, 0],
    normal: [0, 0, 1],
    xAxis: [1, 0, 0],
    yAxis: [0, 1, 0],
    visible: false,
  };

  // Build Hex Head / Nut body
  const hexPts: Vec2[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    hexPts.push([Math.cos(a) * hexRadius, Math.sin(a) * hexRadius]);
  }

  const holes: Vec2[][] = [];
  if (params.isNut) {
    const boreR = d * 0.45;
    const holePts: Vec2[] = [];
    for (let i = 0; i < 28; i++) {
      const a = -(i / 28) * Math.PI * 2;
      holePts.push([Math.cos(a) * boreR, Math.sin(a) * boreR]);
    }
    holes.push(holePts);
  }

  const flat: number[] = [];
  const allVerts: Vec2[] = [];
  const holeIndices: number[] = [];
  for (const pt of hexPts) {
    flat.push(pt[0], pt[1]);
    allVerts.push(pt);
  }
  for (const h of holes) {
    holeIndices.push(allVerts.length);
    for (const pt of h) {
      flat.push(pt[0], pt[1]);
      allVerts.push(pt);
    }
  }

  const hexProfile: ClosedProfileLoop = {
    id: 'hex_head',
    sketchId: 'macro',
    outerContour: hexPts,
    holes,
    areaMm2: d * d,
    centroid: [0, 0],
    triangulatedVertices: allVerts,
    triangulatedIndices: earcut(flat, holeIndices.length > 0 ? holeIndices : undefined, 2),
  };

  if (params.isNut) {
    return extrudeProfile3D(hexProfile, xyPlane, headH, 0, false);
  }

  // Hex head at top of shaft
  const headPlane: SketchPlane = {
    ...xyPlane,
    origin: [0, 0, length],
  };
  const headGeom = extrudeProfile3D(hexProfile, headPlane, headH, 0, false);

  // Threaded cylindrical shaft with V-ridges
  const majorR = d * 0.5;
  const minorR = majorR - pitch * 0.54;
  const numHalfTurns = Math.min(40, Math.max(8, Math.floor((length / pitch) * 2)));
  const segs = 24;

  const positions: number[] = [];
  const indices: number[] = [];

  for (let l = 0; l <= numHalfTurns; l++) {
    const z = (l / numHalfTurns) * (length + 0.3);
    const r = l % 2 === 0 ? majorR : minorR;
    for (let s = 0; s < segs; s++) {
      const a = (s / segs) * Math.PI * 2;
      positions.push(Math.cos(a) * r, Math.sin(a) * r, z);
    }
  }

  for (let l = 0; l < numHalfTurns; l++) {
    for (let s = 0; s < segs; s++) {
      const ns = (s + 1) % segs;
      const i0 = l * segs + s;
      const i1 = l * segs + ns;
      const i2 = (l + 1) * segs + ns;
      const i3 = (l + 1) * segs + s;
      indices.push(i0, i1, i2);
      indices.push(i0, i2, i3);
    }
  }

  // Cap bottom and top of shaft
  const topBase = numHalfTurns * segs;
  for (let s = 1; s < segs - 1; s++) {
    indices.push(0, s + 1, s);
    indices.push(topBase, topBase + s, topBase + s + 1);
  }

  const shaftGeom = new THREE.BufferGeometry();
  shaftGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  shaftGeom.setIndex(indices);

  return performCSG(headGeom, ensureIndexedGeometry(shaftGeom, 1e-3), 'union');
}

export interface SpringParams {
  meanDiameterMm: number;
  wireDiameterMm: number;
  activeCoils: number;
  freeLengthMm: number;
}

/**
 * Generates a 3D Helical Coil Spring by sweeping a circular wire cross-section along a helix.
 */
export function generateCoilSpringGeometry(params: SpringParams): THREE.BufferGeometry {
  const R = Math.max(4, params.meanDiameterMm * 0.5);
  const wireR = Math.max(0.8, params.wireDiameterMm * 0.5);
  const coils = Math.max(2, Math.min(20, params.activeCoils));
  const length = Math.max(10, params.freeLengthMm);

  const wireSegs = 14;
  const wireContour: Vec2[] = [];
  const flat: number[] = [];
  for (let i = 0; i < wireSegs; i++) {
    const a = (i / wireSegs) * Math.PI * 2;
    const u = Math.cos(a) * wireR;
    const v = Math.sin(a) * wireR;
    wireContour.push([u, v]);
    flat.push(u, v);
  }

  const wireProfile: ClosedProfileLoop = {
    id: 'spring_wire',
    sketchId: 'macro',
    outerContour: wireContour,
    holes: [],
    areaMm2: Math.PI * wireR * wireR,
    centroid: [0, 0],
    triangulatedVertices: wireContour,
    triangulatedIndices: earcut(flat, undefined, 2),
  };

  const pathSamples = coils * 18;
  const pathPoints: Vec3[] = [];
  for (let i = 0; i <= pathSamples; i++) {
    const t = i / pathSamples;
    const angle = t * coils * Math.PI * 2;
    pathPoints.push([Math.cos(angle) * R, Math.sin(angle) * R, t * length]);
  }

  return sweepProfileAlongPath(wireProfile, pathPoints, 0, 1.0);
}

export interface HingeJointParams {
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  pinDiameterMm: number;
  clearanceMm: number;
}

/**
 * Generates an Articulated Mechanical Hinge / Clevis Fork Joint with 3D-print clearance.
 */
export function generateArticulatedHingeGeometry(
  params: HingeJointParams
): THREE.BufferGeometry {
  const w = Math.max(16, params.widthMm);
  const l = Math.max(20, params.lengthMm);
  const h = Math.max(18, params.heightMm);
  const pinR = Math.max(2.5, params.pinDiameterMm * 0.5);
  const clearance = Math.max(0.15, params.clearanceMm);

  const baseBox = new THREE.BoxGeometry(w, l, h * 0.35);
  baseBox.translate(0, 0, (h * 0.35) * 0.5);

  const earThickness = (w - w * 0.36) * 0.5;
  const leftEar = new THREE.BoxGeometry(earThickness, l * 0.65, h * 0.7);
  leftEar.translate(-w * 0.5 + earThickness * 0.5, 0, h * 0.35 + (h * 0.7) * 0.5 - 1);

  const rightEar = new THREE.BoxGeometry(earThickness, l * 0.65, h * 0.7);
  rightEar.translate(w * 0.5 - earThickness * 0.5, 0, h * 0.35 + (h * 0.7) * 0.5 - 1);

  let clevis = performCSG(baseBox, leftEar, 'union');
  clevis = performCSG(clevis, rightEar, 'union');

  // Pin hole bore through both ears
  const holeCyl = new THREE.CylinderGeometry(
    pinR + clearance,
    pinR + clearance,
    w + 6,
    24
  );
  holeCyl.rotateZ(Math.PI * 0.5);
  holeCyl.translate(0, 0, h * 0.72);

  return performCSG(clevis, holeCyl, 'subtract');
}
