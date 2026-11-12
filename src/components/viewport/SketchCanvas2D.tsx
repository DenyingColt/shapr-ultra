import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import { v4 as uuidv4 } from 'uuid';
import {
  ClosedProfileLoop,
  Sketch,
  SketchPlane,
  SketchPrimitive,
  Vec2,
  Vec3,
} from '../../types/cad';
import { useCADStore } from '../../store/useCADStore';
import {
  analyzeSmartPenStroke,
  sampleCatmullRom2D,
  sampleThreePointArc,
} from '../../kernel/sketchSolver';
import { sketchToWorld3D } from '../../kernel/solidKernel';

function worldToSketch2D(worldPt: THREE.Vector3, plane: SketchPlane, snapMm: number): Vec2 {
  const rel = worldPt.clone().sub(new THREE.Vector3(...plane.origin));
  const vx = new THREE.Vector3(...plane.xAxis).normalize();
  const vy = new THREE.Vector3(...plane.yAxis).normalize();
  const rawU = rel.dot(vx);
  const rawV = rel.dot(vy);
  const s = Math.max(0.1, snapMm);
  return [Math.round(rawU / s) * s, Math.round(rawV / s) * s];
}

function getPrimitivePoints3D(prim: SketchPrimitive, plane: SketchPlane): Vec3[] {
  const to3D = (pt: Vec2): Vec3 => sketchToWorld3D(pt[0], pt[1], 0.08, plane);

  if (prim.type === 'line' && prim.points.length >= 2) {
    return [to3D(prim.points[0]), to3D(prim.points[1])];
  }
  if (prim.type === 'rect' && prim.points.length >= 2) {
    const [p1, p2] = prim.points;
    const corners: Vec2[] = [
      [p1[0], p1[1]],
      [p2[0], p1[1]],
      [p2[0], p2[1]],
      [p1[0], p2[1]],
      [p1[0], p1[1]],
    ];
    return corners.map(to3D);
  }
  if (prim.type === 'circle' && prim.points.length >= 2) {
    const c = prim.points[0];
    const r =
      prim.radius ??
      Math.hypot(prim.points[1][0] - c[0], prim.points[1][1] - c[1]);
    const segs = 48;
    const pts: Vec3[] = [];
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pts.push(to3D([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]));
    }
    return pts;
  }
  if (prim.type === 'polygon' && prim.points.length >= 2) {
    const c = prim.points[0];
    const r =
      prim.radius ??
      Math.hypot(prim.points[1][0] - c[0], prim.points[1][1] - c[1]);
    const sides = Math.max(3, prim.sides ?? 6);
    const pts: Vec3[] = [];
    for (let i = 0; i <= sides; i++) {
      const a = (i / sides) * Math.PI * 2;
      pts.push(to3D([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]));
    }
    return pts;
  }
  if (prim.type === 'arc' && prim.points.length >= 3) {
    return sampleThreePointArc(prim.points[0], prim.points[1], prim.points[2], 24).map(
      to3D
    );
  }
  if (prim.type === 'spline' && prim.points.length >= 2) {
    return sampleCatmullRom2D(prim.points, 28).map(to3D);
  }
  return prim.points.map(to3D);
}

const ProfileMesh3D: React.FC<{
  profile: ClosedProfileLoop;
  plane: SketchPlane;
}> = ({ profile, plane }) => {
  const selectedProfileIds = useCADStore((s) => s.selectedProfileIds);
  const hoveredProfileId = useCADStore((s) => s.hoveredProfileId);
  const selectProfile = useCADStore((s) => s.selectProfile);
  const setHoveredSubObject = useCADStore((s) => s.setHoveredSubObject);

  const isSelected = selectedProfileIds.includes(profile.id);
  const isHovered = hoveredProfileId === profile.id;

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const positions: number[] = [];
    for (const [u, v] of profile.triangulatedVertices) {
      const w = sketchToWorld3D(u, v, 0.05, plane);
      positions.push(w[0], w[1], w[2]);
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(profile.triangulatedIndices);
    g.computeVertexNormals();
    return g;
  }, [profile, plane]);

  return (
    <mesh
      geometry={geom}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHoveredSubObject('profile', profile.id);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHoveredSubObject('profile', null);
      }}
      onClick={(e) => {
        e.stopPropagation();
        selectProfile(profile.id, e.shiftKey || e.ctrlKey);
      }}
    >
      <meshBasicMaterial
        color={isSelected ? '#facc15' : isHovered ? '#38bdf8' : '#2563eb'}
        transparent
        opacity={isSelected ? 0.45 : isHovered ? 0.35 : 0.18}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

