import React, { useState } from 'react';
import {
  Search,
  PencilRuler,
  PlusSquare,
  Compass,
  Move3d,
  Wrench,
  Scissors,
  Crosshair,
  Ruler,
  X,
  Pin,
  Trash2,
  Check,
  FlipHorizontal2,
  Scaling,
  Layers,
  Box,
  Cog,
  Image as ImageIcon,
} from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import {
  ActiveTool,
  ConstructionAxisType,
  ConstructionPlaneType,
} from '../../types/cad';

type MainCategory = 'sketch' | 'insert' | 'construct' | 'transform' | 'tools' | null;

export const ShaprLeftMainMenu: React.FC = () => {
  const [openMenu, setOpenMenu] = useState<MainCategory>(null);
  const [planeOffsetMm, setPlaneOffsetMm] = useState(25);
  const [planeAngleDeg, setPlaneAngleDeg] = useState(45);
  const [scaleVal, setScaleVal] = useState(1.25);
  const [scaleCopy, setScaleCopy] = useState(false);
  const [translateVec, setTranslateVec] = useState<[number, number, number]>([25, 0, 0]);
  const [translateCopy, setTranslateCopy] = useState(false);
  const [helicalAngle, setHelicalAngle] = useState(360);
  const [helicalPitch, setHelicalPitch] = useState(12);

  const activeWorkspace = useCADStore((s) => s.activeWorkspace);
  const activeTool = useCADStore((s) => s.activeTool);
  const setActiveTool = useCADStore((s) => s.setActiveTool);
  const activeSketchId = useCADStore((s) => s.activeSketchId);
  const startSketchOnSelectionOrPlane = useCADStore(
    (s) => s.startSketchOnSelectionOrPlane
  );
  const finishActiveSketch = useCADStore((s) => s.finishActiveSketch);

  const setCommandPaletteOpen = useCADStore((s) => s.setCommandPaletteOpen);
  const setMacrosModalOpen = useCADStore((s) => s.setMacrosModalOpen);
  const setHoleWizardModalOpen = useCADStore((s) => s.setHoleWizardModalOpen);
  const setSheetMetalBarOpen = useCADStore((s) => s.setSheetMetalBarOpen);

  // Sketch Advanced
  const addSlotToActiveSketch = useCADStore((s) => s.addSlotToActiveSketch);
  const addConicToActiveSketch = useCADStore((s) => s.addConicToActiveSketch);
  const addSpiralToActiveSketch = useCADStore((s) => s.addSpiralToActiveSketch);
  const addEquationCurveToActiveSketch = useCADStore(
    (s) => s.addEquationCurveToActiveSketch
  );
  const addVectorTextToActiveSketch = useCADStore(
    (s) => s.addVectorTextToActiveSketch
  );
  const applySketchCornerFilletOrChamfer = useCADStore(
    (s) => s.applySketchCornerFilletOrChamfer
  );
  const splitSelectedSketchCurve = useCADStore((s) => s.splitSelectedSketchCurve);
  const projectIntersectionCurveToActiveSketch = useCADStore(
    (s) => s.projectIntersectionCurveToActiveSketch
  );

  // Construct & Transform
  const addPrimitiveSolid = useCADStore((s) => s.addPrimitiveSolid);
  const addReferenceCanvas = useCADStore((s) => s.addReferenceCanvas);
  const addConstructionPlane = useCADStore((s) => s.addConstructionPlane);
  const addConstructionAxis = useCADStore((s) => s.addConstructionAxis);
  const commitAlignBodies = useCADStore((s) => s.commitAlignBodies);
  const commitScaleBody = useCADStore((s) => s.commitScaleBody);
  const commitTranslateBody = useCADStore((s) => s.commitTranslateBody);
  const commitMirrorBody = useCADStore((s) => s.commitMirrorBody);
  const commitLinearPattern = useCADStore((s) => s.commitLinearPattern);
  const commitCircularPattern = useCADStore((s) => s.commitCircularPattern);

  // 3D Tools
  const commitExtrude = useCADStore((s) => s.commitExtrude);
  const commitHelicalRevolve = useCADStore((s) => s.commitHelicalRevolve);
  const commitSweep = useCADStore((s) => s.commitSweep);
  const commitLoft = useCADStore((s) => s.commitLoft);
  const commitShell = useCADStore((s) => s.commitShell);
  const commitFilletChamfer = useCADStore((s) => s.commitFilletChamfer);
  const commitVariableRadiusFillet = useCADStore((s) => s.commitVariableRadiusFillet);
  const commitBoolean = useCADStore((s) => s.commitBoolean);
  const commitSplitBody = useCADStore((s) => s.commitSplitBody);
  const commitDeleteAndHealFaces = useCADStore((s) => s.commitDeleteAndHealFaces);
  const commitReplaceFace = useCADStore((s) => s.commitReplaceFace);
  const commitBridgeFaces = useCADStore((s) => s.commitBridgeFaces);
  const commitEmbossOrDebossText = useCADStore((s) => s.commitEmbossOrDebossText);
  const commitBoundaryPatchSurface = useCADStore((s) => s.commitBoundaryPatchSurface);
  const commitThickenSurface = useCADStore((s) => s.commitThickenSurface);

  // Bottom-Left Shapr3D Modes (Section, Isolate, Measure)
  const sectionViewEnabled = useCADStore((s) => s.sectionViewEnabled);
  const toggleSectionView = useCADStore((s) => s.toggleSectionView);
  const isolateModeActive = useCADStore((s) => s.isolateModeActive);
  const toggleIsolateMode = useCADStore((s) => s.toggleIsolateMode);
  const measureModeActive = useCADStore((s) => s.measureModeActive);
  const toggleMeasureMode = useCADStore((s) => s.toggleMeasureMode);
  const pinnedMeasurements = useCADStore((s) => s.pinnedMeasurements);
  const pinCurrentMeasurement = useCADStore((s) => s.pinCurrentMeasurement);
  const removePinnedMeasurement = useCADStore((s) => s.removePinnedMeasurement);
  const clearPinnedMeasurements = useCADStore((s) => s.clearPinnedMeasurements);

  if (activeWorkspace !== 'modeling') return null;

  const toggleCategory = (cat: MainCategory) => {
    setOpenMenu((prev) => (prev === cat ? null : cat));
  };

  const selectSketchTool = (tool: ActiveTool) => {
    if (!activeSketchId) {
      startSketchOnSelectionOrPlane();
    }
    setActiveTool(tool);
    setOpenMenu(null);
  };

  return (
    <>
      {/* ===================================================================== */}
      {/* AUTHENTIC SHAPR3D LEFT VERTICAL MAIN MENU RAIL                        */}
      {/* ===================================================================== */}
      <div className="fixed left-3 top-1/2 -translate-y-1/2 z-30 flex items-center gap-2 pointer-events-auto select-none">
        <div className="flex flex-col items-center gap-1.5 p-1.5 rounded-2xl bg-[#111622]/95 border border-slate-700/80 backdrop-blur-xl shadow-2xl">
          {/* 1. Search */}
          <button
            onClick={() => {
              setOpenMenu(null);
              setCommandPaletteOpen(true);
            }}
            className="w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 text-slate-300 hover:text-white hover:bg-slate-800/90 transition"
            title="Komut Ara (Search / Ctrl+K)"
          >
            <Search className="w-4 h-4 text-sky-400" />
            <span className="text-[9px] font-semibold tracking-tight">Ara</span>
          </button>

          <div className="w-8 h-px bg-slate-800 my-0.5" />

          {/* 2. Sketch */}
          <button
            onClick={() => toggleCategory('sketch')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition ${
              openMenu === 'sketch' || activeSketchId
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
            }`}
            title="Eskiz Menüsü (Sketch)"
          >
            <PencilRuler className="w-4 h-4" />
            <span className="text-[9px] font-semibold tracking-tight">Eskiz</span>
          </button>

          {/* 3. Insert / Add */}
          <button
            onClick={() => toggleCategory('insert')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition ${
              openMenu === 'insert'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
            }`}
            title="Ekle Menüsü (Add / Insert)"
          >
            <PlusSquare className="w-4 h-4" />
            <span className="text-[9px] font-semibold tracking-tight">Ekle</span>
          </button>

          {/* 4. Construct */}
          <button
            onClick={() => toggleCategory('construct')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition ${
              openMenu === 'construct'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
            }`}
            title="Yardımcı Düzlem & Eksen (Construct)"
          >
            <Compass className="w-4 h-4" />
            <span className="text-[9px] font-semibold tracking-tight">Düzlem</span>
          </button>

          {/* 5. Transform */}
          <button
            onClick={() => toggleCategory('transform')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition ${
              openMenu === 'transform'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
            }`}
            title="Dönüştür & Hizala (Transform)"
          >
            <Move3d className="w-4 h-4" />
            <span className="text-[9px] font-semibold tracking-tight">Taşı</span>
          </button>

          {/* 6. Tools */}
          <button
            onClick={() => toggleCategory('tools')}
            className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition ${
              openMenu === 'tools'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/90'
            }`}
            title="3B Katı & Yüzey Araçları (Tools)"
          >
            <Wrench className="w-4 h-4" />
            <span className="text-[9px] font-semibold tracking-tight">Araçlar</span>
          </button>
        </div>

        {/* =================================================================== */}
        {/* FLYOUT SUB-MENUS (SHAPR3D POPOVER CARDS)                            */}
        {/* =================================================================== */}
        {openMenu && (
          <div className="w-80 max-h-[78vh] overflow-y-auto rounded-2xl bg-[#111622]/95 border border-slate-700/90 backdrop-blur-xl shadow-2xl p-3 text-xs text-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-sky-400 uppercase tracking-wider text-[11px]">
                {openMenu === 'sketch' && 'Shapr3D Eskiz (Sketch) Araçları'}
                {openMenu === 'insert' && 'Ekle: Referans Görsel & Hazır Gövde'}
                {openMenu === 'construct' && 'Yardımcı Düzlem & Eksen (Construct)'}
                {openMenu === 'transform' && 'Dönüştür, Hizala & Çoğalt (Transform)'}
                {openMenu === 'tools' && '3B Katı & Yüzey Modelleme (Tools)'}
              </span>
              <button
                onClick={() => setOpenMenu(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* --------------------------------------------------------------- */}
            {/* 1. SKETCH FLYOUT                                                */}
            {/* --------------------------------------------------------------- */}
            {openMenu === 'sketch' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => {
                      startSketchOnSelectionOrPlane();
                      setOpenMenu(null);
                    }}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-center"
                  >
                    + Yüzeyde Eskiz Başlat
                  </button>
                  {activeSketchId && (
                    <button
                      onClick={() => {
                        finishActiveSketch();
                        setOpenMenu(null);
                      }}
                      className="py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5" /> Bitir
                    </button>
                  )}
                </div>

                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Temel Çizim Elemanları
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['sketch_line', 'Çizgi (Line)'],
                      ['sketch_arc', '3-Nokta Yay (Arc)'],
                      ['sketch_circle', 'Merkez Daire (Circle)'],
                      ['sketch_rect', 'Dikdörtgen (Rect)'],
                      ['sketch_polygon', 'Çokgen (Polygon)'],
                      ['sketch_spline', 'Kontrol Spline (Fit)'],
                    ] as [ActiveTool, string][]
                  ).map(([t, label]) => (
                    <button
                      key={t}
                      onClick={() => selectSketchTool(t)}
                      className={`px-2.5 py-1.5 rounded-xl border text-left transition ${
                        activeTool === t
                          ? 'bg-sky-600/30 border-sky-500 text-white font-semibold'
                          : 'bg-slate-900/90 border-slate-800 hover:border-sky-500/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Gelişmiş Shapr3D Eğrileri & Yuvalar
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      addSlotToActiveSketch(12, 36);
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Düz Yuva (Slot)
                  </button>
                  <button
                    onClick={() => {
                      addConicToActiveSketch(0.65);
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Konik Eğri (ρ=0.65)
                  </button>
                  <button
                    onClick={() => {
                      addSpiralToActiveSketch(3, 28);
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Arşimet Spiral / Helis
                  </button>
                  <button
                    onClick={() => {
                      addEquationCurveToActiveSketch();
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Denklem Eğrisi y=f(x)
                  </button>
                  <button
                    onClick={() => {
                      addVectorTextToActiveSketch('SHAPR-PRO', 10);
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Vektörel Metin (Text)
                  </button>
                  <button
                    onClick={() => {
                      projectIntersectionCurveToActiveSketch();
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Yüzeyi Eskize Yansıt
                  </button>
                </div>

                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Eskiz Düzenleme (Trim, Offset, Fillet, Split)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => selectSketchTool('sketch_trim')}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-amber-600/30 border border-slate-800 text-left"
                  >
                    Buda (Trim Curve)
                  </button>
                  <button
                    onClick={() => selectSketchTool('sketch_offset')}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-amber-600/30 border border-slate-800 text-left"
                  >
                    Ötele (Offset Loop)
                  </button>
                  <button
                    onClick={() => {
                      applySketchCornerFilletOrChamfer('fillet', 4);
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-amber-600/30 border border-slate-800 text-left"
                  >
                    Köşe Radyusu (R4)
                  </button>
                  <button
                    onClick={() => {
                      splitSelectedSketchCurve();
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-amber-600/30 border border-slate-800 text-left"
                  >
                    Eğriyi İkiye Böl (Split)
                  </button>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* 2. INSERT / ADD FLYOUT                                          */}
            {/* --------------------------------------------------------------- */}
            {openMenu === 'insert' && (
              <div className="space-y-2.5">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Temel 3B Katı Primitifler
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['box', 'Kutu (Box)'],
                      ['cylinder', 'Silindir (Cylinder)'],
                      ['sphere', 'Küre (Sphere)'],
                      ['torus', 'Halka (Torus)'],
                    ] as const
                  ).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => {
                        addPrimitiveSolid(type);
                        setOpenMenu(null);
                      }}
                      className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 flex items-center gap-1.5 text-left"
                    >
                      <Box className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Referans Görsel & Standart Makine Elemanları
                </div>
                <button
                  onClick={() => {
                    addReferenceCanvas(
                      'Teknik_Altlik_Blueprint',
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="%230f172a"/><circle cx="200" cy="150" r="90" stroke="%2338bdf8" stroke-width="3" fill="none"/></svg>',
                      'XY'
                    );
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 flex items-center gap-2 text-left"
                >
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold">Referans Resim / Blueprint Ekle</div>
                    <div className="text-[10px] text-slate-400">
                      XY/XZ/YZ düzlemine 2 noktalı kalibre edilebilir altlık
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setMacrosModalOpen(true);
                    setOpenMenu(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 flex items-center gap-2 text-left text-amber-200"
                >
                  <Cog className="w-4 h-4 text-amber-400" />
                  <div>
                    <div className="font-semibold">ISO Makine Elemanı Üreteci</div>
                    <div className="text-[10px] text-amber-300/80">
                      Evolvent Dişli, M3-M20 Cıvata/Somun, Helisel Yay, Mafsal
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* 3. CONSTRUCT (PLANES & AXES) FLYOUT                             */}
            {/* --------------------------------------------------------------- */}
            {openMenu === 'construct' && (
              <div className="space-y-3">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Öteleme Mesafesi (Offset):</span>
                    <input
                      type="number"
                      value={planeOffsetMm}
                      onChange={(e) => setPlaneOffsetMm(Number(e.target.value))}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right text-sky-300"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Eğim Açısı (Angle °):</span>
                    <input
                      type="number"
                      value={planeAngleDeg}
                      onChange={(e) => setPlaneAngleDeg(Number(e.target.value))}
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono text-right text-amber-300"
                    />
                  </div>
                </div>

                <div className="text-[10px] font-bold uppercase text-slate-400">
                  6 Tip Yardımcı İnşa Düzlemi (Construction Plane)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['offset', 'Öteleme (Offset Plane)', planeOffsetMm],
                      ['midplane', 'Orta Düzlem (Midplane)', 0],
                      ['angle', 'Kenarda Açılı (Angle)', planeAngleDeg],
                      ['three_points', '3 Noktadan Düzlem', 0],
                      ['tangent', 'Silindire Teğet Düzlem', 0],
                      ['perp_curve', 'Eğriye Dik (Sweep)', 0],
                    ] as [ConstructionPlaneType, string, number][]
                  ).map(([type, label, val]) => (
                    <button
                      key={type}
                      onClick={() => {
                        addConstructionPlane(type, val);
                        setOpenMenu(null);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="text-[10px] font-bold uppercase text-slate-400">
                  4 Tip Yardımcı İnşa Ekseni (Construction Axis)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      ['cylinder_center', 'Silindir/Koni Ekseni'],
                      ['two_points', '2 Noktadan Eksen'],
                      ['plane_intersection', '2 Düzlem Kesişimi'],
                      ['face_normal', 'Yüzey Normali Ekseni'],
                    ] as [ConstructionAxisType, string][]
                  ).map(([type, label]) => (
                    <button
                      key={type}
                      onClick={() => {
                        addConstructionAxis(type);
                        setOpenMenu(null);
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-amber-600/30 border border-slate-800 text-left"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* 4. TRANSFORM FLYOUT (MOVE/ROTATE, ALIGN, SCALE, TRANSLATE)      */}
            {/* --------------------------------------------------------------- */}
            {openMenu === 'transform' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      setActiveTool('move_rotate');
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-2 rounded-xl bg-sky-600/25 border border-sky-500/60 text-sky-200 font-semibold text-left"
                  >
                    ✥ Move / Rotate Gizmo
                  </button>
                  <button
                    onClick={() => {
                      commitAlignBodies(false);
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-2 rounded-xl bg-emerald-600/25 border border-emerald-500/60 text-emerald-200 font-semibold text-left"
                  >
                    ↹ Yüzeye Hizala (Align)
                  </button>
                </div>

                {/* Scale Card */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200 flex items-center gap-1">
                      <Scaling className="w-3.5 h-3.5 text-sky-400" /> Ölçekle (Scale)
                    </span>
                    <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scaleCopy}
                        onChange={(e) => setScaleCopy(e.target.checked)}
                      />
                      Kopya Oluştur
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step={0.1}
                      min={0.1}
                      max={10}
                      value={scaleVal}
                      onChange={(e) => setScaleVal(Number(e.target.value))}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 font-mono text-xs text-white"
                    />
                    <button
                      onClick={() => {
                        commitScaleBody(scaleVal, undefined, scaleCopy);
                        setOpenMenu(null);
                      }}
                      className="px-3 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold"
                    >
                      Uygula
                    </button>
                  </div>
                </div>

                {/* Translate Card */}
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">
                      Noktadan Noktaya Taşı (Translate ΔXYZ)
                    </span>
                    <label className="flex items-center gap-1 text-[10px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={translateCopy}
                        onChange={(e) => setTranslateCopy(e.target.checked)}
                      />
                      Kopya
                    </label>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {(['X', 'Y', 'Z'] as const).map((ax, i) => (
                      <input
                        key={ax}
                        type="number"
                        value={translateVec[i]}
                        onChange={(e) => {
                          const next: [number, number, number] = [...translateVec];
                          next[i] = Number(e.target.value);
                          setTranslateVec(next);
                        }}
                        placeholder={ax}
                        className="bg-slate-900 border border-slate-700 rounded px-1.5 py-1 font-mono text-center text-[11px]"
                      />
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      commitTranslateBody(translateVec, translateCopy);
                      setOpenMenu(null);
                    }}
                    className="w-full py-1 rounded-lg bg-slate-800 hover:bg-sky-600 text-white font-semibold transition"
                  >
                    Vektörel Taşı
                  </button>
                </div>

                {/* Mirror & Pattern */}
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => {
                      commitMirrorBody();
                      setOpenMenu(null);
                    }}
                    className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 flex items-center justify-center gap-1"
                  >
                    <FlipHorizontal2 className="w-3.5 h-3.5 text-sky-400" /> Aynala
                  </button>
                  <button
                    onClick={() => {
                      commitLinearPattern(3, 35);
                      setOpenMenu(null);
                    }}
                    className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-center"
                  >
                    Doğrusal Dizi
                  </button>
                  <button
                    onClick={() => {
                      commitCircularPattern(6);
                      setOpenMenu(null);
                    }}
                    className="px-2 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-center"
                  >
                    Dairesel Dizi
                  </button>
                </div>
              </div>
            )}

            {/* --------------------------------------------------------------- */}
            {/* 5. TOOLS FLYOUT (EXTRUDE, REVOLVE, SWEEP, LOFT, SHELL, BOOLEAN) */}
            {/* --------------------------------------------------------------- */}
            {openMenu === 'tools' && (
              <div className="space-y-2.5">
                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Birincil Katı Oluşturma (Sweep, Loft, Extrude, Revolve)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      commitExtrude();
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-sky-600/25 border border-sky-500/60 text-sky-200 font-semibold text-left"
                  >
                    Extrude (Katılaştır)
                  </button>
                  <button
                    onClick={() => {
                      commitSweep();
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Sweep (Yol Boyunca)
                  </button>
                  <button
                    onClick={() => {
                      commitLoft();
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Loft (Kesitler Arası G2)
                  </button>
                  <button
                    onClick={() => {
                      commitShell();
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Shell (Kabuk Boşalt)
                  </button>
                </div>

                {/* Helical Revolve Mini Card */}
                <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-amber-400">
                    Revolve & Helisel Yükselti (Yay / Vida Kanalı)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Açı (°)</span>
                      <input
                        type="number"
                        value={helicalAngle}
                        onChange={(e) => setHelicalAngle(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        Yükselti (Elevation mm)
                      </span>
                      <input
                        type="number"
                        value={helicalPitch}
                        onChange={(e) => setHelicalPitch(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-0.5 font-mono"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      commitHelicalRevolve(helicalAngle, helicalPitch);
                      setOpenMenu(null);
                    }}
                    className="w-full py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold"
                  >
                    Helisel Revolve Uygula
                  </button>
                </div>

                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Kenar, Yüzey (Direct Modeling) & Boolean İşlemleri
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      commitFilletChamfer();
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Fillet / Chamfer
                  </button>
                  <button
                    onClick={() => {
                      commitVariableRadiusFillet(2, 6, 2, false);
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Değişken Fillet (R2-R6)
                  </button>
                  <button
                    onClick={() => {
                      commitDeleteAndHealFaces();
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-600/30 border border-slate-800 text-left"
                  >
                    Yüzeyi Sil & Onar (Heal)
                  </button>
                  <button
                    onClick={() => {
                      commitReplaceFace();
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Yüzeyi Değiştir (Replace)
                  </button>
                  <button
                    onClick={() => {
                      commitBridgeFaces(1.0, 'G2');
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Yüzey Köprüle (Bridge)
                  </button>
                  <button
                    onClick={() => {
                      commitEmbossOrDebossText('SHAPR3D', 1.8, 'emboss');
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Kabartma Yazı (Emboss)
                  </button>
                  <button
                    onClick={() => {
                      commitBoolean('union');
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-600/30 border border-emerald-700/50 text-emerald-300 text-left"
                  >
                    Birleştir (Union)
                  </button>
                  <button
                    onClick={() => {
                      commitBoolean('subtract');
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-600/30 border border-rose-700/50 text-rose-300 text-left"
                  >
                    Çıkar (Subtract)
                  </button>
                  <button
                    onClick={() => {
                      commitBoolean('intersect');
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-950/60 hover:bg-amber-600/30 border border-amber-700/50 text-amber-300 text-left"
                  >
                    Kesişim (Intersect)
                  </button>
                  <button
                    onClick={() => {
                      commitSplitBody();
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-sky-600/30 border border-slate-800 text-left"
                  >
                    Gövdeyi Böl (Split Body)
                  </button>
                </div>

                <div className="text-[10px] font-bold uppercase text-slate-400">
                  Yüzey Yaması, ISO Delik Sihirbazı & Sac Metal
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      commitBoundaryPatchSurface(4.5);
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-cyan-600/30 border border-slate-800 text-left"
                  >
                    Sınır Yüzey Yaması (Fill)
                  </button>
                  <button
                    onClick={() => {
                      commitThickenSurface(2.5);
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-cyan-600/30 border border-slate-800 text-left"
                  >
                    Yüzeye Kalınlık Ver
                  </button>
                  <button
                    onClick={() => {
                      setHoleWizardModalOpen(true);
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-semibold text-left"
                  >
                    ISO Delik Sihirbazı
                  </button>
                  <button
                    onClick={() => {
                      setSheetMetalBarOpen(true);
                      setOpenMenu(null);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-semibold text-left"
                  >
                    Sac Metal & DXF Açınım
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===================================================================== */}
      {/* AUTHENTIC SHAPR3D BOTTOM-LEFT MODES BAR (SECTION, ISOLATE, MEASURE)   */}
      {/* ===================================================================== */}
      <div className="fixed left-3 bottom-11 z-30 flex flex-col gap-2 pointer-events-auto select-none">
        {/* Pinned Measurements Floating Card (when Measure Mode is active) */}
        {measureModeActive && (
          <div className="w-72 rounded-2xl bg-[#111622]/95 border border-amber-500/50 backdrop-blur-xl shadow-2xl p-3 text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="font-bold text-amber-400 flex items-center gap-1.5">
                <Ruler className="w-3.5 h-3.5" />
                Shapr3D Ölçüm & Sabitlenenler
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() =>
                    pinCurrentMeasurement(
                      `Ölçüm #${pinnedMeasurements.length + 1}`,
                      '28.50 mm',
                      'distance'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold flex items-center gap-1"
                  title="Mevcut Seçim Ölçümünü Sabitle"
                >
                  <Pin className="w-3 h-3" /> Sabitle
                </button>
                {pinnedMeasurements.length > 0 && (
                  <button
                    onClick={clearPinnedMeasurements}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-rose-400"
                    title="Tümünü Temizle"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1 max-h-36 overflow-y-auto">
              {pinnedMeasurements.length === 0 ? (
                <div className="text-[11px] text-slate-400 py-1">
                  İki yüzeye, kenara veya noktaya dokunarak mesafe, açı ve çap ölçün.
                </div>
              ) : (
                pinnedMeasurements.map((m) => (
                  <div
                    key={m.id}
                    className="px-2 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between"
                  >
                    <span className="text-slate-300 truncate mr-2">{m.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono font-bold text-amber-300">
                        {m.valueStr}
                      </span>
                      <button
                        onClick={() => removePinnedMeasurement(m.id)}
                        className="text-slate-500 hover:text-rose-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Bottom-Left Pill: Section View | Isolate | Measure */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-[#111622]/95 border border-slate-700/80 backdrop-blur-xl shadow-2xl">
          <button
            onClick={toggleSectionView}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              sectionViewEnabled
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Kesit Görünümü (Section View)"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Kesit</span>
          </button>

          <button
            onClick={toggleIsolateMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              isolateModeActive
                ? 'bg-sky-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Seçili Gövdeyi İzole Et (Isolate Mode)"
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>İzole</span>
          </button>

          <button
            onClick={toggleMeasureMode}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              measureModeActive
                ? 'bg-amber-500 text-slate-950 font-bold shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
            title="Hassas Ölçüm Modu (Measure Mode)"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Ölçüm</span>
          </button>

          <button
            onClick={() => useCADStore.getState().setItemsDrawerOpen(true)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-1 xl:hidden"
            title="Unsur Ağacını Aç (Items)"
          >
            <Layers className="w-3.5 h-3.5 text-sky-400" />
          </button>
        </div>
      </div>
    </>
  );
};
