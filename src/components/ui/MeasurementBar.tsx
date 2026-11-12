import React, { useMemo } from 'react';
import { Ruler, Scale, Cuboid } from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import { formatUnitValue } from '../../kernel/mathParser';

export const MeasurementBar: React.FC = () => {
  const bodies = useCADStore((s) => s.bodies);
  const selectedBodyIds = useCADStore((s) => s.selectedBodyIds);
  const selectedFaceIds = useCADStore((s) => s.selectedFaceIds);
  const selectedEdgeIds = useCADStore((s) => s.selectedEdgeIds);
  const unit = useCADStore((s) => s.unit);

  const metrics = useMemo(() => {
    const activeBodies =
      selectedBodyIds.length > 0
        ? bodies.filter((b) => selectedBodyIds.includes(b.id))
        : bodies.filter((b) => b.visible);

    let totalVolumeMm3 = 0;
    let totalAreaMm2 = 0;
    let totalMassGrams = 0;

    for (const b of activeBodies) {
      const volCm3 = b.topology.volumeMm3 / 1000;
      totalVolumeMm3 += b.topology.volumeMm3;
      totalAreaMm2 += b.topology.surfaceAreaMm2;
      totalMassGrams += volCm3 * (b.material.densityGPerCm3 || 2.7);
    }

    // Sub-object specific measurement (Edge length/radius, Face area, Face-to-Face angle/distance)
    let subObjectReadout: string | null = null;
    const hostBody = bodies.find((b) => b.id === selectedBodyIds[0]);

    if (hostBody && selectedEdgeIds.length > 0) {
      const edge0 = hostBody.topology.edges.find(
        (e) => e.id === selectedEdgeIds[0]
      );
      if (edge0) {
        const lenStr = formatUnitValue(edge0.length, unit);
        const radStr = edge0.radius
          ? ` • R=${formatUnitValue(edge0.radius, unit)}`
          : '';
        subObjectReadout = `Kenar (${edge0.edgeType.toUpperCase()}): Boy = ${lenStr}${radStr}`;
      }
    } else if (hostBody && selectedFaceIds.length === 1) {
      const face0 = hostBody.topology.faces.find(
        (f) => f.id === selectedFaceIds[0]
      );
      if (face0) {
        subObjectReadout = `Yüzey (${face0.surfaceType.toUpperCase()}): Alan = ${(
          face0.area / 100
        ).toFixed(2)} cm² (${face0.area.toFixed(0)} mm²)`;
      }
    } else if (hostBody && selectedFaceIds.length >= 2) {
      const fA = hostBody.topology.faces.find((f) => f.id === selectedFaceIds[0]);
      const fB = hostBody.topology.faces.find((f) => f.id === selectedFaceIds[1]);
      if (fA && fB) {
        const dist = Math.hypot(
          fA.center[0] - fB.center[0],
          fA.center[1] - fB.center[1],
          fA.center[2] - fB.center[2]
        );
        const dot = Math.max(
          -1,
          Math.min(
            1,
            fA.normal[0] * fB.normal[0] +
              fA.normal[1] * fB.normal[1] +
              fA.normal[2] * fB.normal[2]
          )
        );
        const angleDeg = ((Math.acos(dot) * 180) / Math.PI).toFixed(1);
        subObjectReadout = `İki Yüzey Arası: Mesafe = ${formatUnitValue(
          dist,
          unit
        )} • Açı = ${angleDeg}°`;
      }
    }

    return {
      volumeCm3: totalVolumeMm3 / 1000,
      areaCm2: totalAreaMm2 / 100,
      massGrams: totalMassGrams,
      subObjectReadout,
    };
  }, [bodies, selectedBodyIds, selectedFaceIds, selectedEdgeIds, unit]);

  return (
    <div className="fixed bottom-11 right-4 z-20 pointer-events-auto select-none hidden xl:flex flex-col items-end gap-1.5">
      {metrics.subObjectReadout && (
        <div className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-400/50 backdrop-blur-md text-amber-200 font-mono text-[11px] font-semibold flex items-center gap-1.5 shadow-lg">
          <Ruler className="w-3.5 h-3.5 text-amber-400" />
          <span>{metrics.subObjectReadout}</span>
        </div>
      )}

      <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md text-slate-300 font-mono text-[11px] flex items-center gap-3 shadow-lg">
        <span className="flex items-center gap-1">
          <Cuboid className="w-3.5 h-3.5 text-sky-400" />
          Hacim: <strong className="text-white">{metrics.volumeCm3.toFixed(2)} cm³</strong>
        </span>
        <span className="text-slate-600">|</span>
        <span>
          Alan: <strong className="text-white">{metrics.areaCm2.toFixed(1)} cm²</strong>
        </span>
        <span className="text-slate-600">|</span>
        <span className="flex items-center gap-1">
          <Scale className="w-3.5 h-3.5 text-emerald-400" />
          Kütle: <strong className="text-emerald-300">{metrics.massGrams.toFixed(1)} g</strong>
        </span>
      </div>
    </div>
  );
};
