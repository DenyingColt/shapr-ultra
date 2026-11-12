import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { AssemblyJoint, CADBody, InterferenceClash, Vec3 } from '../types/cad';
import { buildTopology } from './topologyBuilder';
import { performCSG } from './solidKernel';

/**
 * 1. AUTO-EXPLODED VIEW VECTOR SOLVER
 * Computes outward radial + axial explosion displacement vectors for each body
 * relative to the assembly centroid.
 */
export function computeExplodedViewVectors(bodies: CADBody[]): Record<string, Vec3> {
  const visible = bodies.filter((b) => b.visible);
  const result: Record<string, Vec3> = {};
  if (visible.length <= 1) {
    for (const b of bodies) result[b.id] = [0, 0, 0];
    return result;
  }

  const centers: { id: string; center: THREE.Vector3 }[] = [];
  const overallCenter = new THREE.Vector3();

  for (const b of visible) {
    b.geometry.computeBoundingBox();
    const c = new THREE.Vector3();
    if (b.geometry.boundingBox) {
      b.geometry.boundingBox.getCenter(c);
    }
    c.x += b.transform.position[0];
    c.y += b.transform.position[1];
    c.z += b.transform.position[2];
    centers.push({ id: b.id, center: c });
    overallCenter.add(c);
  }
  overallCenter.divideScalar(visible.length);

  centers.forEach((item, idx) => {
    const dir = item.center.clone().sub(overallCenter);
    if (dir.lengthSq() < 4) {
      // If concentric, stagger along Z and radial angle
      const angle = (idx / visible.length) * Math.PI * 2;
      dir.set(
        Math.cos(angle) * 28,
        Math.sin(angle) * 28,
        (idx - (visible.length - 1) / 2) * 34
      );
    } else {
      dir.normalize().multiplyScalar(48 + idx * 10);
    }
    result[item.id] = [dir.x, dir.y, dir.z];
  });

  return result;
}

/**
 * 2. KINEMATIC JOINT EVALUATOR (Rigid, Revolute, Slider, Cylindrical, Planar, Ball)
 */
export function evaluateAssemblyJointDelta(
  body: CADBody,
  joints: AssemblyJoint[],
  globalNormalizedTime: number // -1 to +1
): { posDelta: Vec3; rotDelta: Vec3 } {
  const joint = joints.find((j) => j.bodyBId === body.id || j.bodyAId === body.id);
  if (!joint || joint.type === 'rigid') {
    return { posDelta: [0, 0, 0], rotDelta: [0, 0, 0] };
  }

  const mid = (joint.minLimit + joint.maxLimit) * 0.5;
  const halfSpan = (joint.maxLimit - joint.minLimit) * 0.5;
  const val =
    Math.abs(globalNormalizedTime) > 0.001
      ? mid + globalNormalizedTime * halfSpan
      : joint.currentValue;

  const ax = new THREE.Vector3(...joint.axisWorld).normalize();

  if (joint.type === 'slider') {
    return {
      posDelta: [ax.x * val, ax.y * val, ax.z * val],
      rotDelta: [0, 0, 0],
    };
  }

  if (joint.type === 'revolute') {
    const rad = (val * Math.PI) / 180;
    return {
      posDelta: [0, 0, 0],
      rotDelta: [ax.x * rad, ax.y * rad, ax.z * rad],
    };
  }

  if (joint.type === 'cylindrical') {
    const rad = (val * Math.PI) / 180;
    const slide = val * 0.25;
    return {
      posDelta: [ax.x * slide, ax.y * slide, ax.z * slide],
      rotDelta: [ax.x * rad, ax.y * rad, ax.z * rad],
    };
  }

  if (joint.type === 'planar') {
    const slide = val * 0.35;
    return {
      posDelta: [slide, slide * 0.5, 0],
      rotDelta: [0, 0, (val * 0.4 * Math.PI) / 180],
    };
  }

  // Ball / Spherical joint (3-axis gimbal motion)
  const rad = (val * Math.PI) / 180;
  return {
    posDelta: [0, 0, 0],
    rotDelta: [rad * 0.6, rad * 0.4, rad * 0.8],
  };
}

/**
 * 3. BOOLEAN INTERFERENCE & COLLISION DETECTOR
 * Inspects all visible body pairs for overlapping 3D volume clashes.
 */
export function detectAssemblyInterferences(bodies: CADBody[]): InterferenceClash[] {
  const visible = bodies.filter((b) => b.visible && !b.isSurfaceBody);
  const clashes: InterferenceClash[] = [];

  const getWorldBox = (b: CADBody): THREE.Box3 => {
    b.geometry.computeBoundingBox();
    const box = b.geometry.boundingBox
      ? b.geometry.boundingBox.clone()
      : new THREE.Box3(new THREE.Vector3(-10, -10, -10), new THREE.Vector3(10, 10, 10));
    const offset = new THREE.Vector3(...b.transform.position);
    box.min.add(offset);
    box.max.add(offset);
    return box;
  };

  for (let i = 0; i < visible.length; i++) {
    const bodyA = visible[i];
    const boxA = getWorldBox(bodyA);

    for (let j = i + 1; j < visible.length; j++) {
      const bodyB = visible[j];
      const boxB = getWorldBox(bodyB);

      if (!boxA.intersectsBox(boxB)) continue;

      const overlapBox = boxA.clone().intersect(boxB);
      const size = new THREE.Vector3();
      overlapBox.getSize(size);
      const approxBoxOverlapVol = size.x * size.y * size.z;
      if (approxBoxOverlapVol < 0.25) continue;

      // Perform exact CSG Boolean Intersect in world space
      const geomAWorld = bodyA.geometry.clone();
      geomAWorld.translate(...bodyA.transform.position);
      const geomBWorld = bodyB.geometry.clone();
      geomBWorld.translate(...bodyB.transform.position);

      let volumeMm3 = Number((approxBoxOverlapVol * 0.42).toFixed(2));
      let clashGeometry: THREE.BufferGeometry | undefined;

      try {
        const intersectGeom = performCSG(geomAWorld, geomBWorld, 'intersect');
        const { topology } = buildTopology(intersectGeom, 'clash_tmp');
        if (topology.volumeMm3 > 0.1) {
          volumeMm3 = Number(topology.volumeMm3.toFixed(2));
          clashGeometry = intersectGeom;
        }
      } catch {
        // Fallback to overlap bounding box volume if coplanar
      }

      if (volumeMm3 > 0.2) {
        const center = new THREE.Vector3();
        overlapBox.getCenter(center);
        clashes.push({
          id: uuidv4(),
          bodyAId: bodyA.id,
          bodyAName: bodyA.name,
          bodyBId: bodyB.id,
          bodyBName: bodyB.name,
          volumeMm3,
          centerWorld: [
            Number(center.x.toFixed(2)),
            Number(center.y.toFixed(2)),
            Number(center.z.toFixed(2)),
          ],
          clashGeometry,
        });
      }
    }
  }

  return clashes;
}
