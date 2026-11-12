import React from 'react';
import {
  PenTool,
  Slash,
  Circle,
  Square,
  Hexagon,
  Spline,
  Scissors,
  Copy,
  Check,
  ArrowUpFromLine,
  RotateCcw,
  Waypoints,
  Layers,
  Box,
  Cylinder,
  Combine,
  SplitSquareVertical,
  Move3d,
  Grid,
  FlipHorizontal2,
  Trash2,
  Cog,
  Type,
  CircleDot,
  Sheet,
  Sparkles,
} from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import { ActiveTool } from '../../types/cad';

export const AdaptiveContextMenu: React.FC = () => {
  const activeSketchId = useCADStore((s) => s.activeSketchId);
  const activeTool = useCADStore((s) => s.activeTool);
  const setActiveTool = useCADStore((s) => s.setActiveTool);

  const selectedBodyIds = useCADStore((s) => s.selectedBodyIds);
  const selectedFaceIds = useCADStore((s) => s.selectedFaceIds);
  const selectedEdgeIds = useCADStore((s) => s.selectedEdgeIds);
  const selectedProfileIds = useCADStore((s) => s.selectedProfileIds);

  const startSketchOnSelectionOrPlane = useCADStore(
    (s) => s.startSketchOnSelectionOrPlane
  );
  const finishActiveSketch = useCADStore((s) => s.finishActiveSketch);
  const commitExtrude = useCADStore((s) => s.commitExtrude);
  const commitFilletChamfer = useCADStore((s) => s.commitFilletChamfer);
  const selectTangentEdgeLoopForSelected = useCADStore(
    (s) => s.selectTangentEdgeLoopForSelected
  );
  const commitShell = useCADStore((s) => s.commitShell);
  const commitRevolve = useCADStore((s) => s.commitRevolve);
  const commitSweep = useCADStore((s) => s.commitSweep);
  const commitLoft = useCADStore((s) => s.commitLoft);
  const commitBoolean = useCADStore((s) => s.commitBoolean);
  const commitSplitBody = useCADStore((s) => s.commitSplitBody);
  const commitLinearPattern = useCADStore((s) => s.commitLinearPattern);
  const commitCircularPattern = useCADStore((s) => s.commitCircularPattern);
  const commitMirrorBody = useCADStore((s) => s.commitMirrorBody);

  // Mega-Expansion Actions
  const addSlotToActiveSketch = useCADStore((s) => s.addSlotToActiveSketch);
  const addVectorTextToActiveSketch = useCADStore(
    (s) => s.addVectorTextToActiveSketch
  );
  const addSpiralToActiveSketch = useCADStore((s) => s.addSpiralToActiveSketch);
  const addEquationCurveToActiveSketch = useCADStore(
    (s) => s.addEquationCurveToActiveSketch
  );
  const commitDeleteAndHealFaces = useCADStore((s) => s.commitDeleteAndHealFaces);
  const commitReplaceFace = useCADStore((s) => s.commitReplaceFace);
  const commitBridgeFaces = useCADStore((s) => s.commitBridgeFaces);
  const commitSheetMetalEdgeFlange = useCADStore(
    (s) => s.commitSheetMetalEdgeFlange
  );
  const commitOffsetSurface = useCADStore((s) => s.commitOffsetSurface);
  const commitThickenSurface = useCADStore((s) => s.commitThickenSurface);
  const setHoleWizardModalOpen = useCADStore((s) => s.setHoleWizardModalOpen);
  const setSheetMetalBarOpen = useCADStore((s) => s.setSheetMetalBarOpen);

  const addPrimitiveSolid = useCADStore((s) => s.addPrimitiveSolid);
  const duplicateSelectedBody = useCADStore((s) => s.duplicateSelectedBody);
  const deleteSelectedEntities = useCADStore((s) => s.deleteSelectedEntities);
  const setMacrosModalOpen = useCADStore((s) => s.setMacrosModalOpen);

  const toolBtnClass = (tool: ActiveTool) =>
    `px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
      activeTool === tool
        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
        : 'bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700/70'
    }`;

  const actionBtnClass =
    'px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-slate-800/90 hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-700/70 transition';

  return (
    <div className="fixed bottom-11 left-1/2 -translate-x-1/2 z-30 pointer-events-auto select-none max-w-[96vw] overflow-x-auto">
      <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 shadow-2xl">
        {/* =============================================================== */}
        {/* CONTEXT 1: 2D SKETCH MODE ACTIVE                                */}
        {/* =============================================================== */}
        {activeSketchId ? (
          <>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
              2D Eskiz
            </span>

            <button
              onClick={() => setActiveTool('sketch_pen')}
              className={toolBtnClass('sketch_pen')}
              title="Akıllı S-Pen Kalem (Çizgi, Yay, Çember, Dikdörtgen Tanıma)"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Kalem</span>
            </button>

            <button
              onClick={() => setActiveTool('sketch_line')}
              className={toolBtnClass('sketch_line')}
            >
              <Slash className="w-3.5 h-3.5" />
              <span>Çizgi</span>
            </button>

            <button
              onClick={() => setActiveTool('sketch_rect')}
              className={toolBtnClass('sketch_rect')}
            >
              <Square className="w-3.5 h-3.5" />
              <span>Dikdörtgen</span>
            </button>

            <button
              onClick={() => setActiveTool('sketch_circle')}
              className={toolBtnClass('sketch_circle')}
            >
              <Circle className="w-3.5 h-3.5" />
              <span>Çember</span>
            </button>

            <button
              onClick={() => setActiveTool('sketch_arc')}
              className={toolBtnClass('sketch_arc')}
            >
              <Waypoints className="w-3.5 h-3.5" />
              <span>Yay</span>
            </button>

            <button
              onClick={() => setActiveTool('sketch_polygon')}
              className={toolBtnClass('sketch_polygon')}
            >
              <Hexagon className="w-3.5 h-3.5" />
              <span>Çokgen</span>
            </button>

            <button
              onClick={() => setActiveTool('sketch_spline')}
              className={toolBtnClass('sketch_spline')}
            >
              <Spline className="w-3.5 h-3.5" />
              <span>Spline</span>
            </button>

            <button
              onClick={() => addSlotToActiveSketch(12, 36)}
              className={actionBtnClass}
              title="Merkezden Merkeze Yuva (Straight Slot)"
            >
              <span>Yuva (Slot)</span>
            </button>

            <button
              onClick={() => addVectorTextToActiveSketch('SHAPR', 12, 0)}
              className={actionBtnClass}
              title="2B Vektör Metin (Extrude Edilebilir)"
            >
              <Type className="w-3.5 h-3.5 text-cyan-400" />
              <span>Metin</span>
            </button>

            <button
              onClick={() => addSpiralToActiveSketch(3, 24)}
              className={actionBtnClass}
              title="Arşimet Spirali Ekle"
            >
              <span>Spiral</span>
            </button>

            <button
              onClick={() => addEquationCurveToActiveSketch()}
              className={actionBtnClass}
              title="Matematiksel Denklem Eğrisi y=f(t)"
            >
              <span>f(x) Eğri</span>
            </button>

            <button
              onClick={() => setActiveTool('sketch_trim')}
              className={toolBtnClass('sketch_trim')}
              title="Kesişen çizgileri buda (Trim)"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Buda</span>
            </button>

            <button
              onClick={() => setActiveTool('sketch_offset')}
              className={toolBtnClass('sketch_offset')}
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Offset</span>
            </button>

            <div className="h-5 w-px bg-slate-700 mx-1" />

            <button
              onClick={() => commitExtrude()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 transition"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Extrude</span>
            </button>

            <button
              onClick={finishActiveSketch}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Bitir</span>
            </button>
          </>
        ) : selectedEdgeIds.length > 0 ? (
          /* =============================================================== */
          /* CONTEXT 2: TOPOLOGICAL EDGE(S) SELECTED                         */
          /* =============================================================== */
          <>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
              {selectedEdgeIds.length} Kenar Seçili
            </span>

            <button
              onClick={() => {
                setActiveTool('fillet_chamfer');
                commitFilletChamfer(2.5);
              }}
              className={actionBtnClass}
            >
              <span>Fillet (R2.5)</span>
            </button>

            <button
              onClick={() => setActiveTool('variable_fillet')}
              className={toolBtnClass('variable_fillet')}
              title="Başlangıç, Orta ve Bitiş Yarıçaplı Değişken Fillet (Plasticity Tarzı)"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Değişken Fillet</span>
            </button>

            <button
              onClick={() => {
                setActiveTool('fillet_chamfer');
                commitFilletChamfer(-2.0);
              }}
              className={actionBtnClass}
            >
              <span>Chamfer (2mm)</span>
            </button>

            <button
              onClick={() => commitSheetMetalEdgeFlange('right')}
              className={actionBtnClass}
              title="Kenardan 90° Sac Metal Flanşı Bük"
            >
              <Sheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Sac Flanş Bük</span>
            </button>

            <button
              onClick={selectTangentEdgeLoopForSelected}
              className={actionBtnClass}
            >
              <span>Teğet Halka</span>
            </button>

            <button onClick={commitSweep} className={actionBtnClass}>
              <Waypoints className="w-3.5 h-3.5" />
              <span>Sweep</span>
            </button>
          </>
        ) : selectedFaceIds.length > 0 ? (
          /* =============================================================== */
          /* CONTEXT 3: TOPOLOGICAL FACE(S) SELECTED                         */
          /* =============================================================== */
          <>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
              {selectedFaceIds.length} Yüzey
            </span>

            <button
              onClick={() => setActiveTool('extrude')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Push / Pull</span>
            </button>

            <button
              onClick={() => startSketchOnSelectionOrPlane()}
              className={actionBtnClass}
            >
              <PenTool className="w-3.5 h-3.5 text-sky-400" />
              <span>Yüzeyde Eskiz</span>
            </button>

            <button
              onClick={commitDeleteAndHealFaces}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-rose-500/20 hover:bg-rose-500 text-rose-200 hover:text-white border border-rose-500/40 transition"
              title="Seçili Yüzeyi Sil ve Komşu Yüzeylerle Kapat (Delete & Heal)"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Sil & Onar (Heal)</span>
            </button>

            <button
              onClick={() => setHoleWizardModalOpen(true)}
              className={actionBtnClass}
              title="ISO Metrik Delik Sihirbazı (M2 - M20)"
            >
              <CircleDot className="w-3.5 h-3.5 text-cyan-400" />
              <span>Delik Sihirbazı</span>
            </button>

            <button
              onClick={() => setActiveTool('emboss_deboss')}
              className={toolBtnClass('emboss_deboss')}
              title="Yüzeye Kabartma veya Oyma Metin İşle (Emboss / Deboss)"
            >
              <Type className="w-3.5 h-3.5 text-amber-400" />
              <span>Emboss Yazı</span>
            </button>

            <button
              onClick={() => setActiveTool('mounting_boss')}
              className={toolBtnClass('mounting_boss')}
              title="4 Destek Kanatlı Enjeksiyon Vida Kulesi (Mounting Boss)"
            >
              <span>Vida Kulesi</span>
            </button>

            <button
              onClick={() => setActiveTool('rib_web')}
              className={toolBtnClass('rib_web')}
              title="Takviye Federi (Structural Rib)"
            >
              <span>Feder (Rib)</span>
            </button>

            <button onClick={() => commitShell()} className={actionBtnClass}>
              <Box className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kabuk (Shell)</span>
            </button>

            <button
              onClick={() => commitOffsetSurface(0)}
              className={actionBtnClass}
              title="Sıfır Kalınlıklı Yüzey Kopyası Çıkar (0mm Surface Extract)"
            >
              <span>Yüzey Kopyala</span>
            </button>

            {selectedFaceIds.length >= 2 && (
              <>
                <button
                  onClick={() => commitBridgeFaces(1.0, 'G1')}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/20 hover:bg-cyan-500 text-cyan-200 hover:text-slate-950 border border-cyan-500/40 transition"
                >
                  <span>Yüzey Köprüsü (Bridge)</span>
                </button>
                <button
                  onClick={commitReplaceFace}
                  className={actionBtnClass}
                >
                  <span>Yüzeyi Değiştir</span>
                </button>
              </>
            )}
          </>
        ) : selectedProfileIds.length > 0 ? (
          /* =============================================================== */
          /* CONTEXT 4: 2D CLOSED PROFILE SELECTED                           */
          /* =============================================================== */
          <>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
              Kapalı Profil
            </span>

            <button
              onClick={() => commitExtrude()}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" />
              <span>Extrude (Katıla)</span>
            </button>

            <button onClick={() => commitRevolve(360)} className={actionBtnClass}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revolve (360°)</span>
            </button>

            <button onClick={commitSweep} className={actionBtnClass}>
              <Waypoints className="w-3.5 h-3.5" />
              <span>Sweep</span>
            </button>

            <button onClick={commitLoft} className={actionBtnClass}>
              <Layers className="w-3.5 h-3.5" />
              <span>Loft</span>
            </button>
          </>
        ) : selectedBodyIds.length >= 2 ? (
          /* =============================================================== */
          /* CONTEXT 5: 2 OR MORE SOLID BODIES SELECTED -> BOOLEAN CSG       */
          /* =============================================================== */
          <>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">
              {selectedBodyIds.length} Gövde Seçili (CSG)
            </span>

            <button
              onClick={() => commitBoolean('union')}
              className={actionBtnClass}
            >
              <Combine className="w-3.5 h-3.5 text-emerald-400" />
              <span>Birleştir (Union)</span>
            </button>

            <button
              onClick={() => commitBoolean('subtract')}
              className={actionBtnClass}
            >
              <Combine className="w-3.5 h-3.5 text-rose-400" />
              <span>Çıkar / Delik Aç (Subtract)</span>
            </button>

            <button
              onClick={() => commitBoolean('intersect')}
              className={actionBtnClass}
            >
              <Combine className="w-3.5 h-3.5 text-sky-400" />
              <span>Kesişim (Intersect)</span>
            </button>
          </>
        ) : selectedBodyIds.length === 1 ? (
          /* =============================================================== */
          /* CONTEXT 6: SINGLE SOLID OR SURFACE BODY SELECTED                */
          /* =============================================================== */
          <>
            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
              Gövde Araçları
            </span>

            <button
              onClick={() => setActiveTool('move_rotate')}
              className={toolBtnClass('move_rotate')}
            >
              <Move3d className="w-3.5 h-3.5" />
              <span>Taşı / Döndür</span>
            </button>

            <button onClick={() => commitShell()} className={actionBtnClass}>
              <Box className="w-3.5 h-3.5" />
              <span>Kabuk (Shell)</span>
            </button>

            <button
              onClick={() => setActiveTool('lip_groove')}
              className={toolBtnClass('lip_groove')}
              title="Alt/Üst Kutu Kapağı Geçme Dudağı (Enclosure Lip & Groove)"
            >
              <span>Kutu Dudağı (Lip)</span>
            </button>

            <button
              onClick={() => commitThickenSurface(2.5)}
              className={actionBtnClass}
              title="Yüzey Gövdesini Katıya Kalınlaştır (Thicken Surface)"
            >
              <span>Kalınlaştır (2.5mm)</span>
            </button>

            <button onClick={commitSplitBody} className={actionBtnClass}>
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>Gövdeyi Böl</span>
            </button>

            <button
              onClick={() => commitLinearPattern(3, 42)}
              className={actionBtnClass}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Doğrusal Dizi</span>
            </button>

            <button
              onClick={() => commitCircularPattern(4)}
              className={actionBtnClass}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Dairesel Dizi</span>
            </button>

            <button onClick={commitMirrorBody} className={actionBtnClass}>
              <FlipHorizontal2 className="w-3.5 h-3.5" />
              <span>Aynala</span>
            </button>

            <button onClick={duplicateSelectedBody} className={actionBtnClass}>
              <Copy className="w-3.5 h-3.5" />
              <span>Çoğalt</span>
            </button>

            <button
              onClick={deleteSelectedEntities}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          /* =============================================================== */
          /* CONTEXT 7: DEFAULT WORKSPACE (NOTHING SELECTED)                 */
          /* =============================================================== */
          <>
            <button
              onClick={() => startSketchOnSelectionOrPlane('plane_xy')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow-sm transition"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Yeni 2D Eskiz (S-Pen)</span>
            </button>

            <div className="h-5 w-px bg-slate-700 mx-0.5" />

            <button
              onClick={() => addPrimitiveSolid('box')}
              className={actionBtnClass}
            >
              <Box className="w-3.5 h-3.5 text-sky-400" />
              <span>Kutu Ekle</span>
            </button>

            <button
              onClick={() => addPrimitiveSolid('cylinder')}
              className={actionBtnClass}
            >
              <Cylinder className="w-3.5 h-3.5 text-sky-400" />
              <span>Silindir</span>
            </button>

            <button
              onClick={() => addPrimitiveSolid('sphere')}
              className={actionBtnClass}
            >
              <Circle className="w-3.5 h-3.5 text-sky-400" />
              <span>Küre</span>
            </button>

            <button
              onClick={() => setSheetMetalBarOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/40 flex items-center gap-1.5 transition"
            >
              <Sheet className="w-3.5 h-3.5" />
              <span>Sac Metal & DXF Açınım</span>
            </button>

            <button
              onClick={() => setMacrosModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 border border-amber-500/40 flex items-center gap-1.5 transition"
            >
              <Cog className="w-3.5 h-3.5" />
              <span>Dişli / Vida / Yay / Mafsal</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};
