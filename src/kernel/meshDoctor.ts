import * as THREE from 'three';
import { CADBody, Vec3 } from '../types/cad';
import { ensureIndexedGeometry } from './topologyBuilder';

export interface MeshDoctorReport {
  isWatertightManifold: boolean;
  openEdgeCount: number;
  totalTriangleCount: number;
  minWallThicknessMm: number;
  hasThinWallWarning: boolean;
  criticalOverhangFaceCount: number;
  boundingBoxMm: Vec3;
  totalVolumeCm3: number;
  estimatedPlaGrams: number;
  estimatedPrintTimeMinutes: number;
}

/**
 * Analyzes all visible CADBodies for 3D Printability (Manifold Watertightness,
 * Minimum Wall Thickness, 45° Overhang DFM analysis, Volume & Slicer estimates).
 */
export function analyzeMeshPrintReadiness(bodies: CADBody[]): MeshDoctorReport {
  const visibleBodies = bodies.filter((b) => b.visible);
  let openEdgeCount = 0;
  let totalTriangleCount = 0;
  let criticalOverhangFaceCount = 0;
  let totalVolumeMm3 = 0;
  let minWallThicknessMm = 999;

  const overallBox = new THREE.Box3();

  for (const body of visibleBodies) {
    openEdgeCount += body.topology.openEdgeCount || 0;
    const idx = body.geometry.getIndex();
    if (idx) totalTriangleCount += Math.floor(idx.count / 3);
    totalVolumeMm3 += body.topology.volumeMm3;

    body.geometry.computeBoundingBox();
    if (body.geometry.boundingBox) {
      overallBox.union(body.geometry.boundingBox);
    }

    // Check planar face pairs with opposing normals to estimate minimum wall thickness
    const planarFaces = body.topology.faces.filter((f) => f.surfaceType === 'planar');
    for (let i = 0; i < planarFaces.length; i++) {
      const fA = planarFaces[i];
      if (fA.normal[2] < -0.707 && fA.center[2] > 0.5) {
        criticalOverhangFaceCount++;
      }
      for (let j = i + 1; j < planarFaces.length; j++) {
        const fB = planarFaces[j];
        const dot =
          fA.normal[0] * fB.normal[0] +
          fA.normal[1] * fB.normal[1] +
          fA.normal[2] * fB.normal[2];
        if (dot < -0.92) {
          const dx = fB.center[0] - fA.center[0];
          const dy = fB.center[1] - fA.center[1];
          const dz = fB.center[2] - fA.center[2];
          const dist = Math.abs(dx * fA.normal[0] + dy * fA.normal[1] + dz * fA.normal[2]);
          if (dist > 0.25 && dist < minWallThicknessMm) {
            minWallThicknessMm = dist;
          }
        }
      }
    }
  }

  if (minWallThicknessMm === 999) {
    minWallThicknessMm = 3.2;
  }

  const size = new THREE.Vector3();
  if (!overallBox.isEmpty()) {
    overallBox.getSize(size);
  }

  const totalVolumeCm3 = Math.max(0.1, totalVolumeMm3 / 1000);
  // 35% infill + 3 perimeters effective PLA mass factor (~0.62 * 1.24 g/cm^3)
  const estimatedPlaGrams = totalVolumeCm3 * 0.85;
  const estimatedPrintTimeMinutes = Math.max(8, Math.round(totalVolumeCm3 * 2.4));

  return {
    isWatertightManifold: openEdgeCount === 0,
    openEdgeCount,
    totalTriangleCount,
    minWallThicknessMm: Number(minWallThicknessMm.toFixed(2)),
    hasThinWallWarning: minWallThicknessMm < 1.2,
    criticalOverhangFaceCount,
    boundingBoxMm: [
      Number(size.x.toFixed(1)),
      Number(size.y.toFixed(1)),
      Number(size.z.toFixed(1)),
    ],
    totalVolumeCm3: Number(totalVolumeCm3.toFixed(2)),
    estimatedPlaGrams: Number(estimatedPlaGrams.toFixed(1)),
    estimatedPrintTimeMinutes,
  };
}

/**
 * Applies Global XY Clearance / Tolerance Compensation (e.g. -0.10mm or -0.15mm)
 * along horizontal vertex normals to compensate for FDM/SLA 3D printer hole/shaft shrinkage.
 */
export function applyXYClearanceCompensation(
  geom: THREE.BufferGeometry,
  offsetMm: number
): THREE.BufferGeometry {
  if (Math.abs(offsetMm) < 1e-4) return geom;
  const cloned = ensureIndexedGeometry(geom, 1e-4);
  cloned.computeVertexNormals();

  const pos = cloned.getAttribute('position');
  const norm = cloned.getAttribute('normal');
  if (!pos || !norm) return cloned;

  for (let i = 0; i < pos.count; i++) {
    const nx = norm.getX(i);
    const ny = norm.getY(i);
    const horizLen = Math.hypot(nx, ny);
    if (horizLen > 0.25) {
      pos.setX(i, pos.getX(i) + (nx / horizLen) * offsetMm);
      pos.setY(i, pos.getY(i) + (ny / horizLen) * offsetMm);
    }
  }

  return ensureIndexedGeometry(cloned, 1e-3);
}
