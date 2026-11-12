import React, { useState } from 'react';
import { Sheet, X, Download, Layers, CornerDownRight, Minimize2 } from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import { calculateBendAllowance } from '../../kernel/sheetMetal';
import { shareOrDownloadCADFile } from '../../services/nativeBridge';

export const SheetMetalBar: React.FC = () => {
  const isOpen = useCADStore((s) => s.isSheetMetalBarOpen);
  const setOpen = useCADStore((s) => s.setSheetMetalBarOpen);
  const sheetMetalParams = useCADStore((s) => s.sheetMetalParams);
  const setSheetMetalParams = useCADStore((s) => s.setSheetMetalParams);
  const commitBaseFlange = useCADStore((s) => s.commitSheetMetalBaseFlange);
  const commitEdgeFlange = useCADStore((s) => s.commitSheetMetalEdgeFlange);
  const commitHem = useCADStore((s) => s.commitSheetMetalHem);
  const generateFlatPattern = useCADStore((s) => s.generateSheetMetalFlatPattern);
  const flatPatternResult = useCADStore((s) => s.flatPatternResult);

  const [widthMm, setWidthMm] = useState(80);
  const [lengthMm, setLengthMm] = useState(50);

  if (!isOpen) return null;

  const ba90 = calculateBendAllowance(
    sheetMetalParams.thicknessMm,
    sheetMetalParams.bendRadiusMm,
    sheetMetalParams.bendAngleDeg,
    sheetMetalParams.kFactor
  );

  const handleDownloadDxf = () => {
    if (!flatPatternResult?.dxfString) return;
    shareOrDownloadCADFile(
      'sac_metal_acinim.dxf',
      flatPatternResult.dxfString,
      'application/dxf'
    );
  };

  const handleDownloadSvg = () => {
    if (!flatPatternResult?.svgString) return;
    shareOrDownloadCADFile(
      'sac_metal_acinim.svg',
      flatPatternResult.svgString,
      'image/svg+xml'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#0D1017] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sheet className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Sac Metal & K-Faktörü Açınım Stüdyosu (Sheet Metal)
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
          {/* Sheet Metal Parameters */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">
                Sac Kalınlığı t (mm)
              </label>
              <input
                type="number"
                step={0.5}
                value={sheetMetalParams.thicknessMm}
                onChange={(e) =>
                  setSheetMetalParams({
                    thicknessMm: Math.max(0.5, parseFloat(e.target.value) || 2),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-emerald-300 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">
                Büküm R (mm)
              </label>
              <input
                type="number"
                step={0.5}
                value={sheetMetalParams.bendRadiusMm}
                onChange={(e) =>
                  setSheetMetalParams({
                    bendRadiusMm: Math.max(0.5, parseFloat(e.target.value) || 2.5),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-emerald-300 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">
                K-Faktörü (0.33-0.50)
              </label>
              <input
                type="number"
                step={0.02}
                value={sheetMetalParams.kFactor}
                onChange={(e) =>
                  setSheetMetalParams({
                    kFactor: Math.max(
                      0.25,
                      Math.min(0.5, parseFloat(e.target.value) || 0.44)
                    ),
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-emerald-300 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="text-slate-400 block mb-1">Taban En (mm)</label>
              <input
                type="number"
                value={widthMm}
                onChange={(e) => setWidthMm(parseFloat(e.target.value) || 80)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Taban Boy (mm)</label>
              <input
                type="number"
                value={lengthMm}
                onChange={(e) => setLengthMm(parseFloat(e.target.value) || 50)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Flanş Boyu (mm)</label>
              <input
                type="number"
                value={sheetMetalParams.flangeLengthMm}
                onChange={(e) =>
                  setSheetMetalParams({
                    flangeLengthMm: parseFloat(e.target.value) || 25,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Büküm Açısı (°)</label>
              <input
                type="number"
                value={sheetMetalParams.bendAngleDeg}
                onChange={(e) =>
                  setSheetMetalParams({
                    bendAngleDeg: parseFloat(e.target.value) || 90,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-slate-200 font-mono"
              />
            </div>
          </div>

          {/* Formula Readout */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 font-mono text-[11px] text-slate-300 flex items-center justify-between">
            <span>BA = θ·(R + K·t) Büküm Payı:</span>
            <span className="text-emerald-400 font-bold">{ba90.toFixed(2)} mm</span>
          </div>

          {/* Operations */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => commitBaseFlange(widthMm, lengthMm)}
              className="py-2 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-200 font-semibold flex items-center justify-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              1. Taban Sacı Oluştur
            </button>

            <button
              onClick={() => commitEdgeFlange('right')}
              className="py-2 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-200 font-semibold flex items-center justify-center gap-1.5"
            >
              <CornerDownRight className="w-3.5 h-3.5" />
              2. Kenar Flanşı Bük ({sheetMetalParams.bendAngleDeg}°)
            </button>

            <button
              onClick={() => commitHem()}
              className="py-2 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-200 font-semibold flex items-center justify-center gap-1.5"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              3. 180° Kıvırma (Hem)
            </button>

            <button
              onClick={() => generateFlatPattern()}
              className="py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold flex items-center justify-center gap-1.5"
            >
              <Sheet className="w-3.5 h-3.5" />
              4. Açınım Hesapla (Unfold)
            </button>
          </div>

          {/* Export Flat Pattern DXF / SVG */}
          {flatPatternResult && (
            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 flex items-center justify-between">
              <div className="text-[11px] text-emerald-200">
                <div className="font-bold">
                  1:1 Lazer Kesim Açınımı ({flatPatternResult.flatWidthMm}×
                  {flatPatternResult.flatDepthMm} mm)
                </div>
                <div className="text-emerald-400/80">
                  OUTER_CUT + BEND_LINES katmanlı (BA={flatPatternResult.bendAllowanceMm}mm)
                </div>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={handleDownloadDxf}
                  className="px-2.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold flex items-center gap-1 text-[11px]"
                >
                  <Download className="w-3.5 h-3.5" /> .DXF
                </button>
                <button
                  onClick={handleDownloadSvg}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center gap-1 text-[11px]"
                >
                  <Download className="w-3.5 h-3.5" /> .SVG
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
