import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Grid, Line } from '@react-three/drei';
import { useCADStore } from '../../store/useCADStore';

export const AdaptiveGrid: React.FC = () => {
  const activeSketchId = useCADStore((s) => s.activeSketchId);
  const sketches = useCADStore((s) => s.sketches);
  const gridSnapMm = useCADStore((s) => s.gridSnapMm);

  const activeSketch = useMemo(
    () => sketches.find((sk) => sk.id === activeSketchId) || null,
    [sketches, activeSketchId]
  );

  // Compute transform matrix aligning the grid to the active sketch plane (or default XY Z=0)
  const { position, rotation } = useMemo(() => {
    if (!activeSketch) {
      // Default XY plane at Z=0 (Grid in Drei lies on XZ by default, so rotate X by 90 deg)
      return {
        position: new THREE.Vector3(0, 0, -0.02),
        rotation: new THREE.Euler(Math.PI / 2, 0, 0),
      };
    }

    const { origin, normal, xAxis, yAxis } = activeSketch.plane;
    const mat = new THREE.Matrix4();
    const vx = new THREE.Vector3(...xAxis).normalize();
    const vy = new THREE.Vector3(...normal).normalize();
    const vz = new THREE.Vector3(...yAxis).normalize();
    mat.makeBasis(vx, vy, vz);
    const euler = new THREE.Euler().setFromRotationMatrix(mat);
    return {
      position: new THREE.Vector3(...origin),
      rotation: euler,
    };
  }, [activeSketch]);

  const cellSize = Math.max(1, gridSnapMm * 5);
  const sectionSize = cellSize * 5;

  return (
    <group>
      <Grid
        position={position}
        rotation={rotation}
        args={[600, 600]}
        cellSize={cellSize}
        cellThickness={0.6}
        cellColor={activeSketch ? '#1e3a8a' : '#1e293b'}
        sectionSize={sectionSize}
        sectionThickness={1.2}
        sectionColor={activeSketch ? '#3b82f6' : '#334155'}
        fadeDistance={480}
        fadeStrength={1.2}
        infiniteGrid
      />

      {/* Primary World Reference Axes (X = Red, Y = Emerald, Z = Blue) */}
      <Line
        points={[
          [-250, 0, 0],
          [250, 0, 0],
        ]}
        color="#ef4444"
        lineWidth={1.5}
        transparent
        opacity={0.65}
      />
      <Line
        points={[
          [0, -250, 0],
          [0, 250, 0],
        ]}
        color="#10b981"
        lineWidth={1.5}
        transparent
        opacity={0.65}
      />
      <Line
        points={[
          [0, 0, 0],
          [0, 0, 160],
        ]}
        color="#3b82f6"
        lineWidth={1.4}
        transparent
        opacity={0.5}
      />
    </group>
  );
};
