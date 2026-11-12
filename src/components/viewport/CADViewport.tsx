import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  ContactShadows,
  GizmoHelper,
  GizmoViewport,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
} from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useCADStore } from '../../store/useCADStore';
import { AdaptiveGrid } from './AdaptiveGrid';
import { TopologicalBodyMesh } from './TopologicalBodyMesh';
import { SketchCanvas2D } from './SketchCanvas2D';
import { InteractiveGizmos } from './InteractiveGizmos';
import { ViewCube } from './ViewCube';
import { getSectionHatchTexture } from './shaders/StudioShaders';
import { ReferenceCanvasMeshes } from './ReferenceCanvas';
import {
  SectionBoxGizmo,
  buildSectionBoxClippingPlanes,
} from './SectionBoxGizmo';

const CameraPresetController: React.FC<{
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
}> = ({ controlsRef }) => {
  const { camera } = useThree();
  const cameraPresetTrigger = useCADStore((s) => s.cameraPresetTrigger);
  const activeSketchId = useCADStore((s) => s.activeSketchId);
  const sketches = useCADStore((s) => s.sketches);
  const isKinematicPlaying = useCADStore((s) => s.isKinematicPlaying);
  const setJointArticulationDeg = useCADStore((s) => s.setJointArticulationDeg);

  // Align camera smoothly when user clicks ViewCube buttons
  useEffect(() => {
    if (!cameraPresetTrigger) return;
    const dist = 165;
    const target = new THREE.Vector3(0, 0, 12);

    switch (cameraPresetTrigger.view) {
      case 'iso':
        camera.position.set(dist * 0.72, -dist * 0.72, dist * 0.62);
        camera.up.set(0, 0, 1);
        break;
      case 'iso_nw':
        camera.position.set(-dist * 0.72, -dist * 0.72, dist * 0.62);
        camera.up.set(0, 0, 1);
        break;
      case 'top':
        camera.position.set(0, -0.01, dist * 1.15);
        camera.up.set(0, 1, 0);
        break;
      case 'bottom':
        camera.position.set(0, 0.01, -dist * 1.15);
        camera.up.set(0, -1, 0);
        break;
      case 'front':
        camera.position.set(0, -dist * 1.1, 12);
        camera.up.set(0, 0, 1);
        break;
      case 'back':
        camera.position.set(0, dist * 1.1, 12);
        camera.up.set(0, 0, 1);
        break;
      case 'left':
        camera.position.set(-dist * 1.1, 0, 12);
        camera.up.set(0, 0, 1);
        break;
      case 'right':
        camera.position.set(dist * 1.1, 0, 12);
        camera.up.set(0, 0, 1);
        break;
      case 'roll_cw':
        camera.up.applyAxisAngle(
          camera.position.clone().sub(target).normalize(),
          -Math.PI / 2
        );
        break;
      case 'roll_ccw':
        camera.up.applyAxisAngle(
          camera.position.clone().sub(target).normalize(),
          Math.PI / 2
        );
        break;
    }

    camera.lookAt(target);
    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
  }, [cameraPresetTrigger, camera, controlsRef]);

  // Automatically align camera to face normal when entering 2D Sketch mode on a face
  useEffect(() => {
    if (!activeSketchId) return;
    const sk = sketches.find((s) => s.id === activeSketchId);
    if (!sk) return;

    const origin = new THREE.Vector3(...sk.plane.origin);
    const normal = new THREE.Vector3(...sk.plane.normal).normalize();
    const yAxis = new THREE.Vector3(...sk.plane.yAxis).normalize();

    camera.position.copy(origin).addScaledVector(normal, 155);
    camera.up.copy(yAxis);
    camera.lookAt(origin);
    if (controlsRef.current) {
      controlsRef.current.target.copy(origin);
      controlsRef.current.update();
    }
  }, [activeSketchId, sketches, camera, controlsRef]);

  // Kinematic Joint Articulation Animation Loop
  useFrame(({ clock }) => {
    if (isKinematicPlaying) {
      const deg = Math.round(Math.sin(clock.getElapsedTime() * 2.2) * 55);
      setJointArticulationDeg(deg);
    }
  });

  return null;
};

