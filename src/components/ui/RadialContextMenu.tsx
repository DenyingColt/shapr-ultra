import React from 'react';
import {
  ArrowUpFromLine,
  Eye,
  Maximize2,
  Move,
  PencilRuler,
  Scissors,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import { triggerHapticPulse } from '../../services/nativeBridge';

export const RadialContextMenu: React.FC = () => {
  const radialMenu = useCADStore((s) => s.radialMenu);
  const closeRadialMenu = useCADStore((s) => s.closeRadialMenu);
  const startSketchOnSelectionOrPlane = useCADStore((s) => s.startSketchOnSelectionOrPlane);
  const setActiveTool = useCADStore((s) => s.setActiveTool);
  const toggleSectionView = useCADStore((s) => s.toggleSectionView);
  const setMeshDoctorModalOpen = useCADStore((s) => s.setMeshDoctorModalOpen);
  const selectedBodyIds = useCADStore((s) => s.selectedBodyIds);
  const isolateBody = useCADStore((s) => s.isolateBody);
  const triggerCameraView = useCADStore((s) => s.triggerCameraView);
  const bodies = useCADStore((s) => s.bodies);

  if (!radialMenu.visible) return null;

  const radius = 98;
  const actions = [
    {
      id: 'sketch',
      label: 'Yeni Eskiz',
      icon: PencilRuler,
      color: 'text-sky-400 border-sky-500/50 bg-sky-950/90',
      onClick: () => startSketchOnSelectionOrPlane(),
    },
    {
      id: 'extrude',
      label: 'Ekstrüzyon',
      icon: ArrowUpFromLine,
      color: 'text-emerald-400 border-emerald-500/50 bg-emerald-950/90',
      onClick: () => setActiveTool('extrude'),
    },
    {
      id: 'fillet',
      label: 'Fillet / Pah',
      icon: Sparkles,
      color: 'text-amber-400 border-amber-500/50 bg-amber-950/90',
      onClick: () => setActiveTool('fillet_chamfer'),
    },
    {
      id: 'move',
      label: 'Taşı / Döndür',
      icon: Move,
      color: 'text-indigo-400 border-indigo-500/50 bg-indigo-950/90',
      onClick: () => setActiveTool('move_rotate'),
    },
    {
      id: 'doctor',
      label: '3B Baskı Doktoru',
      icon: ShieldAlert,
      color: 'text-rose-400 border-rose-500/50 bg-rose-950/90',
      onClick: () => setMeshDoctorModalOpen(true),
    },
    {
      id: 'section',
      label: 'Kesit (X-Ray)',
      icon: Scissors,
      color: 'text-orange-400 border-orange-500/50 bg-orange-950/90',
      onClick: () => toggleSectionView(),
    },
    {
      id: 'isolate',
      label: 'Gövdeyi İzole Et',
      icon: Eye,
      color: 'text-purple-400 border-purple-500/50 bg-purple-950/90',
      onClick: () => {
        const targetId = selectedBodyIds[0] || bodies[0]?.id;
        if (targetId) isolateBody(targetId);
      },
    },
    {
      id: 'fit',
      label: 'Merkezle (ISO)',
      icon: Maximize2,
      color: 'text-cyan-400 border-cyan-500/50 bg-cyan-950/90',
      onClick: () => triggerCameraView('ISO'),
    },
  ];

  // Clamp center so menu stays inside viewport
  const cx = Math.max(140, Math.min(window.innerWidth - 140, radialMenu.x));
  const cy = Math.max(140, Math.min(window.innerHeight - 140, radialMenu.y));

  return (
    <div
      onClick={closeRadialMenu}
      onContextMenu={(e) => {
        e.preventDefault();
        closeRadialMenu();
      }}
      className="fixed inset-0 z-50 pointer-events-auto select-none"
    >
      <div
        style={{ left: cx, top: cy }}
        className="absolute -translate-x-1/2 -translate-y-1/2 w-64 h-64 flex items-center justify-center"
      >
        {/* Radial SVG Ring Guide */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-60" viewBox="0 0 256 256">
          <circle
            cx="128"
            cy="128"
            r="98"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
          <circle
            cx="128"
            cy="128"
            r="34"
            fill="#0B0D11"
            stroke="#334155"
            strokeWidth="2"
          />
        </svg>

        {/* Center Cancel Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            closeRadialMenu();
          }}
          className="relative z-10 w-14 h-14 rounded-full bg-slate-900 hover:bg-slate-800 border-2 border-slate-600 text-slate-300 flex flex-col items-center justify-center shadow-xl"
        >
          <X className="w-4 h-4 text-sky-400" />
          <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5">Kapat</span>
        </button>

        {/* 8 Pie Slice Buttons */}
        {actions.map((item, idx) => {
          const angleRad = (idx * (2 * Math.PI)) / actions.length - Math.PI / 2;
          const x = Math.cos(angleRad) * radius;
          const y = Math.sin(angleRad) * radius;
          const IconComp = item.icon;

          return (
            <button
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                triggerHapticPulse('commit');
                item.onClick();
                closeRadialMenu();
              }}
              style={{
                transform: `translate(${x}px, ${y}px)`,
              }}
              className={`absolute w-20 h-14 rounded-2xl border backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center gap-1 transition hover:scale-110 active:scale-95 ${item.color}`}
            >
              <IconComp className="w-4 h-4" />
              <span className="text-[9px] font-bold text-white leading-none text-center px-1">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
