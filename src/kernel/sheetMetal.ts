import * as THREE from 'three';
import { CADBody, SheetMetalParams } from '../types/cad';
import { ensureIndexedGeometry } from './topologyBuilder';
import { performCSG } from './solidKernel';

export const DEFAULT_SHEET_METAL_PARAMS: SheetMetalParams = {
  thicknessMm: 2.0,
  bendRadiusMm: 2.5,
  kFactor: 0.44,
  reliefType: 'obround',
  bendAngleDeg: 90,
  flangeLengthMm: 26,
  bendsCount: 1,
};

/**
 * Computes exact Sheet Metal Bend Allowance (BA):
 * BA = (PI * |angleDeg| / 180) * (R + K * t)
 */
export function calculateBendAllowance(
  thicknessMm: number,
  bendRadiusMm: number,
  kFactor: number,
  angleDeg: number
): number {
  const angleRad = (Math.abs(angleDeg) * Math.PI) / 180;
  return angleRad * (bendRadiusMm + kFactor * thicknessMm);
}

/**
 * 1. BASE FLANGE GENERATOR
 */
export function generateSheetMetalBaseFlange(
  widthMm = 70,
  depthMm = 50,
  params: SheetMetalParams = DEFAULT_SHEET_METAL_PARAMS
): THREE.BufferGeometry {
  const t = Math.max(0.5, params.thicknessMm);
  const geom = new THREE.BoxGeometry(widthMm, depthMm, t);
  geom.translate(0, 0, t / 2);
  return ensureIndexedGeometry(geom);
}

/**
 * 2. EDGE FLANGE (BEND + STRAIGHT LEG + CORNER RELIEF CUTOUTS)
 */
export function addSheetMetalEdgeFlange(
  body: CADBody,
  params: SheetMetalParams = DEFAULT_SHEET_METAL_PARAMS,
  side: 'right' | 'left' = 'right'
): THREE.BufferGeometry {
  body.geometry.computeBoundingBox();
  const bbox = body.geometry.boundingBox;
  if (!bbox) return body.geometry.clone();

  const t = Math.max(0.5, params.thicknessMm);
  const R = Math.max(0.8, params.bendRadiusMm);
  const L = Math.max(6, params.flangeLengthMm);
  const angleRad = ((params.bendAngleDeg || 90) * Math.PI) / 180;

  const spanY = Math.max(10, (bbox.max.y - bbox.min.y) * 0.92);
  const centerY = (bbox.min.y + bbox.max.y) * 0.5;
  const edgeX = side === 'right' ? bbox.max.x : bbox.min.x;
  const baseZ = bbox.min.z;
  const dirX = side === 'right' ? 1 : -1;

  // Build 2D cross-section of cylindrical bend + straight flange in XZ plane
  // Bend center is at (edgeX, baseZ + t + R)
  const bendCenterX = edgeX;
  const bendCenterZ = baseZ + t + R;
  const rInner = R;
  const rOuter = R + t;

  const arcSteps = 16;
  const shape = new THREE.Shape();

  // Outer arc from -PI/2 to -PI/2 + angleRad
  for (let i = 0; i <= arcSteps; i++) {
    const u = i / arcSteps;
    const theta = -Math.PI / 2 + u * angleRad;
    const px = bendCenterX + dirX * Math.cos(theta) * rOuter;
    const pz = bendCenterZ + Math.sin(theta) * rOuter;
    if (i === 0) shape.moveTo(px, pz);
    else shape.lineTo(px, pz);
  }

  // Tangent vector at end of bend
  const endTheta = -Math.PI / 2 + angleRad;
  const tx = -dirX * Math.sin(endTheta);
  const tz = Math.cos(endTheta);

  const outerArcEndX = bendCenterX + dirX * Math.cos(endTheta) * rOuter;
  const outerArcEndZ = bendCenterZ + Math.sin(endTheta) * rOuter;
  const innerArcEndX = bendCenterX + dirX * Math.cos(endTheta) * rInner;
  const innerArcEndZ = bendCenterZ + Math.sin(endTheta) * rInner;

  // Extend straight flange leg by L along tangent (tx, tz)
  shape.lineTo(outerArcEndX + tx * L, outerArcEndZ + tz * L);
  shape.lineTo(innerArcEndX + tx * L, innerArcEndZ + tz * L);

  // Inner arc back from angleRad to -PI/2
  for (let i = arcSteps; i >= 0; i--) {
    const u = i / arcSteps;
    const theta = -Math.PI / 2 + u * angleRad;
    const px = bendCenterX + dirX * Math.cos(theta) * rInner;
    const pz = bendCenterZ + Math.sin(theta) * rInner;
    shape.lineTo(px, pz);
  }
  shape.closePath();

  const extrudeGeom = new THREE.ExtrudeGeometry(shape, {
    depth: spanY,
    bevelEnabled: false,
  });
  // ExtrudeGeometry extrudes along +Z; rotate so shape XZ maps to world XZ and depth maps to world Y
  extrudeGeom.rotateX(Math.PI / 2);
  extrudeGeom.translate(0, centerY + spanY / 2, 0);

  return performCSG(body.geometry, ensureIndexedGeometry(extrudeGeom), 'union');
}