// Cross Section 45-degree Technical Hatch Plane Cap
const SectionHatchCap: React.FC<{
  enabled: boolean;
  axis: 'X' | 'Y' | 'Z';
  offset: number;
}> = ({ enabled, axis, offset }) => {
  const hatchTexture = useMemo(() => getSectionHatchTexture(), []);
  if (!enabled) return null;

  let pos: [number, number, number] = [0, 0, 0];
  let rot: [number, number, number] = [0, 0, 0];

  if (axis === 'X') {
    pos = [offset, 0, 0];
    rot = [0, Math.PI / 2, 0];
  } else if (axis === 'Y') {
    pos = [0, offset, 0];
    rot = [Math.PI / 2, 0, 0];
  } else {
    pos = [0, 0, offset];
    rot = [0, 0, 0];
  }

  return (
    <mesh position={pos} rotation={rot}>
      <planeGeometry args={[260, 260]} />
      <meshBasicMaterial
        map={hatchTexture}
        transparent
        opacity={0.35}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

export const CADViewport: React.FC = () => {
  const bodies = useCADStore((s) => s.bodies);
  const isOrtho = useCADStore((s) => s.isOrtho);
  const activeTool = useCADStore((s) => s.activeTool);
  const visualStyle = useCADStore((s) => s.visualStyle);
  const sectionViewEnabled = useCADStore((s) => s.sectionViewEnabled);
  const sectionPlaneAxis = useCADStore((s) => s.sectionPlaneAxis);
  const sectionPlaneOffset = useCADStore((s) => s.sectionPlaneOffset);
  const sectionBox = useCADStore((s) => s.sectionBox);
  const clearSelection = useCADStore((s) => s.clearSelection);

  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const clippingPlanes = useMemo(() => {
    const planes: THREE.Plane[] = [];
    if (sectionViewEnabled) {
      const normal =
        sectionPlaneAxis === 'X'
          ? new THREE.Vector3(-1, 0, 0)
          : sectionPlaneAxis === 'Y'
          ? new THREE.Vector3(0, 1, 0)
          : new THREE.Vector3(0, 0, -1);
      planes.push(new THREE.Plane(normal, sectionPlaneOffset));
    }
    if (sectionBox.enabled) {
      planes.push(...buildSectionBoxClippingPlanes(sectionBox));
    }
    return planes;
  }, [sectionViewEnabled, sectionPlaneAxis, sectionPlaneOffset, sectionBox]);

  const isSketchDrawing =
    activeTool.startsWith('sketch_') &&
    activeTool !== 'sketch_trim' &&
    activeTool !== 'sketch_offset';

  const bgColor =
    visualStyle === 'blueprint_white'
      ? '#0f3162'
      : '#090d16';

  return (
    <div
      style={{ backgroundColor: bgColor }}
      className="relative flex-1 w-full h-full overflow-hidden transition-colors duration-300"
    >
      <ViewCube />

      <Canvas
        shadows
        gl={{ localClippingEnabled: true, antialias: true, preserveDrawingBuffer: true }}
        onPointerMissed={() => clearSelection()}
      >
        {isOrtho ? (
          <OrthographicCamera
            makeDefault
            position={[120, -125, 105]}
            zoom={3.6}
            near={-1000}
            far={2500}
            up={[0, 0, 1]}
          />
        ) : (
          <PerspectiveCamera
            makeDefault
            position={[120, -125, 105]}
            fov={42}
            near={0.5}
            far={3000}
            up={[0, 0, 1]}
          />
        )}

        <CameraPresetController controlsRef={controlsRef} />

        {/* Studio Multi-Point CAD Lighting */}
        <ambientLight intensity={visualStyle === 'blueprint_white' ? 1.1 : 0.75} />
        <directionalLight
          position={[140, -160, 220]}
          intensity={1.35}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-150, 140, 90]} intensity={0.65} color="#bae6fd" />
        <hemisphereLight args={['#e2e8f0', '#1e293b', 0.45]} />

        {/* Dynamic Multi-Scale Reference Grid */}
        <AdaptiveGrid />

        {/* Reference Blueprint Canvases */}
        <ReferenceCanvasMeshes />

        {/* 6-Plane Section Box Gizmo */}
        <SectionBoxGizmo />

        {/* All B-Rep Solid & Surface Bodies */}
        {bodies.map((body) => (
          <TopologicalBodyMesh
            key={body.id}
            body={body}
            clippingPlanes={clippingPlanes}
          />
        ))}

        {/* Dynamic Technical Hatch Cap for Cross-Section View */}
        <SectionHatchCap
          enabled={sectionViewEnabled}
          axis={sectionPlaneAxis}
          offset={sectionPlaneOffset}
        />

        {/* 3D-Embedded 2D Sketcher & Closed Profile Loops */}
        <SketchCanvas2D />

        {/* Shapr3D-Style Direct Manipulation 3D Gizmos */}
        <InteractiveGizmos />

        <ContactShadows
          position={[0, 0, -0.05]}
          opacity={0.35}
          scale={280}
          blur={2.2}
          far={80}
        />

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enableDamping
          dampingFactor={0.1}
          enabled={!isSketchDrawing}
        />

        <GizmoHelper alignment="bottom-left" margin={[64, 64]}>
          <GizmoViewport
            axisColors={['#ef4444', '#10b981', '#3b82f6']}
            labelColor="white"
          />
        </GizmoHelper>
      </Canvas>
    </div>
  );
};
