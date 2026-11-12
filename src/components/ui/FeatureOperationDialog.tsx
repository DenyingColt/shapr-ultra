import React, { useState } from 'react';
import { Check, Sliders, Sparkles, X } from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';

export const FeatureOperationDialog: React.FC = () => {
  const activeTool = useCADStore((s) => s.activeTool);
  const setActiveTool = useCADStore((s) => s.setActiveTool);

  // Direct Modeling commits
  const commitVariableRadiusFillet = useCADStore((s) => s.commitVariableRadiusFillet);
  const commitBridgeFaces = useCADStore((s) => s.commitBridgeFaces);
  const commitEmbossOrDebossText = useCADStore((s) => s.commitEmbossOrDebossText);

  // Enclosure & Surface commits
  const commitStructuralRib = useCADStore((s) => s.commitStructuralRib);
  const commitMountingBoss = useCADStore((s) => s.commitMountingBoss);
  const commitEnclosureLipGroove = useCADStore((s) => s.commitEnclosureLipGroove);
  const commitBoundaryPatchSurface = useCADStore((s) => s.commitBoundaryPatchSurface);
  const commitOffsetSurface = useCADStore((s) => s.commitOffsetSurface);
  const commitThickenSurface = useCADStore((s) => s.commitThickenSurface);

  // Advanced Sketching commits
  const addSlotToActiveSketch = useCADStore((s) => s.addSlotToActiveSketch);
  const addConicToActiveSketch = useCADStore((s) => s.addConicToActiveSketch);
  const addSpiralToActiveSketch = useCADStore((s) => s.addSpiralToActiveSketch);
  const addEquationCurveToActiveSketch = useCADStore((s) => s.addEquationCurveToActiveSketch);
  const addVectorTextToActiveSketch = useCADStore((s) => s.addVectorTextToActiveSketch);

  // Local Inspector State
  const [rStart, setRStart] = useState(2.0);
  const [rMid, setRMid] = useState(6.5);
  const [rEnd, setREnd] = useState(2.0);
  const [chordal, setChordal] = useState(false);

  const [continuity, setContinuity] = useState<'G0' | 'G1' | 'G2'>('G2');
  const [bulgeTension, setBulgeTension] = useState(1.1);

  const [embossText, setEmbossText] = useState('SHAPR');
  const [embossDepth, setEmbossDepth] = useState(2.2);
  const [embossMode, setEmbossMode] = useState<'emboss' | 'deboss'>('emboss');

  const [ribThickness, setRibThickness] = useState(2.5);
  const [ribHeight, setRibHeight] = useState(14);

  const [bossOuterDia, setBossOuterDia] = useState(9.0);
  const [bossHoleDia, setBossHoleDia] = useState(3.2);
  const [bossHeight, setBossHeight] = useState(15.0);

  const [lipMode, setLipMode] = useState<'lip' | 'groove'>('lip');
  const [lipClearance, setLipClearance] = useState(0.15);

  const [patchBulge, setPatchBulge] = useState(5.0);
  const [offsetSurfDist, setOffsetSurfDist] = useState(4.0);
  const [thickenMm, setThickenMm] = useState(3.0);

  const [slotWidth, setSlotWidth] = useState(12);
  const [slotLength, setSlotLength] = useState(38);
  const [conicRho, setConicRho] = useState(0.62);
  const [spiralRevs, setSpiralRevs] = useState(3.5);
  const [spiralRadius, setSpiralRadius] = useState(26);
  const [eqX, setEqX] = useState('22 * cos(t) + 3 * cos(6 * t)');
  const [eqY, setEqY] = useState('22 * sin(t) + 3 * sin(6 * t)');
  const [sketchTextStr, setSketchTextStr] = useState('PRO CAD');
  const [sketchTextArcR, setSketchTextArcR] = useState(0);

  const supportedTools = [
    'variable_fillet',
    'bridge_faces',
    'emboss_deboss',
    'rib_web',
    'mounting_boss',
    'lip_groove',
    'surface_patch',
    'surface_offset',
    'surface_thicken',
    'sketch_slot',
    'sketch_conic',
    'sketch_spiral',
    'sketch_equation',
    'sketch_text',
  ];

  if (!supportedTools.includes(activeTool)) return null;

  return (
    <div className="fixed right-4 top-52 z-30 w-80 bg-[#0B0E17]/95 backdrop-blur-2xl border border-sky-500/50 rounded-2xl shadow-2xl p-4 select-none text-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 font-bold text-sky-400">
          <Sliders className="w-4 h-4" />
          <span>OPERASYON DENETLEYİCİSİ</span>
        </div>
        <button
          onClick={() => setActiveTool('select')}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 1. Variable Radius Fillet */}
      {activeTool === 'variable_fillet' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">
            Değişken Radyüslü Fillet (R1 → RMid → R2)
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">Başlangıç R1</label>
              <input
                type="number"
                step={0.5}
                value={rStart}
                onChange={(e) => setRStart(Number(e.target.value))}
                className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-amber-400">Orta RMid</label>
              <input
                type="number"
                step={0.5}
                value={rMid}
                onChange={(e) => setRMid(Number(e.target.value))}
                className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-amber-500/60 font-mono text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Bitiş R2</label>
              <input
                type="number"
                step={0.5}
                value={rEnd}
                onChange={(e) => setREnd(Number(e.target.value))}
                className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-slate-300 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={chordal}
              onChange={(e) => setChordal(e.target.checked)}
              className="accent-sky-500"
            />
            <span>Sabit Kiriş Genişliği (Chordal Fillet)</span>
          </label>
          <button
            onClick={() => commitVariableRadiusFillet(rStart, rMid, rEnd, chordal)}
            className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg"
          >
            <Check className="w-4 h-4" /> Değişken Fillet Uygula
          </button>
        </div>
      )}

      {/* 2. Solid Bridge Faces (G0/G1/G2) */}
      {activeTool === 'bridge_faces' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">
            Yüzeyler Arası Katı Köprü (Solid Bridge)
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {(['G0', 'G1', 'G2'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setContinuity(c)}
                className={`py-1.5 rounded-lg border font-bold ${
                  continuity === c
                    ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {c} {c === 'G0' ? 'Doğrusal' : c === 'G1' ? 'Teğet' : 'Eğrilik'}
              </button>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-slate-300">
              <span>Köprü Gerginliği (Magnitude):</span>
              <span className="font-mono text-sky-400">{bulgeTension.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.3}
              max={2.2}
              step={0.1}
              value={bulgeTension}
              onChange={(e) => setBulgeTension(Number(e.target.value))}
              className="w-full accent-sky-500 mt-1"
            />
          </div>
          <button
            onClick={() => commitBridgeFaces(bulgeTension, continuity)}
            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" /> {continuity} Köprüyü Oluştur
          </button>
        </div>
      )}

      {/* 3. 3D Text Emboss & Deboss */}
      {activeTool === 'emboss_deboss' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">
            3B Yüzeye Metin Kabartma / Kazıma (Wrap)
          </div>
          <input
            type="text"
            value={embossText}
            onChange={(e) => setEmbossText(e.target.value)}
            placeholder="Kabartılacak Metin..."
            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setEmbossMode('emboss')}
              className={`py-1.5 rounded-lg border font-semibold ${
                embossMode === 'emboss'
                  ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              + Kabartma (Emboss)
            </button>
            <button
              onClick={() => setEmbossMode('deboss')}
              className={`py-1.5 rounded-lg border font-semibold ${
                embossMode === 'deboss'
                  ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              − Kazıma (Deboss)
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Derinlik / Yükseklik (mm):</span>
            <input
              type="number"
              step={0.5}
              value={embossDepth}
              onChange={(e) => setEmbossDepth(Number(e.target.value))}
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
            />
          </div>
          <button
            onClick={() => commitEmbossOrDebossText(embossText, embossDepth, embossMode)}
            className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" /> Yüzeye Metni İşle
          </button>
        </div>
      )}

      {/* 4. Structural Rib / Web */}
      {activeTool === 'rib_web' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">Yapısal Takviye Federi (Rib Tool)</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">Feder Kalınlığı (mm)</label>
              <input
                type="number"
                step={0.5}
                value={ribThickness}
                onChange={(e) => setRibThickness(Number(e.target.value))}
                className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Feder Yüksekliği (mm)</label>
              <input
                type="number"
                step={1}
                value={ribHeight}
                onChange={(e) => setRibHeight(Number(e.target.value))}
                className="w-full mt-0.5 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
              />
            </div>
          </div>
          <button
            onClick={() => commitStructuralRib(ribThickness, ribHeight)}
            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            Federi Gövdeye Kaynaştır
          </button>
        </div>
      )}

      {/* 5. Mounting Boss + 4 Gussets */}
      {activeTool === 'mounting_boss' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">4-Kanatlı PCB Vida Burcu (Mounting Boss)</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">Dış Çap</label>
              <input
                type="number"
                value={bossOuterDia}
                onChange={(e) => setBossOuterDia(Number(e.target.value))}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">İç Delik</label>
              <input
                type="number"
                step={0.2}
                value={bossHoleDia}
                onChange={(e) => setBossHoleDia(Number(e.target.value))}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Boy (mm)</label>
              <input
                type="number"
                value={bossHeight}
                onChange={(e) => setBossHeight(Number(e.target.value))}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
              />
            </div>
          </div>
          <button
            onClick={() => commitMountingBoss(bossOuterDia, bossHoleDia, bossHeight)}
            className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
          >
            4 Kanatlı Burcu Oluştur
          </button>
        </div>
      )}

      {/* 6. Lip & Groove */}
      {activeTool === 'lip_groove' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">Kutu Geçmeli Dudak / Kanal (Lip & Groove)</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setLipMode('lip')}
              className={`py-1.5 rounded-lg border font-bold ${
                lipMode === 'lip'
                  ? 'bg-sky-500/25 border-sky-400 text-sky-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              Erkek Dudak (Lip)
            </button>
            <button
              onClick={() => setLipMode('groove')}
              className={`py-1.5 rounded-lg border font-bold ${
                lipMode === 'groove'
                  ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              Dişi Kanal (Groove)
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">3B Baskı Boşluğu (mm):</span>
            <input
              type="number"
              step={0.05}
              value={lipClearance}
              onChange={(e) => setLipClearance(Number(e.target.value))}
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
            />
          </div>
          <button
            onClick={() => commitEnclosureLipGroove(lipMode, lipClearance)}
            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            Geçmeli Çerçeveyi Uygula
          </button>
        </div>
      )}

      {/* 7. Surface Modeling Tools */}
      {activeTool === 'surface_patch' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">G1 Sınır Yüzey Yaması (Boundary Patch)</div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Kubbe Yüksekliği (mm):</span>
            <input
              type="number"
              value={patchBulge}
              onChange={(e) => setPatchBulge(Number(e.target.value))}
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
            />
          </div>
          <button
            onClick={() => commitBoundaryPatchSurface(patchBulge)}
            className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
          >
            Yüzey Yaması Üret
          </button>
        </div>
      )}

      {activeTool === 'surface_offset' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">Yüzey Öteleme / Kopyalama (Offset Surface)</div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Öteleme Mesafesi (0=Kopya):</span>
            <input
              type="number"
              value={offsetSurfDist}
              onChange={(e) => setOffsetSurfDist(Number(e.target.value))}
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
            />
          </div>
          <button
            onClick={() => commitOffsetSurface(offsetSurfDist)}
            className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
          >
            Yüzeyi Ötele / Çıkar
          </button>
        </div>
      )}

      {activeTool === 'surface_thicken' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">Yüzeye Et Kalınlığı Ver (Thicken)</div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Et Kalınlığı (mm):</span>
            <input
              type="number"
              step={0.5}
              value={thickenMm}
              onChange={(e) => setThickenMm(Number(e.target.value))}
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
            />
          </div>
          <button
            onClick={() => commitThickenSurface(thickenMm)}
            className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            Su Sızdırmaz Katıya Dönüştür
          </button>
        </div>
      )}

      {/* 8. Advanced Sketching Tools */}
      {activeTool === 'sketch_slot' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">2B Düz Yuva (Straight Slot)</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">Merkez Boyu (mm)</label>
              <input
                type="number"
                value={slotLength}
                onChange={(e) => setSlotLength(Number(e.target.value))}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Yuva Çapı (mm)</label>
              <input
                type="number"
                value={slotWidth}
                onChange={(e) => setSlotWidth(Number(e.target.value))}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
              />
            </div>
          </div>
          <button
            onClick={() => addSlotToActiveSketch(slotWidth, slotLength)}
            className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
          >
            Eskize Yuva Ekle
          </button>
        </div>
      )}

      {activeTool === 'sketch_conic' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">Konik Eğri (Conic Curve ρ)</div>
          <div className="flex justify-between text-[11px]">
            <span>Konik Sabiti (ρ):</span>
            <span className="font-mono text-sky-400">{conicRho.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={0.9}
            step={0.05}
            value={conicRho}
            onChange={(e) => setConicRho(Number(e.target.value))}
            className="w-full accent-sky-500"
          />
          <button
            onClick={() => addConicToActiveSketch(conicRho)}
            className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
          >
            Konik Eğriyi Ekle
          </button>
        </div>
      )}

      {activeTool === 'sketch_spiral' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">Arşimet Spirali (Spiral)</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400">Sarım Sayısı</label>
              <input
                type="number"
                step={0.5}
                value={spiralRevs}
                onChange={(e) => setSpiralRevs(Number(e.target.value))}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400">Dış Yarıçap (mm)</label>
              <input
                type="number"
                value={spiralRadius}
                onChange={(e) => setSpiralRadius(Number(e.target.value))}
                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
              />
            </div>
          </div>
          <button
            onClick={() => addSpiralToActiveSketch(spiralRevs, spiralRadius)}
            className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
          >
            Spirali Eskize Ekle
          </button>
        </div>
      )}

      {activeTool === 'sketch_equation' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">Parametrik Denklem Eğrisi x(t), y(t)</div>
          <div>
            <label className="text-[10px] text-slate-400">x(t) İfadesi:</label>
            <input
              type="text"
              value={eqX}
              onChange={(e) => setEqX(e.target.value)}
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-sky-300"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400">y(t) İfadesi:</label>
            <input
              type="text"
              value={eqY}
              onChange={(e) => setEqY(e.target.value)}
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-[11px] text-sky-300"
            />
          </div>
          <button
            onClick={() => addEquationCurveToActiveSketch(eqX, eqY)}
            className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
          >
            Denklem Eğrisini Üret
          </button>
        </div>
      )}

      {activeTool === 'sketch_text' && (
        <div className="space-y-2.5">
          <div className="font-semibold text-white">Vektörel Eskiz Metni & Yay Üzeri Yazı</div>
          <input
            type="text"
            value={sketchTextStr}
            onChange={(e) => setSketchTextStr(e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-slate-900 border border-slate-700 font-mono text-white"
          />
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Yay Yarıçapı (0 = Düz):</span>
            <input
              type="number"
              value={sketchTextArcR}
              onChange={(e) => setSketchTextArcR(Number(e.target.value))}
              className="w-20 px-2 py-1 rounded bg-slate-900 border border-slate-700 font-mono text-white"
            />
          </div>
          <button
            onClick={() => addVectorTextToActiveSketch(sketchTextStr, 12, sketchTextArcR)}
            className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold"
          >
            Metin Konturlarını Ekle
          </button>
        </div>
      )}
    </div>
  );
};
