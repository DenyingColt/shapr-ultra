import React from 'react';
import { RotateCcw, RotateCw, Compass, Box } from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';

export const ViewCube: React.FC = () => {
  const triggerCameraView = useCADStore((s) => s.triggerCameraView);
  const isOrtho = useCADStore((s) => s.isOrtho);
  const toggleOrtho = useCADStore((s) => s.toggleOrtho);
  const jointArticulationDeg = useCADStore((s) => s.jointArticulationDeg);
  const setJointArticulationDeg = useCADStore((s) => s.setJointArticulationDeg);
  const isKinematicPlaying = useCADStore((s) => s.isKinematicPlaying);
  const setKinematicPlaying = useCADStore((s) => s.setKinematicPlaying);

  return (
    <div className="absolute top-16 right-4 z-20 flex flex-col items-end gap-2.5 pointer-events-auto select-none">
      {/* 3D Orientation Cube Widget */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 shadow-2xl w-44">
        <div className="flex items-center justify-between mb-1.5 px-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Compass className="w-3 h-3 text-sky-400" />
            Bakış Küpü
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => triggerCameraView('roll_ccw')}
              title="90° Sola Döndür"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              onClick={() => triggerCameraView('roll_cw')}
              title="90° Sağa Döndür"
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Interactive Cube Faces Grid */}
        <div className="grid grid-cols-3 gap-1 text-[10px] font-semibold">
          <button
            onClick={() => triggerCameraView('iso_nw')}
            className="py-1 rounded bg-slate-800/70 hover:bg-sky-600/40 text-slate-400 hover:text-white transition"
          >
            ↖ İzo
          </button>
          <button
            onClick={() => triggerCameraView('top')}
            className="py-1 rounded bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-700 transition"
          >
            ÜST (XY)
          </button>
          <button
            onClick={() => triggerCameraView('iso')}
            className="py-1 rounded bg-sky-600/25 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/40 transition"
          >
            ↗ İZO
          </button>

          <button
            onClick={() => triggerCameraView('left')}
            className="py-1.5 rounded bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-700 transition"
          >
            SOL
          </button>
          <button
            onClick={() => triggerCameraView('front')}
            className="py-1.5 rounded bg-sky-600 text-white font-bold shadow-sm hover:bg-sky-500 transition"
          >
            ÖN (XZ)
          </button>
          <button
            onClick={() => triggerCameraView('right')}
            className="py-1.5 rounded bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-700 transition"
          >
            SAĞ
          </button>

          <button
            onClick={() => triggerCameraView('back')}
            className="py-1 rounded bg-slate-800/70 hover:bg-sky-600/40 text-slate-400 hover:text-white transition"
          >
            ARKA
          </button>
          <button
            onClick={() => triggerCameraView('bottom')}
            className="py-1 rounded bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-700 transition"
          >
            ALT
          </button>
          <button
            onClick={toggleOrtho}
            className={`py-1 rounded border text-[9px] font-mono transition ${
              isOrtho
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {isOrtho ? 'ORTHO' : 'PERSP'}
          </button>
        </div>
      </div>

      {/* Kinematic Joint / Gear Articulation Card */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-2.5 shadow-xl w-44">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Box className="w-3 h-3 text-amber-400" />
            Kinematik Eklem
          </span>
          <span className="font-mono font-bold text-sky-400">
            {jointArticulationDeg}°
          </span>
        </div>
        <input
          type="range"
          min={-75}
          max={75}
          value={jointArticulationDeg}
          onChange={(e) => setJointArticulationDeg(Number(e.target.value))}
          className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
        <div className="flex items-center justify-between mt-1.5">
          <button
            onClick={() => setJointArticulationDeg(0)}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            Sıfırla (0°)
          </button>
          <button
            onClick={() => setKinematicPlaying(!isKinematicPlaying)}
            className={`text-[10px] px-2 py-0.5 rounded font-semibold transition ${
              isKinematicPlaying
                ? 'bg-amber-500 text-slate-950'
                : 'bg-sky-600 hover:bg-sky-500 text-white'
            }`}
          >
            {isKinematicPlaying ? '⏸ Durdur' : '▶ Simüle Et'}
          </button>
        </div>
      </div>
    </div>
  );
};
