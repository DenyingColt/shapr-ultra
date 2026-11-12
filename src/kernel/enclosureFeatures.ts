import * as THREE from 'three';
import { CADBody, HoleWizardParams, ISOMetricThreadSize, Vec3 } from '../types/cad';
import { ensureIndexedGeometry } from './topologyBuilder';
import { performCSG } from './solidKernel';

export interface ISOHoleSpec {
  nominalMm: number;
  pitchMm: number;
  tapDrillMm: number;
  clearanceCloseMm: number;
  clearanceNormalMm: number;
  clearanceLooseMm: number;
  counterboreDiaMm: number;
  counterboreDepthMm: number;
  countersinkDiaMm: number;
}

export const ISO_METRIC_HOLE_TABLE: Record<ISOMetricThreadSize, ISOHoleSpec> = {
  M2: {
    nominalMm: 2.0,
    pitchMm: 0.4,
    tapDrillMm: 1.6,
    clearanceCloseMm: 2.2,
    clearanceNormalMm: 2.4,
    clearanceLooseMm: 2.6,
    counterboreDiaMm: 4.4,
    counterboreDepthMm: 2.0,
    countersinkDiaMm: 4.4,
  },
  'M2.5': {
    nominalMm: 2.5,
    pitchMm: 0.45,
    tapDrillMm: 2.05,
    clearanceCloseMm: 2.7,
    clearanceNormalMm: 2.9,
    clearanceLooseMm: 3.1,
    counterboreDiaMm: 5.4,
    counterboreDepthMm: 2.5,
    countersinkDiaMm: 5.5,
  },
  M3: {
    nominalMm: 3.0,
    pitchMm: 0.5,
    tapDrillMm: 2.5,
    clearanceCloseMm: 3.2,
    clearanceNormalMm: 3.4,
    clearanceLooseMm: 3.6,
    counterboreDiaMm: 6.5,
    counterboreDepthMm: 3.0,
    countersinkDiaMm: 6.6,
  },
  M4: {
    nominalMm: 4.0,
    pitchMm: 0.7,
    tapDrillMm: 3.3,
    clearanceCloseMm: 4.3,
    clearanceNormalMm: 4.5,
    clearanceLooseMm: 4.8,
    counterboreDiaMm: 8.0,
    counterboreDepthMm: 4.0,
    countersinkDiaMm: 9.0,
  },
  M5: {
    nominalMm: 5.0,
    pitchMm: 0.8,
    tapDrillMm: 4.2,
    clearanceCloseMm: 5.3,
    clearanceNormalMm: 5.5,
    clearanceLooseMm: 5.8,
    counterboreDiaMm: 10.0,
    counterboreDepthMm: 5.0,
    countersinkDiaMm: 11.0,
  },
  M6: {
    nominalMm: 6.0,
    pitchMm: 1.0,
    tapDrillMm: 5.0,
    clearanceCloseMm: 6.4,
    clearanceNormalMm: 6.6,
    clearanceLooseMm: 7.0,
    counterboreDiaMm: 11.0,
    counterboreDepthMm: 6.0,
    countersinkDiaMm: 13.5,
  },
  M8: {
    nominalMm: 8.0,
    pitchMm: 1.25,
    tapDrillMm: 6.8,
    clearanceCloseMm: 8.4,
    clearanceNormalMm: 9.0,
    clearanceLooseMm: 10.0,
    counterboreDiaMm: 15.0,
    counterboreDepthMm: 8.0,
    countersinkDiaMm: 17.5,
  },
  M10: {
    nominalMm: 10.0,
    pitchMm: 1.5,
    tapDrillMm: 8.5,
    clearanceCloseMm: 10.5,
    clearanceNormalMm: 11.0,
    clearanceLooseMm: 12.0,
    counterboreDiaMm: 18.0,
    counterboreDepthMm: 10.0,
    countersinkDiaMm: 21.5,
  },
  M12: {
    nominalMm: 12.0,
    pitchMm: 1.75,
    tapDrillMm: 10.2,
    clearanceCloseMm: 13.0,
    clearanceNormalMm: 13.5,
    clearanceLooseMm: 14.5,
    counterboreDiaMm: 20.0,
    counterboreDepthMm: 12.0,
    countersinkDiaMm: 25.5,
  },
  M16: {
    nominalMm: 16.0,
    pitchMm: 2.0,
    tapDrillMm: 14.0,
    clearanceCloseMm: 17.0,
    clearanceNormalMm: 17.5,
    clearanceLooseMm: 18.5,
    counterboreDiaMm: 26.0,
    counterboreDepthMm: 16.0,
    countersinkDiaMm: 33.5,
  },
  M20: {
    nominalMm: 20.0,
    pitchMm: 2.5,
    tapDrillMm: 17.5,
    clearanceCloseMm: 21.0,
    clearanceNormalMm: 22.0,
    clearanceLooseMm: 24.0,
    counterboreDiaMm: 33.0,
    counterboreDepthMm: 20.0,
    countersinkDiaMm: 41.5,
  },
};

