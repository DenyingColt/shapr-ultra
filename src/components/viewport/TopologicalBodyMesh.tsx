import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import { CADBody } from '../../types/cad';
import { useCADStore } from '../../store/useCADStore';
import { getStudioMatcapTexture } from './shaders/StudioShaders';
import { evaluateMetrologyVertexColor } from './shaders/MetrologyShaders';

interface Props {
  body: CADBody;
  clippingPlanes: THREE.Plane[];
}

export const TopologicalBodyMesh: React.FC<Props> = ({ body, clippingPlanes }) => {
  const visualStyle = useCADStore((s) => s.visualStyle);
  const selectionFilter = useCADStore((s) => s.selectionFilter);
  const selectedBodyIds = useCADStore((s) => s.selectedBodyIds);
  const selectedFaceIds = useCADStore((s) => s.selectedFaceIds);
  const selectedEdgeIds = useCADStore((s) => s.selectedEdgeIds);
  const hoveredFaceId = useCADStore((s) => s.hoveredFaceId);
  const hoveredEdgeId = useCADStore((s) => s.hoveredEdgeId);
  const jointArticulationDeg = useCADStore((s) => s.jointArticulationDeg);
  const explosionFactor = useCADStore((s) => s.explosionFactor);
  const thumbModifiers = useCADStore((s) => s.thumbModifiers);

  const selectFace = useCADStore((s) => s.selectFace);
  const selectEdge = useCADStore((s) => s.selectEdge);
  const selectBody = useCADStore((s) => s.selectBody);
  const setHoveredSubObject = useCADStore((s) => s.setHoveredSubObject);

  const isBodySelected = selectedBodyIds.includes(body.id);
  const matcapTexture = useMemo(() => getStudioMatcapTexture(), []);

  // Build non-indexed display geometry with per-triangle vertex colors for instant
  // sub-object TopologicalFace highlighting, Zebra stripes, Overhang, and Metrology Shaders!
  const coloredGeometry = useMemo(() => {
    const nonIndexed = body.geometry.toNonIndexed();
    const pos = nonIndexed.getAttribute('position');
    const norm = nonIndexed.getAttribute('normal');
    if (!pos) return nonIndexed;

    const numVerts = pos.count;
    const numTris = Math.floor(numVerts / 3);
    const colors = new Float32Array(numVerts * 3);

    const baseColor =
      visualStyle === 'blueprint_white'
        ? new THREE.Color('#ffffff')
        : new THREE.Color(body.material.color);
    const selectedFaceColor = new THREE.Color('#facc15');
    const hoveredFaceColor = new THREE.Color('#38bdf8');
    const bodySelectedTint = baseColor.clone().lerp(new THREE.Color('#60a5fa'), 0.22);

    const isMetrologyMode =
      visualStyle === 'curvature_map' ||
      visualStyle === 'draft_analysis' ||
      visualStyle === 'thickness_heatmap';

    const faceById = new Map(body.topology.faces.map((f) => [f.id, f]));

    for (let t = 0; t < numTris; t++) {
      const faceId = body.topology.faceMapByTriangle[t];
      const faceObj = faceId ? faceById.get(faceId) : undefined;
      const isFaceSelected = faceId && selectedFaceIds.includes(faceId);
      const isFaceHovered = faceId && hoveredFaceId === faceId;

      for (let k = 0; k < 3; k++) {
        const vIdx = t * 3 + k;
        let c = isBodySelected ? bodySelectedTint : baseColor;

        if (visualStyle === 'zebra') {
          const vy = pos.getY(vIdx);
          const vz = pos.getZ(vIdx);
          const stripe = Math.sin((vy + vz) * 0.85) > 0;
          c = stripe ? new THREE.Color('#f8fafc') : new THREE.Color('#0f172a');
        } else if (visualStyle === 'overhang' && norm) {
          const nz = norm.getZ(vIdx);
          if (nz < -0.7 && pos.getZ(vIdx) > 0.5) {
            c = new THREE.Color('#ef4444');
          } else if (nz < -0.35 && pos.getZ(vIdx) > 0.5) {
            c = new THREE.Color('#f59e0b');
          } else {
            c = new THREE.Color('#10b981');
          }
        } else if (isMetrologyMode && norm) {
          const vx = pos.getX(vIdx);
          const vy = pos.getY(vIdx);
          const vz = pos.getZ(vIdx);
          const nx = norm.getX(vIdx);
          const ny = norm.getY(vIdx);
          const nz = norm.getZ(vIdx);
          c = evaluateMetrologyVertexColor(
            visualStyle,
            vx,
            vy,
            vz,
            nx,
            ny,
            nz,
            faceObj?.surfaceType ?? 'planar',
            faceObj?.cylinderRadius
          );
        }

        if (isFaceSelected) {
          c = selectedFaceColor;
        } else if (isFaceHovered) {
          c = hoveredFaceColor;
        }

        colors[vIdx * 3] = c.r;
        colors[vIdx * 3 + 1] = c.g;
        colors[vIdx * 3 + 2] = c.b;
      }
    }

    nonIndexed.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return nonIndexed;
  }, [
    body.geometry,
    body.material.color,
    body.topology.faceMapByTriangle,
    body.topology.faces,
    isBodySelected,
    selectedFaceIds,
    hoveredFaceId,
    visualStyle,
  ]);

  // Compute Kinematic Articulation + Exploded View displacement
  const kinematicMatrix = useMemo(() => {
    const mat = new THREE.Matrix4();
    const basePos = new THREE.Vector3(...body.transform.position);
    if (body.explosionVector && explosionFactor > 0.001) {
      basePos.addScaledVector(
        new THREE.Vector3(...body.explosionVector),
        explosionFactor
      );
    }
    const baseEuler = new THREE.Euler(...body.transform.rotation, 'XYZ');
    const baseQuat = new THREE.Quaternion().setFromEuler(baseEuler);
    const baseScale = new THREE.Vector3(...body.transform.scale);
    mat.compose(basePos, baseQuat, baseScale);

    if (body.kinematics && Math.abs(jointArticulationDeg) > 0.01) {
      const { role, axis, pivot, gearRatio = 1 } = body.kinematics;
      const pivotVec = new THREE.Vector3(...pivot);
      const axisVec = new THREE.Vector3(...axis).normalize();
      const angleRad =
        ((jointArticulationDeg * (role === 'rotating_gear' ? gearRatio * 2.5 : 1)) *
          Math.PI) /
        180;

      const tToOrigin = new THREE.Matrix4().makeTranslation(
        -pivotVec.x,
        -pivotVec.y,
        -pivotVec.z
      );
      const rotMat = new THREE.Matrix4().makeRotationAxis(axisVec, angleRad);
      const tBack = new THREE.Matrix4().makeTranslation(
        pivotVec.x,
        pivotVec.y,
        pivotVec.z
      );

      const kinMat = new THREE.Matrix4()
        .multiply(tBack)
        .multiply(rotMat)
        .multiply(tToOrigin);
      mat.premultiply(kinMat);
    }

    const pos = new THREE.Vector3();
    const quat = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    mat.decompose(pos, quat, scale);
    return { pos, quat, scale };
  }, [
    body.transform,
    body.kinematics,
    body.explosionVector,
    explosionFactor,
    jointArticulationDeg,
  ]);

  if (!body.visible) return null;

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (selectionFilter === 'body' || selectionFilter === 'edge') return;
    if (e.faceIndex !== undefined && e.faceIndex !== null) {
      const faceId = body.topology.faceMapByTriangle[e.faceIndex];
      if (faceId && faceId !== hoveredFaceId) {
        setHoveredSubObject('face', faceId);
      }
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHoveredSubObject('face', null);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (body.locked) return;

    const isMulti = e.shiftKey || e.ctrlKey || e.metaKey || thumbModifiers.multiSelect;
    if (selectionFilter === 'body' || e.detail === 2) {
      selectBody(body.id, isMulti);
      return;
    }

    if (
      (selectionFilter === 'all' || selectionFilter === 'face') &&
      e.faceIndex !== undefined &&
      e.faceIndex !== null
    ) {
      const faceId = body.topology.faceMapByTriangle[e.faceIndex];
      if (faceId) {
        selectFace(faceId, body.id, isMulti);
        return;
      }
    }
    selectBody(body.id, isMulti);
  };

  const showExplosionTrace =
    body.explosionVector &&
    explosionFactor > 0.02 &&
    new THREE.Vector3(...body.explosionVector).lengthSq() > 1;

  return (
    <>
      {showExplosionTrace && (
        <Line
          points={[
            body.transform.position,
            [kinematicMatrix.pos.x, kinematicMatrix.pos.y, kinematicMatrix.pos.z],
          ]}
          color="#f59e0b"
          lineWidth={1.5}
          dashed
          dashScale={2}
          dashSize={3}
          gapSize={2}
        />
      )}
      <group
        position={kinematicMatrix.pos}
        quaternion={kinematicMatrix.quat}
        scale={kinematicMatrix.scale}
      >
        {/* Solid Surface Mesh with Sub-Object Face Vertex Coloring */}
        <mesh
          geometry={coloredGeometry}
          onPointerMove={handlePointerMove}
          onPointerOut={handlePointerOut}
          onClick={handleClick}
          castShadow
          receiveShadow
        >
          {visualStyle === 'matcap' ? (
            <meshMatcapMaterial
              matcap={matcapTexture}
              vertexColors
              clippingPlanes={clippingPlanes}
              clipShadows
              side={THREE.DoubleSide}
            />
          ) : (
            <meshStandardMaterial
              vertexColors
              metalness={visualStyle === 'blueprint_white' ? 0.05 : body.material.metalness}
              roughness={visualStyle === 'blueprint_white' ? 0.9 : body.material.roughness}
              wireframe={visualStyle === 'wireframe'}
              transparent={
                visualStyle === 'xray' || body.isSurfaceBody || body.material.opacity < 1
              }
              opacity={
                visualStyle === 'xray'
                  ? 0.42
                  : body.isSurfaceBody
                  ? 0.78
                  : body.material.opacity
              }
              side={THREE.DoubleSide}
              clippingPlanes={clippingPlanes}
              clipShadows
              polygonOffset
              polygonOffsetFactor={1}
              polygonOffsetUnits={1}
            />
          )}
        </mesh>

        {/* Crisp Topological B-Rep Edges (Selectable for Fillet / Chamfer / Sweep) */}
        {visualStyle !== 'shaded' &&
          body.topology.edges.map((edge) => {
            const isEdgeSelected = selectedEdgeIds.includes(edge.id);
            const isEdgeHovered = hoveredEdgeId === edge.id;
            const color = isEdgeSelected
              ? '#facc15'
              : isEdgeHovered
              ? '#22d3ee'
              : visualStyle === 'blueprint_white'
              ? '#0284c7'
              : isBodySelected
              ? '#93c5fd'
              : '#0f172a';
            const lineWidth = isEdgeSelected ? 3.5 : isEdgeHovered ? 2.8 : 1.35;

            return (
              <Line
                key={edge.id}
                points={edge.vertices}
                color={color}
                lineWidth={lineWidth}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  if (selectionFilter === 'all' || selectionFilter === 'edge') {
                    setHoveredSubObject('edge', edge.id);
                  }
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  setHoveredSubObject('edge', null);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    !body.locked &&
                    (selectionFilter === 'all' || selectionFilter === 'edge')
                  ) {
                    selectEdge(
                      edge.id,
                      body.id,
                      e.shiftKey || e.ctrlKey || thumbModifiers.multiSelect
                    );
                  }
                }}
              />
            );
          })}
      </group>
    </>
  );
};
