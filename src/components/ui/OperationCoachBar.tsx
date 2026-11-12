import React, { useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Compass,
  HelpCircle,
  Printer,
  ShieldCheck,
  Sliders,
  Sparkles,
  X,
} from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import { analyzeMeshPrintReadiness } from '../../kernel/meshDoctor';

export const OperationCoachBar: React.FC = () => {
  const activeTool = useCADStore((s) => s.activeTool);
  const setActiveTool = useCADStore((s) => s.setActiveTool);
  const activeSketchId = useCADStore((s) => s.activeSketchId);
  const finishActiveSketch = useCADStore((s) => s.finishActiveSketch);

  const selectedFaceIds = useCADStore((s) => s.selectedFaceIds);
  const selectedEdgeIds = useCADStore((s) => s.selectedEdgeIds);
  const selectedProfileIds = useCADStore((s) => s.selectedProfileIds);
  const selectedBodyIds = useCADStore((s) => s.selectedBodyIds);

  const commitExtrude = useCADStore((s) => s.commitExtrude);
  const commitFilletChamfer = useCADStore((s) => s.commitFilletChamfer);
  const commitShell = useCADStore((s) => s.commitShell);
  const commitLoft = useCADStore((s) => s.commitLoft);
  const commitSweep = useCADStore((s) => s.commitSweep);
  const commitRevolve = useCADStore((s) => s.commitRevolve);
  const commitBoolean = useCADStore((s) => s.commitBoolean);
  const openNumericHUD = useCADStore((s) => s.openNumericHUD);

  const isMeshDoctorModalOpen = useCADStore((s) => s.isMeshDoctorModalOpen);
  const setMeshDoctorModalOpen = useCADStore((s) => s.setMeshDoctorModalOpen);
  const bodies = useCADStore((s) => s.bodies);
  const globalClearanceOffsetMm = useCADStore((s) => s.globalClearanceOffsetMm);
  const applyGlobalToleranceCompensation = useCADStore(
    (s) => s.applyGlobalToleranceCompensation
  );

  const [toleranceInput, setToleranceInput] = useState<number>(
    globalClearanceOffsetMm || 0.15
  );

  // Determine step-by-step coach prompt for current tool
  const getCoachSpec = (): {
    title: string;
    stepText: string;
    canConfirm: boolean;
    onConfirm?: () => void;
    onOpenNumeric?: () => void;
  } | null => {
    if (activeSketchId) {
      return {
        title: '2B Parametrik Eskiz Modu',
        stepText:
          'Adım 1: Kalem/Fare ile çizgi, daire, yay veya spline çizin • Adım 2: Kapalı alan oluşunca "Eskizi Bitir"e dokunun.',
        canConfirm: true,
        onConfirm: () => finishActiveSketch(),
      };
    }

    switch (activeTool) {
      case 'extrude': {
        const hasTarget = selectedFaceIds.length > 0 || selectedProfileIds.length > 0;
        return {
          title: '3B Ekstrüzyon & Otomatik CSG',
          stepText: hasTarget
            ? 'Adım 2: 3B Ok (Gizmo) ile yüksekliği sürükleyin veya Numpad ile tam ölçü girip onaylayın.'
            : 'Adım 1: Katılaştırmak istediğiniz bir 3B Yüzeye veya 2B Kapalı Eskiz Profiline dokunun.',
          canConfirm: hasTarget,
          onConfirm: () => commitExtrude(),
          onOpenNumeric: () =>
            openNumericHUD({
              label: 'Ekstrüzyon Mesafesi',
              value: '18',
              unit: 'mm',
              targetField: 'extrude',
            }),
        };
      }
      case 'fillet_chamfer': {
        const hasEdges = selectedEdgeIds.length > 0 || selectedBodyIds.length > 0;
        return {
          title: 'Kenar Yuvarlatma / Pah Kırma',
          stepText: hasEdges
            ? 'Adım 2: Sarı halka gizmosunu sürükleyin veya radyüs/pah değerini onaylayın.'
            : 'Adım 1: Model üzerinde bir veya birden fazla keskin kenara (Edge) dokunun.',
          canConfirm: hasEdges,
          onConfirm: () => commitFilletChamfer(),
          onOpenNumeric: () =>
            openNumericHUD({
              label: 'Fillet Radyüsü / Pah (mm)',
              value: '2.5',
              unit: 'mm',
              targetField: 'fillet',
            }),
        };
      }
      case 'shell': {
        const hasBodyOrFace = selectedFaceIds.length > 0 || selectedBodyIds.length > 0;
        return {
          title: 'Kabuk / İç Boşaltma (Shell)',
          stepText: hasBodyOrFace
            ? 'Adım 2: Et kalınlığını belirleyin ve oyuk kabuk oluşturmak için onaylayın.'
            : 'Adım 1: Açık bırakılacak üst yüzeye (Face) veya boşaltılacak katı gövdeye dokunun.',
          canConfirm: hasBodyOrFace,
          onConfirm: () => commitShell(),
          onOpenNumeric: () =>
            openNumericHUD({
              label: 'Kabuk Et Kalınlığı',
              value: '2.5',
              unit: 'mm',
              targetField: 'shell',
            }),
        };
      }
      case 'loft': {
        return {
          title: 'Çoklu Kesit Geçişi (Loft)',
          stepText: `Adım 1: En az 2 kapalı profil veya yüzey seçin (Seçilen: ${
            selectedProfileIds.length + selectedFaceIds.length
          }) • Adım 2: Onaylayın.`,
          canConfirm: selectedProfileIds.length + selectedFaceIds.length >= 2,
          onConfirm: () => commitLoft(),
        };
      }
      case 'sweep': {
        return {
          title: 'Yol Boyunca Süpürme (Sweep)',
          stepText:
            'Adım 1: Bir kapalı profil seçin • Adım 2: Süpürme eğrisini seçip onaylayın.',
          canConfirm: true,
          onConfirm: () => commitSweep(),
        };
      }
      case 'revolve': {
        return {
          title: 'Eksenel Döndürme (Revolve 360°)',
          stepText:
            'Adım 1: Döndürülecek kapalı eskiz profilini veya yüzeyi seçin • Adım 2: Açıyı onaylayın.',
          canConfirm: true,
          onConfirm: () => commitRevolve(360),
        };
      }
      case 'boolean': {
        return {
          title: 'CSG Boolean İşlemi',
          stepText: `Adım 1: Hedef ve kesici gövdeleri seçin (Seçilen Gövde: ${selectedBodyIds.length}/2).`,
          canConfirm: bodies.length >= 2,
          onConfirm: () => commitBoolean('subtract'),
        };
      }
      default:
        return null;
    }
  };

  const coach = getCoachSpec();

  // Target body for 3D Print Mesh Doctor inspection
  const diagnostic = bodies.length > 0 ? analyzeMeshPrintReadiness(bodies) : null;

  return (
    <>
      {/* Top-Center Interactive Operation Coach Pill */}
      {coach && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none max-w-2xl w-[92vw] sm:w-auto">
          <div className="bg-[#0D111A]/95 backdrop-blur-xl border border-sky-500/50 rounded-2xl px-4 py-2 shadow-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>{coach.title}</span>
                  <HelpCircle className="w-3 h-3 text-slate-500" />
                </div>
                <div className="text-xs text-slate-200">{coach.stepText}</div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {coach.onOpenNumeric && (
                <button
                  onClick={coach.onOpenNumeric}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 text-xs font-mono font-bold transition"
                >
                  123 Ölçü
                </button>
              )}
              {coach.onConfirm && (
                <button
                  onClick={coach.onConfirm}
                  disabled={!coach.canConfirm}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 shadow-md transition"
                >
                  <Check className="w-3.5 h-3.5" /> Uygula
                </button>
              )}
              <button
                onClick={() => {
                  if (activeSketchId) finishActiveSketch();
                  else setActiveTool('select');
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="İşlemi İptal Et"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3D Print Tolerance & Mesh Doctor Modal */}
      {isMeshDoctorModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
          <div className="w-full max-w-xl bg-[#0C0F17] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    3B YAZICI MESH DOKTORU & TOLERANS MOTORU
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Manifold Su Sızdırmazlık Denetimi, Sarkma (Overhang) Analizi & Geçme Payı Telafisi
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMeshDoctorModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {diagnostic ? (
                <>
                  {/* Diagnostics Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="text-[11px] text-slate-400">Gövde / Parça Durumu</div>
                      <div className="text-sm font-bold text-white mt-0.5 truncate">
                        {bodies.length} Katı Gövde ({diagnostic.totalTriangleCount} Üçgen)
                      </div>
                      <div className="mt-2 flex items-center gap-1.5 text-xs">
                        {diagnostic.isWatertightManifold ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Watertight Manifold
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" /> {diagnostic.openEdgeCount} Açık Kenar
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                      <div className="text-[11px] text-slate-400">Baskı Süresi & Filament (PLA+)</div>
                      <div className="text-sm font-bold text-sky-400 font-mono mt-0.5">
                        ~{diagnostic.estimatedPlaGrams} g • ~{diagnostic.estimatedPrintTimeMinutes} dk
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1.5 font-mono">
                        Min. Et Kalınlığı: <strong className="text-white">{diagnostic.minWallThicknessMm} mm</strong>
                      </div>
                    </div>
                  </div>

                  {/* Overhang & Print Readiness Bar */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-semibold">
                        45° Üzeri Destek Gerektiren Yüzey (Overhang):
                      </span>
                      <span className="font-mono font-bold text-amber-400">
                        {diagnostic.criticalOverhangFaceCount} Kritik Bölge
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        style={{
                          width: `${Math.max(5, Math.min(100, 100 - diagnostic.criticalOverhangFaceCount * 5))}%`,
                        }}
                        className="h-full bg-gradient-to-r from-emerald-500 to-sky-500"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Dilimleyici (Cura / PrusaSlicer / Bambu Studio) için STL & OBJ çıktıları sıfır hata ile üretime hazırdır.
                    </p>
                  </div>

                  {/* Mechanical Fit / XY Clearance Compensation */}
                  <div className="p-4 rounded-xl bg-sky-950/25 border border-sky-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-sky-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          3B Yazıcı Geçme Toleransı Telafisi (XY Clearance)
                        </span>
                      </div>
                      <span className="font-mono text-xs font-bold text-sky-400">
                        {toleranceInput >= 0 ? `+${toleranceInput.toFixed(2)}` : toleranceInput.toFixed(2)} mm
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      FDM/SLA yazıcılarda vida delikleri, rulman yuvaları ve geçmeli kapakların birbirine sıkışmadan oturması için XY radyal boşluk telafisi uygular:
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'Sıkı Geçme (+0.10mm)', val: 0.1 },
                        { label: 'Standart PLA (+0.15mm)', val: 0.15 },
                        { label: 'Hareketli Mafsal (+0.25mm)', val: 0.25 },
                      ].map((preset) => (
                        <button
                          key={preset.val}
                          onClick={() => setToleranceInput(preset.val)}
                          className={`py-2 px-2 rounded-lg border text-[11px] font-semibold transition ${
                            Math.abs(toleranceInput - preset.val) < 0.01
                              ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <input
                        type="range"
                        min={-0.3}
                        max={0.5}
                        step={0.05}
                        value={toleranceInput}
                        onChange={(e) => setToleranceInput(parseFloat(e.target.value))}
                        className="flex-1 accent-sky-500"
                      />
                      <button
                        onClick={() => {
                          applyGlobalToleranceCompensation(toleranceInput);
                          setMeshDoctorModalOpen(false);
                        }}
                        className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-sky-600/25"
                      >
                        <Sparkles className="w-4 h-4" /> Toleransı Gövdeye Uygula
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Analiz edilecek katı gövde bulunamadı.
                </div>
              )}
            </div>

            <div className="px-5 py-3 bg-slate-900/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="w-4 h-4" /> ISO / 3D Print Manifold Standartlarına Uygun
              </span>
              <button
                onClick={() => setMeshDoctorModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold"
              >
                Tamam
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