/**
 * 1. STANDARDIZED HOLE WIZARD (Simple, Counterbore, Countersink, Tapped + Drill Tip)
 */
export function buildHoleCutterGeometry(params: HoleWizardParams): THREE.BufferGeometry {
  const spec = ISO_METRIC_HOLE_TABLE[params.isoSize] || ISO_METRIC_HOLE_TABLE.M6;

  const mainDia =
    params.holeType === 'tapped'
      ? spec.tapDrillMm
      : params.fitClass === 'close'
      ? spec.clearanceCloseMm
      : params.fitClass === 'loose'
      ? spec.clearanceLooseMm
      : spec.clearanceNormalMm;

  const rMain = mainDia / 2;
  const totalDepth = params.depthMode === 'through_all' ? 120 : Math.max(3, params.depthMm);

  // Build 2D revolution profile in XY (X = radius, Y = depth along -Y from 0 down to -totalDepth)
  const profilePts: THREE.Vector2[] = [];
  const topOvercut = 1.5;

  if (params.holeType === 'counterbore') {
    const rCb = spec.counterboreDiaMm / 2;
    const dCb = Math.min(totalDepth * 0.7, spec.counterboreDepthMm);
    profilePts.push(new THREE.Vector2(0, topOvercut));
    profilePts.push(new THREE.Vector2(rCb, topOvercut));
    profilePts.push(new THREE.Vector2(rCb, -dCb));
    profilePts.push(new THREE.Vector2(rMain, -dCb));
  } else if (params.holeType === 'countersink') {
    const rCs = spec.countersinkDiaMm / 2;
    const dCs = Math.max(1.0, rCs - rMain); // 90 deg countersink
    profilePts.push(new THREE.Vector2(0, topOvercut));
    profilePts.push(new THREE.Vector2(rCs, topOvercut));
    profilePts.push(new THREE.Vector2(rCs, 0));
    profilePts.push(new THREE.Vector2(rMain, -dCs));
  } else {
    profilePts.push(new THREE.Vector2(0, topOvercut));
    profilePts.push(new THREE.Vector2(rMain, topOvercut));
  }

  // Bottom tip (180 flat vs 118/135 drill point cone)
  if (params.tipAngleDeg < 180 && params.depthMode === 'blind') {
    const halfConeRad = ((params.tipAngleDeg / 2) * Math.PI) / 180;
    const coneHeight = rMain / Math.tan(halfConeRad);
    profilePts.push(new THREE.Vector2(rMain, -totalDepth));
    profilePts.push(new THREE.Vector2(0, -(totalDepth + coneHeight)));
  } else {
    profilePts.push(new THREE.Vector2(rMain, -totalDepth));
    profilePts.push(new THREE.Vector2(0, -totalDepth));
  }

  const latheGeom = new THREE.LatheGeometry(profilePts, 32);
  // LatheGeometry revolves around Y axis; rotate so -Y drills along -normal
  latheGeom.rotateX(Math.PI / 2);

  const normalVec = new THREE.Vector3(...params.normal).normalize();
  const posVec = new THREE.Vector3(...params.position);
  const quat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    normalVec
  );
  const mat = new THREE.Matrix4().compose(posVec, quat, new THREE.Vector3(1, 1, 1));
  latheGeom.applyMatrix4(mat);

  return ensureIndexedGeometry(latheGeom);
}

export function drillParametricHoleOnBody(
  body: CADBody,
  params: HoleWizardParams
): THREE.BufferGeometry {
  const cutter = buildHoleCutterGeometry(params);
  return performCSG(body.geometry, cutter, 'subtract');
}

/**
 * 2. STRUCTURAL RIB / WEB STIFFENER
 */
export function generateStructuralRibOnBody(
  body: CADBody,
  ribThicknessMm = 2.5,
  ribHeightMm = 14,
  ribAngleDeg = 0
): THREE.BufferGeometry {
  body.geometry.computeBoundingBox();
  const bbox = body.geometry.boundingBox;
  if (!bbox) return body.geometry.clone();

  const spanX = Math.max(12, (bbox.max.x - bbox.min.x) * 0.88);
  const centerZ = bbox.min.z + ribHeightMm / 2 + 1.5;
  const centerX = (bbox.min.x + bbox.max.x) * 0.5;
  const centerY = (bbox.min.y + bbox.max.y) * 0.5;

  const ribGeom = new THREE.BoxGeometry(spanX, ribThicknessMm, ribHeightMm);
  if (Math.abs(ribAngleDeg) > 0.1) {
    ribGeom.rotateZ((ribAngleDeg * Math.PI) / 180);
  }
  ribGeom.translate(centerX, centerY, centerZ);

  const indexedRib = ensureIndexedGeometry(ribGeom);
  return performCSG(body.geometry, indexedRib, 'union');
}

