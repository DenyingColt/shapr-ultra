import React, { useRef } from 'react';
import {
  Sparkles,
  ShieldAlert,
  BoxSelect,
  ImagePlus,
  Link2,
  Sheet,
  CircleDot,
} from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import { AssemblyJointType } from '../../types/cad';

export const ExplodedViewBar: React.FC = () => {
  const bodies = useCADStore((s) => s.bodies);
  const explosionFactor = useCADStore((s) => s.explosionFactor);
  const setExplosionFactor = useCADStore((s) => s.setExplosionFactor);
  const runAssemblyInterferenceCheck = useCADStore(
    (s) => s.runAssemblyInterferenceCheck
  );
  const interferenceClashes = useCADStore((s) => s.interferenceClashes);
  const sectionBox = useCADStore((s) => s.sectionBox);
  const setSectionBox = useCADStore((s) => s.setSectionBox);
  const addReferenceCanvas = useCADStore((s) => s.addReferenceCanvas);
  const addAssemblyJoint = useCADStore((s) => s.addAssemblyJoint);
  const selectedBodyIds = useCADStore((s) => s.selectedBodyIds);
  const setHoleWizardModalOpen = useCADStore((s) => s.setHoleWizardModalOpen);
  const setSheetMetalBarOpen = useCADStore((s) => s.setSheetMetalBarOpen);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadBlueprint = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addReferenceCanvas(
          file.name.replace(/\.[^.]+$/, ''),
          reader.result,
          'XZ'
        );
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleQuickJoint = (type: AssemblyJointType) => {
    addAssemblyJoint(type, `${type.toUpperCase()} Montaj Bağı`);
  };

  return (
    <div className="fixed bottom-20 right-4 z-30 flex flex-col gap-1.5 bg-[#0D1017]/95 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-2.5 shadow-2xl w-64">
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Montaj & Endüstriyel
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          {bodies.length} gövde
        </span>
      </div>

      {/* Auto-Explode Slider */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-xl px-2.5 py-1.5">
        <div className="flex items-center justify-between text-[10px] mb-1">
          <span className="text-slate-300 font-semibold">Patlatılmış Görünüm</span>
          <span className="font-mono text-amber-300">
            {Math.round(explosionFactor * 100)}%
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.02}
          value={explosionFactor}
          onChange={(e) => setExplosionFactor(parseFloat(e.target.value))}
          className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
      </div>

      {/* Quick Row: Hole Wizard, Sheet Metal, Section Box, Blueprint */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => setHoleWizardModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 text-[11px] font-medium transition-colors"
          title="ISO Metrik Delik Sihirbazı (M2 - M20)"
        >
          <CircleDot className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">Delik Sihirbazı</span>
        </button>

        <button
          onClick={() => setSheetMetalBarOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 text-[11px] font-medium transition-colors"
          title="Sac Metal & DXF Açınım Stüdyosu"
        >
          <Sheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Sac Metal</span>
        </button>

        <button
          onClick={() => setSectionBox({ enabled: !sectionBox.enabled })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-colors ${
            sectionBox.enabled
              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
              : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-slate-800'
          }`}
          title="6-Yüzlü Kesit Kutusu (Section Box)"
        >
          <BoxSelect className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">6-Yüz Kesit</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 text-[11px] font-medium transition-colors"
          title="Referans Teknik Resim / Altlık Yükle"
        >
          <ImagePlus className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="truncate">Altlık Resim</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleUploadBlueprint}
          className="hidden"
        />
      </div>

      {/* Quick Joint Row when 2 bodies are selected */}
      {selectedBodyIds.length >= 2 && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-xl p-1.5 flex items-center justify-between gap-1">
          <span className="text-[10px] text-indigo-300 font-semibold flex items-center gap-1">
            <Link2 className="w-3 h-3" /> Mafsal:
          </span>
          {(['revolute', 'slider', 'cylindrical', 'ball'] as AssemblyJointType[]).map((jt) => (
            <button
              key={jt}
              onClick={() => handleQuickJoint(jt)}
              className="px-1.5 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-200 text-[9px] font-mono uppercase"
            >
              {jt.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {/* Interference Check Button */}
      <button
        onClick={runAssemblyInterferenceCheck}
        className="w-full py-1.5 px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
      >
        <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
        Çakışma Analizi ({interferenceClashes.length})
      </button>
    </div>
  );
};
