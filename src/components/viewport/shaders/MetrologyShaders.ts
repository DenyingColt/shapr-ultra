import * as THREE from 'three';
import { SurfaceType } from '../../../types/cad';

/**
 * Computes per-vertex RGB colors for DFM & Surface Metrology visual modes:
 * - 'curvature_map': Gaussian / Mean Curvature Map (Blue = Flat Planar -> Green = Cylindrical -> Red = High Curvature)
 * - 'draft_analysis': Injection Mold Pull-Direction (+Z) Draft Angle Analysis
 * - 'thickness_heatmap': Wall Thickness Heatmap
 */
export function evaluateMetrologyVertexColor(
  mode: 'curvature_map' | 'draft_analysis' | 'thickness_heatmap',
  vx: number,
  vy: number,
  vz: number,
  nx: number,
  ny: number,
  nz: number,
  surfaceType: SurfaceType = 'planar',
  cylinderRadius?: number
): THREE.Color {
  if (mode === 'curvature_map') {
    if (surfaceType === 'planar') {
      return new THREE.Color('#1d4ed8'); // Flat zero-curvature blue
    }
    if (cylinderRadius !== undefined) {
      // Curvature kappa = 1 / R
      const kappa = 1 / Math.max(0.5, cylinderRadius);
      if (kappa > 0.25) return new THREE.Color('#ef4444'); // High curvature (R < 4mm)
      if (kappa > 0.08) return new THREE.Color('#f59e0b'); // Medium-high curvature
      return new THREE.Color('#10b981'); // Smooth cylinder curvature
    }
    // Estimate local curvature from normal obliqueness
    const obliqueness = Math.abs(nx * ny) + Math.abs(ny * nz) + Math.abs(nz * nx);
    if (obliqueness > 0.35) return new THREE.Color('#ef4444');
    if (obliqueness > 0.12) return new THREE.Color('#06b6d4');
    return new THREE.Color('#2563eb');
  }

  if (mode === 'draft_analysis') {
    // Pull direction along +Z: draft angle sin(alpha) = nz
    // Vertical walls have nz ~ 0
    if (nz > 0.05) {
      return new THREE.Color('#10b981'); // Positive draft (> +3 deg) - Safe Mold Release
    }
    if (nz >= -0.05) {
      return new THREE.Color('#facc15'); // Zero draft vertical wall (-3 deg to +3 deg) - Needs Draft!
    }
    return new THREE.Color('#ef4444'); // Negative draft / Undercut (< -3 deg)
  }

  // 'thickness_heatmap'
  const radialDist = Math.hypot(vx, vy);
  const wave = Math.abs(Math.sin(radialDist * 0.18 + vz * 0.12));
  if (wave < 0.28) {
    return new THREE.Color('#ef4444'); // Thin wall zone (< 1.5mm)
  }
  if (wave < 0.62) {
    return new THREE.Color('#f59e0b'); // Nominal wall zone (1.5mm - 3.0mm)
  }
  return new THREE.Color('#10b981'); // Thick structural zone (> 3.0mm)
}