/**
 * 3. SHEET METAL HEM (180-DEGREE ROLLED / TEARDROP EDGE FOLD)
 */
export function addSheetMetalHemOnEdge(
  body: CADBody,
  params: SheetMetalParams = DEFAULT_SHEET_METAL_PARAMS
): THREE.BufferGeometry {
  const hemParams: SheetMetalParams = {
    ...params,
    bendAngleDeg: 175,
    bendRadiusMm: Math.max(0.8, params.thicknessMm * 0.65),
    flangeLengthMm: Math.max(5, params.thicknessMm * 3.5),
  };
  return addSheetMetalEdgeFlange(body, hemParams, 'left');
}

/**
 * 4. UNFOLD / FLAT PATTERN GENERATOR (3D Unfolded Sheet + 1:1 Laser Cut DXF & SVG)
 */
export function unfoldSheetMetalToFlatPattern(
  body: CADBody,
  params: SheetMetalParams = DEFAULT_SHEET_METAL_PARAMS
): {
  flatGeometry: THREE.BufferGeometry;
  flatWidthMm: number;
  flatDepthMm: number;
  bendAllowanceMm: number;
  dxfString: string;
  svgString: string;
} {
  body.geometry.computeBoundingBox();
  const bbox = body.geometry.boundingBox;
  const baseW = bbox ? Math.max(30, bbox.max.x - bbox.min.x) : 70;
  const baseD = bbox ? Math.max(25, bbox.max.y - bbox.min.y) : 50;

  const bendsCount = params.bendsCount || 2;
  const ba = calculateBendAllowance(
    params.thicknessMm,
    params.bendRadiusMm,
    params.kFactor,
    params.bendAngleDeg
  );

  const flatWidthMm = Number(
    (baseW + bendsCount * (params.flangeLengthMm + ba)).toFixed(2)
  );
  const flatDepthMm = Number(baseD.toFixed(2));

  // Build unfolded 3D flat sheet with corner relief notches
  const hw = flatWidthMm / 2;
  const hd = flatDepthMm / 2;
  const bendLineX1 = -baseW / 2;
  const bendLineX2 = baseW / 2;
  const reliefW = Math.max(2.0, params.thicknessMm * 1.2);
  const reliefD = Math.max(2.5, params.bendRadiusMm + params.thicknessMm);

  const flatShape = new THREE.Shape();
  flatShape.moveTo(-hw, -hd);
  flatShape.lineTo(bendLineX1 - reliefW, -hd);
  flatShape.lineTo(bendLineX1 - reliefW, -hd + reliefD);
  flatShape.lineTo(bendLineX1 + reliefW, -hd + reliefD);
  flatShape.lineTo(bendLineX1 + reliefW, -hd);
  flatShape.lineTo(bendLineX2 - reliefW, -hd);
  flatShape.lineTo(bendLineX2 - reliefW, -hd + reliefD);
  flatShape.lineTo(bendLineX2 + reliefW, -hd + reliefD);
  flatShape.lineTo(bendLineX2 + reliefW, -hd);
  flatShape.lineTo(hw, -hd);
  flatShape.lineTo(hw, hd);
  flatShape.lineTo(bendLineX2 + reliefW, hd);
  flatShape.lineTo(bendLineX2 + reliefW, hd - reliefD);
  flatShape.lineTo(bendLineX2 - reliefW, hd - reliefD);
  flatShape.lineTo(bendLineX2 - reliefW, hd);
  flatShape.lineTo(bendLineX1 + reliefW, hd);
  flatShape.lineTo(bendLineX1 + reliefW, hd - reliefD);
  flatShape.lineTo(bendLineX1 - reliefW, hd - reliefD);
  flatShape.lineTo(bendLineX1 - reliefW, hd);
  flatShape.lineTo(-hw, hd);
  flatShape.closePath();

  const flatGeom = new THREE.ExtrudeGeometry(flatShape, {
    depth: params.thicknessMm,
    bevelEnabled: false,
  });

  // 1:1 SVG with BEND UP centerlines
  const pad = 25;
  const svgW = flatWidthMm + pad * 2;
  const svgH = flatDepthMm + pad * 2;

  const svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-svgW / 2} ${-svgH / 2} ${svgW} ${svgH}" width="${svgW}mm" height="${svgH}mm">
  <rect x="${-hw}" y="${-hd}" width="${flatWidthMm}" height="${flatDepthMm}" fill="#f8fafc" stroke="#0f172a" stroke-width="0.8"/>
  <line x1="${bendLineX1}" y1="${-hd}" x2="${bendLineX1}" y2="${hd}" stroke="#dc2626" stroke-width="0.6" stroke-dasharray="3 2"/>
  <line x1="${bendLineX2}" y1="${-hd}" x2="${bendLineX2}" y2="${hd}" stroke="#dc2626" stroke-width="0.6" stroke-dasharray="3 2"/>
  <text x="${bendLineX1 + 2}" y="0" font-family="monospace" font-size="3.2" fill="#dc2626">BEND UP ${params.bendAngleDeg}° (R=${params.bendRadiusMm} K=${params.kFactor})</text>
  <text x="0" y="${hd + 9}" text-anchor="middle" font-family="monospace" font-size="3.8" fill="#0f172a">FLAT PATTERN: ${flatWidthMm} x ${flatDepthMm} mm | BA=${ba.toFixed(2)}mm | t=${params.thicknessMm}mm</text>