export const SketchCanvas2D: React.FC = () => {
  const sketches = useCADStore((s) => s.sketches);
  const activeSketchId = useCADStore((s) => s.activeSketchId);
  const activeTool = useCADStore((s) => s.activeTool);
  const gridSnapMm = useCADStore((s) => s.gridSnapMm);
  const selectedSketchPrimIds = useCADStore((s) => s.selectedSketchPrimIds);

  const addSketchPrimitiveToActive = useCADStore((s) => s.addSketchPrimitiveToActive);
  const selectSketchPrimitive = useCADStore((s) => s.selectSketchPrimitive);
  const trimActiveSketchAt = useCADStore((s) => s.trimActiveSketchAt);
  const offsetSelectedSketchPrim = useCADStore((s) => s.offsetSelectedSketchPrim);

  const [draftPoints, setDraftPoints] = useState<Vec2[]>([]);
  const [cursor2D, setCursor2D] = useState<Vec2 | null>(null);

  const activeSketch: Sketch | undefined = sketches.find((s) => s.id === activeSketchId);
  const isDrawingTool = activeTool.startsWith('sketch_') && activeTool !== 'sketch_trim' && activeTool !== 'sketch_offset';

  // Transform matrix for the invisible drawing plane aligned with activeSketch.plane
  const planeTransform = useMemo(() => {
    const plane = activeSketch?.plane;
    if (!plane) return null;
    const mat = new THREE.Matrix4();
    const vx = new THREE.Vector3(...plane.xAxis).normalize();
    const vy = new THREE.Vector3(...plane.yAxis).normalize();
    const vz = new THREE.Vector3(...plane.normal).normalize();
    mat.makeBasis(vx, vy, vz);
    const euler = new THREE.Euler().setFromRotationMatrix(mat);
    return {
      position: new THREE.Vector3(...plane.origin),
      rotation: euler,
    };
  }, [activeSketch]);

  const handlePlanePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!activeSketch || !isDrawingTool) return;
    e.stopPropagation();
    const pt2D = worldToSketch2D(e.point, activeSketch.plane, gridSnapMm);

    if (activeTool === 'sketch_pen') {
      setDraftPoints([pt2D]);
      return;
    }

    if (
      activeTool === 'sketch_line' ||
      activeTool === 'sketch_rect' ||
      activeTool === 'sketch_circle' ||
      activeTool === 'sketch_polygon'
    ) {
      if (draftPoints.length === 0) {
        setDraftPoints([pt2D]);
      } else {
        const pStart = draftPoints[0];
        if (Math.hypot(pt2D[0] - pStart[0], pt2D[1] - pStart[1]) > 0.5) {
          const typeMap: Record<string, SketchPrimitive['type']> = {
            sketch_line: 'line',
            sketch_rect: 'rect',
            sketch_circle: 'circle',
            sketch_polygon: 'polygon',
          };
          const primType = typeMap[activeTool] || 'line';
          const r = Math.hypot(pt2D[0] - pStart[0], pt2D[1] - pStart[1]);
          addSketchPrimitiveToActive({
            id: uuidv4(),
            type: primType,
            points: [pStart, pt2D],
            radius: primType === 'circle' || primType === 'polygon' ? r : undefined,
            sides: primType === 'polygon' ? 6 : undefined,
            isConstruction: false,
            status: 'under',
          });
        }
        setDraftPoints([]);
      }
      return;
    }

    if (activeTool === 'sketch_arc' || activeTool === 'sketch_spline') {
      const next = [...draftPoints, pt2D];
      if (next.length >= 3) {
        addSketchPrimitiveToActive({
          id: uuidv4(),
          type: activeTool === 'sketch_arc' ? 'arc' : 'spline',
          points: next,
          isConstruction: false,
          status: 'under',
        });
        setDraftPoints([]);
      } else {
        setDraftPoints(next);
      }
    }
  };

  const handlePlanePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!activeSketch) return;
    const pt2D = worldToSketch2D(
      e.point,
      activeSketch.plane,
      activeTool === 'sketch_pen' ? 0.25 : gridSnapMm
    );
    setCursor2D(pt2D);

    if (activeTool === 'sketch_pen' && draftPoints.length > 0) {
      e.stopPropagation();
      const last = draftPoints[draftPoints.length - 1];
      if (Math.hypot(pt2D[0] - last[0], pt2D[1] - last[1]) > 1.2) {
        setDraftPoints((prev) => [...prev, pt2D]);
      }
    }
  };

  const handlePlanePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (!activeSketch) return;
    if (activeTool === 'sketch_pen' && draftPoints.length >= 2) {
      e.stopPropagation();
      const recognized = analyzeSmartPenStroke(draftPoints);
      if (recognized) {
        addSketchPrimitiveToActive(recognized);
      }
      setDraftPoints([]);
    }
  };

  // Live preview polyline while drawing
  const previewPoints3D = useMemo(() => {
    if (!activeSketch || draftPoints.length === 0 || !cursor2D) return null;
    const plane = activeSketch.plane;
    if (activeTool === 'sketch_pen') {
      return draftPoints.map((p) => sketchToWorld3D(p[0], p[1], 0.12, plane));
    }
    const p0 = draftPoints[0];
    const tempPrim: SketchPrimitive = {
      id: 'temp',
      type:
        activeTool === 'sketch_rect'
          ? 'rect'
          : activeTool === 'sketch_circle'
          ? 'circle'
          : activeTool === 'sketch_polygon'
          ? 'polygon'
          : 'line',
      points: [p0, cursor2D],
      radius: Math.hypot(cursor2D[0] - p0[0], cursor2D[1] - p0[1]),
      sides: 6,
      isConstruction: false,
      status: 'under',
    };
    return getPrimitivePoints3D(tempPrim, plane);
  }, [activeSketch, draftPoints, cursor2D, activeTool]);

  return (
    <group>
      {/* Invisible Raycast Receiver Plane when 2D Sketch Tool is active */}
      {activeSketch && planeTransform && isDrawingTool && (
        <mesh
          position={planeTransform.position}
          rotation={planeTransform.rotation}
          onPointerDown={handlePlanePointerDown}
          onPointerMove={handlePlanePointerMove}
          onPointerUp={handlePlanePointerUp}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshBasicMaterial transparent opacity={0} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}

      {/* Live Drawing Stroke / Shape Preview + Live Dimension Readout */}
      {previewPoints3D && previewPoints3D.length >= 2 && (
        <>
          <Line points={previewPoints3D} color="#38bdf8" lineWidth={2.5} />
          {activeSketch && cursor2D && draftPoints.length > 0 && (
            <Html
              position={sketchToWorld3D(cursor2D[0], cursor2D[1], 1.5, activeSketch.plane)}
              center
            >
              <div className="px-2 py-0.5 rounded bg-sky-600 text-white font-mono text-[11px] font-bold shadow-lg whitespace-nowrap pointer-events-none">
                {Math.hypot(
                  cursor2D[0] - draftPoints[0][0],
                  cursor2D[1] - draftPoints[0][1]
                ).toFixed(1)}{' '}
                mm
              </div>
            </Html>
          )}
        </>
      )}

      {/* Render All Visible Sketches, Primitives, and Closed Profile Loops */}
      {sketches
        .filter((sk) => sk.visible)
        .map((sketch) => (
          <group key={sketch.id}>
            {/* Translucent Blue Selectable Closed Profile Loops */}
            {sketch.closedProfiles.map((prof) => (
              <ProfileMesh3D key={prof.id} profile={prof} plane={sketch.plane} />
            ))}

            {/* 2D Sketch Curves */}
            {sketch.primitives.map((prim) => {
              const pts3D = getPrimitivePoints3D(prim, sketch.plane);
              if (pts3D.length < 2) return null;

              const isSelected = selectedSketchPrimIds.includes(prim.id);
              const statusColor =
                prim.status === 'fully'
                  ? '#10b981'
                  : prim.status === 'over'
                  ? '#ef4444'
                  : '#3b82f6';
              const color = isSelected
                ? '#facc15'
                : prim.isConstruction
                ? '#f59e0b'
                : statusColor;

              return (
                <Line
                  key={prim.id}
                  points={pts3D}
                  color={color}
                  lineWidth={isSelected ? 3.2 : 2.2}
                  dashed={prim.isConstruction}
                  dashSize={3}
                  gapSize={2}
                  onClick={(e) => {
                    e.stopPropagation();
                    const click2D = worldToSketch2D(e.point, sketch.plane, 0.1);
                    if (activeTool === 'sketch_trim') {
                      trimActiveSketchAt(click2D, prim.id);
                    } else if (activeTool === 'sketch_offset') {
                      selectSketchPrimitive(prim.id, false);
                      offsetSelectedSketchPrim(5);
                    } else {
                      selectSketchPrimitive(prim.id, e.shiftKey || e.ctrlKey);
                    }
                  }}
                />
              );
            })}
          </group>
        ))}
    </group>
  );
};
