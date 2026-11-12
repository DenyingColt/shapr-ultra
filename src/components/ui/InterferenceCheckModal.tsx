import React from 'react';
import { ShieldAlert, CheckCircle2, X, Crosshair } from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';

export const InterferenceCheckModal: React.FC = () => {
  const isOpen = useCADStore((s) => s.isInterferenceModalOpen);
  const setOpen = useCADStore((s) => s.setInterferenceModalOpen);
  const clashes = useCADStore((s) => s.interferenceClashes);
  const selectBody = useCADStore((s) => s.selectBody);
  const runAssemblyInterferenceCheck = useCADStore(
    (s) => s.runAssemblyInterferenceCheck
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0D1017] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Montaj Çakışma Analizi (CSG Interference Check)
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-96 overflow-y-auto space-y-2.5">
          {clashes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
              <p className="text-sm font-semibold text-slate-200">
                Sıfır Çakışma Tespit Edildi!
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Sahnedeki tüm katı gövdeler birbirinden bağımsız veya tolerans sınırları içinde.
              </p>
            </div>
          ) : (
            clashes.map((clash) => (
              <div
                key={clash.id}
                className="flex items-center justify-between p-3 rounded-xl bg-rose-950/30 border border-rose-500/30"
              >
                <div>
                  <div className="text-xs font-bold text-rose-200">
                    {clash.bodyAName} ↔ {clash.bodyBName}
                  </div>
                  <div className="text-[11px] font-mono text-rose-300/80 mt-0.5">
                    Çakışma Hacmi: {clash.volumeMm3.toFixed(2)} mm³ • Merkez: [
                    {clash.centerWorld.map((n: number) => n.toFixed(1)).join(', ')}]
                  </div>
                </div>
                <button
                  onClick={() => {
                    selectBody(clash.bodyAId, false);
                    selectBody(clash.bodyBId, true);
                    setOpen(false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 text-xs font-semibold flex items-center gap-1"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  Seç
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={runAssemblyInterferenceCheck}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Yeniden Tara
          </button>
          <button
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
