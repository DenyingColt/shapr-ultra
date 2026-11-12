import React from 'react';
import * as THREE from 'three';
import { SectionBoxBounds } from '../../types/cad';
import { useCADStore } from '../../store/useCADStore';

export function buildSectionBoxClippingPlanes(box: SectionBoxBounds): THREE.Plane[] {
  if (!box.enabled) return [];
  return [
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -box.minX),
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), box.maxX),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -box.minY),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), box.maxY),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -box.minZ),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), box.maxZ),
  ];
}

export const SectionBoxGizmo: React.FC = () => {
  const sectionBox = useCADStore((s) => s.sectionBox);
  if (!sectionBox.enabled) return null;

  const w = Math.max(2, sectionBox.maxX - sectionBox.minX);
  const d = Math.max(2, sectionBox.maxY - sectionBox.minY);
  const h = Math.max(2, sectionBox.maxZ - sectionBox.minZ);
  const cx = (sectionBox.minX + sectionBox.maxX) * 0.5;
  const cy = (sectionBox.minY + sectionBox.maxY) * 0.5;
  const cz = (sectionBox.minZ + sectionBox.maxZ) * 0.5;

  return (
    <group position={[cx, cy, cz]}>
      <mesh>
        <boxGeometry args={[w, d, h]} />
        <meshBasicMaterial
          color="#f59e0b"
          wireframe
          transparent
          opacity={0.55}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
};