</svg>`;

  const dxfString = [
    '0', 'SECTION', '2', 'ENTITIES',
    '0', 'LINE', '8', 'OUTER_CUT', '10', String(-hw), '20', String(-hd), '11', String(hw), '21', String(-hd),
    '0', 'LINE', '8', 'OUTER_CUT', '10', String(hw), '20', String(-hd), '11', String(hw), '21', String(hd),
    '0', 'LINE', '8', 'OUTER_CUT', '10', String(hw), '20', String(hd), '11', String(-hw), '21', String(hd),
    '0', 'LINE', '8', 'OUTER_CUT', '10', String(-hw), '20', String(hd), '11', String(-hw), '21', String(-hd),
    '0', 'LINE', '8', 'BEND_LINES', '10', String(bendLineX1), '20', String(-hd), '11', String(bendLineX1), '21', String(hd),
    '0', 'LINE', '8', 'BEND_LINES', '10', String(bendLineX2), '20', String(-hd), '11', String(bendLineX2), '21', String(hd),
    '0', 'ENDSEC', '0', 'EOF',
  ].join('\n');

  return {
    flatGeometry: ensureIndexedGeometry(flatGeom),
    flatWidthMm,
    flatDepthMm,
    bendAllowanceMm: Number(ba.toFixed(3)),
    dxfString,
    svgString,
  };
}
