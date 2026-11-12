import React from 'react';
import { CircleDot, X, Check } from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import { ISO_METRIC_HOLE_TABLE } from '../../kernel/enclosureFeatures';
import { ISOMetricThreadSize } from '../../types/cad';

export const HoleWizardModal: React.FC = () => {
  const isOpen = useCADStore((s) => s.isHoleWizardModalOpen);
  const setOpen = useCADStore((s) => s.setHoleWizardModalOpen);
  const params = useCADStore((s) => s.holeWizardParams);
  const setParams = useCADStore((s) => s.setHoleWizardParams);
  const commitHoleWizardDrill = useCADStore((s) => s.commitHoleWizardDrill);

  if (!isOpen) return null;

  const spec = ISO_METRIC_HOLE_TABLE[params.isoSize];
  const sizes = Object.keys(ISO_METRIC_HOLE_TABLE) as ISOMetricThreadSize[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0D1017] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              ISO Metrik Delik Sihirbazı (DIN 912 / 7991)
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 text-xs">
          {/* Hole Type Selector */}
          <div>
            <label className="text-slate-400 block mb-1 font-semibold">Delik Tipi</label>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  { id: 'simple', label: 'Düz Delik' },
                  { id: 'counterbore', label: 'İmbus (DIN 912)' },
                  { id: 'countersink', label: 'Havşa (DIN 7991)' },
                  { id: 'tapped', label: 'Kılavuz Diş' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  onClick={() => setParams({ holeType: item.id })}
                  className={`py-1.5 px-2 rounded-xl border text-[11px] font-semibold transition-all ${
                    params.holeType === item.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Thread Size & Fit Class */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">
                Metrik Boyut (M2 - M20)
              </label>
              <select
                value={params.isoSize}
                onChange={(e) =>
                  setParams({ isoSize: e.target.value as ISOMetricThreadSize })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100 font-mono"
              >
                {sizes.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz} (Adım {ISO_METRIC_HOLE_TABLE[sz].pitchMm} mm)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">
                Geçme Toleransı (ISO 273)
              </label>
              <select
                value={params.fitClass}
                onChange={(e) =>
                  setParams({
                    fitClass: e.target.value as 'close' | 'normal' | 'loose',
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-100"
              >
                <option value="close">Hassas Geçme (Fine)</option>
                <option value="normal">Orta Geçme (Medium)</option>
                <option value="loose">Serbest Geçme (Coarse)</option>
              </select>
            </div>
          </div>

          {/* Depth & Drill Point Angle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">
                Delik Derinliği (mm)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={params.depthMode === 'through_all'}
                  value={params.depthMm}
                  onChange={(e) =>
                    setParams({ depthMm: Math.max(1, parseFloat(e.target.value) || 10) })
                  }
                  className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-cyan-300 font-mono disabled:opacity-40"
                />
                <label className="flex items-center gap-1 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={params.depthMode === 'through_all'}
                    onChange={(e) =>
                      setParams({
                        depthMode: e.target.checked ? 'through_all' : 'blind',
                      })
                    }
                  />
                  Boydan Boya
                </label>
              </div>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">
                Matkap Uç Açısı
              </label>
              <div className="flex gap-1.5">
                {([118, 135, 180] as const).map((ang) => (
                  <button
                    key={ang}
                    onClick={() => setParams({ tipAngleDeg: ang })}
                    className={`flex-1 py-1.5 rounded-xl border font-mono text-[11px] ${
                      params.tipAngleDeg === ang
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {ang}°
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Standard ISO Dimension Readout Card */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 space-y-1">
            <div className="text-cyan-400 font-bold">
              ISO 273 / DIN 912 Teknik Ölçü Özeti ({params.isoSize})
            </div>
            <div>
              • Matkap / Geçme Çapı:{' '}
              <span className="text-white">
                Ø
                {params.holeType === 'tapped'
                  ? spec.tapDrillMm
                  : params.fitClass === 'close'
                  ? spec.clearanceCloseMm
                  : params.fitClass === 'normal'
                  ? spec.clearanceNormalMm
                  : spec.clearanceLooseMm}{' '}
                mm
              </span>
            </div>
            {params.holeType === 'counterbore' && (
              <div>
                • İmbus Baş Yuvası (DIN 912):{' '}
                <span className="text-white">
                  Ø{spec.counterboreDiaMm} mm × {spec.counterboreDepthMm} mm derinlik
                </span>
              </div>
            )}
            {params.holeType === 'countersink' && (
              <div>
                • 90° Havşa Çapı (DIN 7991):{' '}
                <span className="text-white">Ø{spec.countersinkDiaMm} mm</span>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 py-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
          >
            İptal
          </button>
          <button
            onClick={commitHoleWizardDrill}
            className="px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            Deliği Aç (CSG Subtract)
          </button>
        </div>
      </div>
    </div>
  );
};