/**
 * 3. MOUNTING BOSS WITH SELF-TAPPING BORE & 4 RADIAL SUPPORT GUSSETS
 */
export function generateMountingBossGeometry(
  position: Vec3 = [0, 0, 2],
  outerDiaMm = 8.0,
  innerHoleDiaMm = 3.2,
  heightMm = 14.0,
  gussetCount = 4
): THREE.BufferGeometry {
  const rOut = Math.max(2.5, outerDiaMm / 2);
  const rIn = Math.max(0.8, Math.min(rOut - 1.0, innerHoleDiaMm / 2));

  // Outer cylinder + 4 radial gusset fins
  const outerCyl = new THREE.CylinderGeometry(rOut * 0.92, rOut * 1.05, heightMm, 28);
  outerCyl.rotateX(Math.PI / 2);
  outerCyl.translate(0, 0, heightMm / 2);

  let bossSolid = ensureIndexedGeometry(outerCyl);

  const gussetWidth = Math.max(1.4, rOut * 0.38);
  const gussetReach = rOut * 1.85;
  for (let i = 0; i < gussetCount; i++) {
    const angle = (i / gussetCount) * Math.PI * 2;
    const finShape = new THREE.Shape();
    finShape.moveTo(rOut * 0.7, 0);
    finShape.lineTo(gussetReach, 0);
    finShape.lineTo(rOut * 0.85, heightMm * 0.82);
    finShape.closePath();

    const finGeom = new THREE.ExtrudeGeometry(finShape, {
      depth: gussetWidth,
      bevelEnabled: false,
    });
    finGeom.translate(0, 0, -gussetWidth / 2);
    finGeom.rotateX(Math.PI / 2);
    finGeom.rotateZ(angle);

    bossSolid = performCSG(bossSolid, ensureIndexedGeometry(finGeom), 'union');
  }

  // Subtract center screw hole
  const boreCyl = new THREE.CylinderGeometry(rIn, rIn, heightMm + 4, 24);
  boreCyl.rotateX(Math.PI / 2);
  boreCyl.translate(0, 0, heightMm / 2);

  bossSolid = performCSG(bossSolid, ensureIndexedGeometry(boreCyl), 'subtract');
  bossSolid.translate(position[0], position[1], position[2]);
  return bossSolid;
}

export function addMountingBossToBody(
  body: CADBody,
  position: Vec3,
  outerDiaMm = 8.0,
  innerHoleDiaMm = 3.2,
  heightMm = 14.0
): THREE.BufferGeometry {
  const boss = generateMountingBossGeometry(position, outerDiaMm, innerHoleDiaMm, heightMm, 4);
  return performCSG(body.geometry, boss, 'union');
}

/**
 * 4. SNAP-FIT INTERLOCKING LIP & GROOVE ON ENCLOSURE RIM
 */
export function applyEnclosureLipOrGroove(
  body: CADBody,
  mode: 'lip' | 'groove' = 'lip',
  lipHeightMm = 2.5,
  lipWidthMm = 1.4,
  clearanceMm = 0.15
): THREE.BufferGeometry {
  body.geometry.computeBoundingBox();
  const bbox = body.geometry.boundingBox;
  if (!bbox) return body.geometry.clone();

  const w = bbox.max.x - bbox.min.x;
  const d = bbox.max.y - bbox.min.y;
  const topZ = bbox.max.z;
  const cx = (bbox.min.x + bbox.max.x) * 0.5;
  const cy = (bbox.min.y + bbox.max.y) * 0.5;

  const outerW = Math.max(8, w - 2.2 - (mode === 'lip' ? clearanceMm * 2 : 0));
  const outerD = Math.max(8, d - 2.2 - (mode === 'lip' ? clearanceMm * 2 : 0));
  const innerW = Math.max(4, outerW - lipWidthMm * 2);
  const innerD = Math.max(4, outerD - lipWidthMm * 2);

  const outerBox = new THREE.BoxGeometry(outerW, outerD, lipHeightMm);
  const innerBox = new THREE.BoxGeometry(innerW, innerD, lipHeightMm + 2);

  let ringRim = performCSG(
    ensureIndexedGeometry(outerBox),
    ensureIndexedGeometry(innerBox),
    'subtract'
  );

  if (mode === 'lip') {
    ringRim.translate(cx, cy, topZ + lipHeightMm / 2 - 0.2);
    return performCSG(body.geometry, ringRim, 'union');
  } else {
    ringRim.translate(cx, cy, topZ - lipHeightMm / 2 + 0.2);
    return performCSG(body.geometry, ringRim, 'subtract');
  }
}
