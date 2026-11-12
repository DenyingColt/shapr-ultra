import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCADStore } from '../../store/useCADStore';

/**
 * Renders all visible ReferenceCanvasItem blueprints on their 3D plane (XY, XZ, or YZ)
 * with real-time calibrated 1:1 millimeter dimensions, opacity, flip, and rotation.
 */
export const ReferenceCanvasMeshes: React.FC = () => {
  const referenceCanvases = useCADStore((s) => s.referenceCanvases);

  const loader = useMemo(() => new THREE.TextureLoader(), []);

  return (
    <group>
      {referenceCanvases
        .filter((c) => c.visible)
        .map((canvasItem) => {
          const tex = loader.load(canvasItem.imageUrl);
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(canvasItem.flipH ? -1 : 1, canvasItem.flipV ? -1 : 1);
          if (canvasItem.flipH) tex.offset.x = 1;
          if (canvasItem.flipV) tex.offset.y = 1;

          let rot: [number, number, number] = [0, 0, (canvasItem.rotationDeg * Math.PI) / 180];
          let pos: [number, number, number] = [canvasItem.offsetX, canvasItem.offsetY, -0.08];

          if (canvasItem.plane === 'XZ') {
            rot = [Math.PI / 2, (canvasItem.rotationDeg * Math.PI) / 180, 0];
            pos = [canvasItem.offsetX, 0, canvasItem.offsetY];
          } else if (canvasItem.plane === 'YZ') {
            rot = [0, Math.PI / 2, (canvasItem.rotationDeg * Math.PI) / 180];
            pos = [0, canvasItem.offsetX, canvasItem.offsetY];
          }

          return (
            <mesh key={canvasItem.id} position={pos} rotation={rot}>
              <planeGeometry args={[canvasItem.widthMm, canvasItem.heightMm]} />
              <meshBasicMaterial
                map={tex}
                transparent
                opacity={canvasItem.opacity}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          );
        })}
    </group>
  );
};
