import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import { ThreeEvent } from '@react-three/fiber';
import { useCADStore } from '../../store/useCADStore';
import { extrudeProfile3D, sketchToWorld3D } from '../../kernel/solidKernel';

export const InteractiveGizmos: React.FC = () => {
  const bodies = useCADStore((s) => s.bodies);
  const sketches = useCADStore((s) => s.sketches);
  const selectedBodyIds = useCADStore((s) => s.selectedBodyIds);
  const selectedFaceIds = useCADStore((s) => s.selectedFaceIds);
  const selectedEdgeIds = useCADStore((s) => s.selectedEdgeIds);
  const selectedProfileIds = useCADStore((s) => s.selectedProfileIds);
  const activeTool = useCADStore((s) => s.activeTool);

  const extrudeDistance = useCADStore((s) => s.extrudeDistance);
  const extrudeDraftAngle = useCADStore((s) => s.extrudeDraftAngle);
  const extrudeSymmetric = useCADStore((s) => s.extrudeSymmetric);
  const setExtrudeParams = useCADStore((s) => s.setExtrudeParams);
  const commitExtrude = useCADStore((s) => s.commitExtrude);

  const filletChamferAmount = useCADStore((s) => s.filletChamferAmount);
  const setFilletChamferAmount = useCADStore((s) => s.setFilletChamferAmount);
  const commitFilletChamfer = useCADStore((s) => s.commitFilletChamfer);

  const updateBodyTransform = useCADStore((s) => s.updateBodyTransform);

  const [isDraggingExtrude, setIsDraggingExtrude] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartDist, setDragStartDist] = useState(20);

  // 1. Determine active Extrude anchor & normal (from selected TopologicalFace or ClosedProfileLoop)
  const extrudeGizmoAnchor = useMemo(() => {
    if (selectedFaceIds.length > 0 && selectedBodyIds.length > 0) {
      const body = bodies.find((b) => b.id === selectedBodyIds[0]);
      const face = body?.topology.faces.find((f) => f.id === selectedFaceIds[0]);
      if (face) {
        return {
          origin: new THREE.Vector3(...face.center),
          normal: new THREE.Vector3(...face.normal).normalize(),
          mode: 'face' as const,
        };
      }
    }

    if (selectedProfileIds.length > 0) {
      for (const sk of sketches) {
        const prof = sk.closedProfiles.find((p) => p.id === selectedProfileIds[0]);
        if (prof) {
          const wOrigin = sketchToWorld3D(
            prof.centroid[0],
            prof.centroid[1],
            0,
            sk.plane
          );
          return {
            origin: new THREE.Vector3(...wOrigin),
            normal: new THREE.Vector3(...sk.plane.normal).normalize(),
            mode: 'profile' as const,
            profile: prof,
            plane: sk.plane,
          };
        }
      }
    }
    return null;
  }, [bodies, sketches, selectedBodyIds, selectedFaceIds, selectedProfileIds]);

  // Live Ghost Preview Geometry when Extruding a 2D Profile
  const ghostPreviewGeom = useMemo(() => {
    if (
      !extrudeGizmoAnchor ||
      extrudeGizmoAnchor.mode !== 'profile' ||
      !extrudeGizmoAnchor.profile ||
      !extrudeGizmoAnchor.plane
    ) {
      return null;
    }
    return extrudeProfile3D(
      extrudeGizmoAnchor.profile,
      extrudeGizmoAnchor.plane,
      extrudeDistance,
      extrudeDraftAngle,
      extrudeSymmetric
    );
  }, [extrudeGizmoAnchor, extrudeDistance, extrudeDraftAngle, extrudeSymmetric]);

  // 2. Determine active Edge Gizmo anchor for Fillet/Chamfer
  const edgeGizmoAnchor = useMemo(() => {
    if (selectedEdgeIds.length === 0 || selectedBodyIds.length === 0) return null;
    const body = bodies.find((b) => b.id === selectedBodyIds[0]);
    const edge = body?.topology.edges.find((e) => e.id === selectedEdgeIds[0]);
    if (!edge || edge.vertices.length === 0) return null;
    const midPt = edge.vertices[Math.floor(edge.vertices.length / 2)];
    return new THREE.Vector3(...midPt);
  }, [bodies, selectedBodyIds, selectedEdgeIds]);

  // 3. Determine active Body Transform Center when Move/Rotate tool is active
  const selectedBody = useMemo(() => {
    if (selectedBodyIds.length === 0) return null;
    return bodies.find((b) => b.id === selectedBodyIds[0]) || null;
  }, [bodies, selectedBodyIds]);

  const handleExtrudePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsDraggingExtrude(true);
    setDragStartY(e.clientY);
    setDragStartDist(extrudeDistance);
    (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
  };

  const handleExtrudePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isDraggingExtrude) return;
    e.stopPropagation();
    const dy = dragStartY - e.clientY;
    const nextDist = Math.round((dragStartDist + dy * 0.35) * 2) / 2;
    setExtrudeParams({ distance: nextDist === 0 ? 1 : nextDist });
  };

  const handleExtrudePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!isDraggingExtrude) return;
    e.stopPropagation();
    setIsDraggingExtrude(false);
  };

  return (
    <group>
      {/* ================================================================= */}
      {/* SHAPR3D DIRECT EXTRUDE (PUSH/PULL) GIZMO & GHOST PREVIEW          */}
      {/* ================================================================= */}
      {extrudeGizmoAnchor && (
        <group>
          {/* Ghost Preview Solid */}
          {ghostPreviewGeom && (
            <mesh geometry={ghostPreviewGeom}>
              <meshStandardMaterial
                color={extrudeDistance < 0 ? '#ef4444' : '#38bdf8'}
                transparent
                opacity={0.42}
                side={THREE.DoubleSide}
              />
            </mesh>
          )}

          {/* Extrude Axis Line & Interactive Arrow Handle */}
          {(() => {
            const tipPos = extrudeGizmoAnchor.origin
              .clone()
              .addScaledVector(
                extrudeGizmoAnchor.normal,
                extrudeDistance + (extrudeDistance >= 0 ? 14 : -14)
              );

            return (
              <>
                <Line
                  points={[
                    [
                      extrudeGizmoAnchor.origin.x,
                      extrudeGizmoAnchor.origin.y,
                      extrudeGizmoAnchor.origin.z,
                    ],
                    [tipPos.x, tipPos.y, tipPos.z],
                  ]}
                  color="#facc15"
                  lineWidth={3}
                />

                <mesh
                  position={tipPos}
                  onPointerDown={handleExtrudePointerDown}
                  onPointerMove={handleExtrudePointerMove}
                  onPointerUp={handleExtrudePointerUp}
                >
                  <sphereGeometry args={[3.5, 20, 20]} />
                  <meshStandardMaterial
                    color="#facc15"
                    emissive="#f59e0b"
                    emissiveIntensity={0.5}
                  />
                </mesh>

                {/* Floating Direct 3D Extrude Pill */}
                <Html position={tipPos} center distanceFactor={160}>
                  <div className="flex items-center gap-1.5 bg-slate-900/95 border border-amber-400/70 rounded-xl px-2.5 py-1.5 shadow-2xl text-xs select-none whitespace-nowrap">
                    <span className="font-mono font-bold text-amber-300">
                      ↕ {extrudeDistance.toFixed(1)} mm
                    </span>
                    <input
                      type="range"
                      min={-60}
                      max={80}
                      step={1}
                      value={extrudeDistance}
                      onChange={(ev) =>
                        setExtrudeParams({ distance: Number(ev.target.value) })
                      }
                      className="w-20 accent-amber-400 cursor-pointer"
                    />
                    <button
                      onClick={() => commitExtrude()}
                      className="px-2 py-0.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] transition"
                    >
                      ✓ Katıla
                    </button>
                  </div>
                </Html>
              </>
            );
          })()}
        </group>
      )}

      {/* ================================================================= */}
      {/* DUAL-DIRECTION FILLET / CHAMFER EDGE GIZMO                        */}
      {/* ================================================================= */}
      {edgeGizmoAnchor && (
        <Html position={edgeGizmoAnchor} center distanceFactor={160}>
          <div className="flex items-center gap-1.5 bg-slate-900/95 border border-sky-400/70 rounded-xl px-2.5 py-1.5 shadow-2xl text-xs select-none whitespace-nowrap">
            <span className="font-mono font-bold text-sky-300">
              {filletChamferAmount >= 0
                ? `Fillet R: ${filletChamferAmount.toFixed(1)}mm`
                : `Chamfer D: ${Math.abs(filletChamferAmount).toFixed(1)}mm`}
            </span>
            <input
              type="range"
              min={-8}
              max={8}
              step={0.5}
              value={filletChamferAmount}
              onChange={(ev) => setFilletChamferAmount(Number(ev.target.value))}
              className="w-20 accent-sky-400 cursor-pointer"
            />
            <button
              onClick={() => commitFilletChamfer()}
              className="px-2 py-0.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-[11px] transition"
            >
              ✓ Uygula
            </button>
          </div>
        </Html>
      )}

      {/* ================================================================= */}
      {/* 3D BODY TRANSFORM GIZMO (MOVE / ROTATE)                           */}
      {/* ================================================================= */}
      {activeTool === 'move_rotate' && selectedBody && (
        <Html
          position={new THREE.Vector3(
            selectedBody.transform.position[0],
            selectedBody.transform.position[1],
            selectedBody.transform.position[2] + 35
          )}
          center
        >
          <div className="bg-slate-900/95 border border-emerald-500/60 rounded-xl p-2.5 shadow-2xl text-[11px] space-y-1.5 w-52">
            <div className="font-bold text-emerald-400 flex justify-between">
              <span>3D Taşı & Döndür</span>
              <span className="font-mono text-[10px] text-slate-400">
                {selectedBody.name}
              </span>
            </div>
            {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
              <div key={axis} className="flex items-center gap-1.5">
                <span className="w-4 font-mono font-bold text-slate-300">{axis}</span>
                <input
                  type="range"
                  min={-100}
                  max={100}
                  step={1}
                  value={selectedBody.transform.position[idx]}
                  onChange={(e) => {
                    const nextPos: [number, number, number] = [
                      ...selectedBody.transform.position,
                    ];
                    nextPos[idx] = Number(e.target.value);
                    updateBodyTransform(
                      selectedBody.id,
                      nextPos,
                      selectedBody.transform.rotation
                    );
                  }}
                  className="flex-1 accent-emerald-400"
                />
                <span className="w-10 text-right font-mono text-[10px]">
                  {selectedBody.transform.position[idx]}mm
                </span>
              </div>
            ))}
          </div>
        </Html>
      )}
    </group>
  );
};
