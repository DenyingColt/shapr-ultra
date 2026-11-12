import React, { useEffect, useMemo, useState } from 'react';
import {
  Command,
  Search,
  Sparkles,
  Wrench,
  Layers,
  Scissors,
  Box,
  PencilRuler,
  Eye,
  X,
} from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';

interface CommandItem {
  id: string;
  title: string;
  category:
    | '2B/3B Eskiz'
    | 'Doğrudan Modelleme (Plasticity)'
    | 'Kutu & Mekanik'
    | 'Yüzey (Surface)'
    | 'Sac Metal'
    | 'Montaj & Analiz'
    | 'Görünüm & Metrology';
  shortcut?: string;
  keywords: string;
  execute: () => void;
}

export const CommandPalette: React.FC = () => {
  const isCommandPaletteOpen = useCADStore((s) => s.isCommandPaletteOpen);
  const setCommandPaletteOpen = useCADStore((s) => s.setCommandPaletteOpen);

  const setActiveTool = useCADStore((s) => s.setActiveTool);
  const startSketchOnSelectionOrPlane = useCADStore((s) => s.startSketchOnSelectionOrPlane);
  const addSlotToActiveSketch = useCADStore((s) => s.addSlotToActiveSketch);
  const addConicToActiveSketch = useCADStore((s) => s.addConicToActiveSketch);
  const addSpiralToActiveSketch = useCADStore((s) => s.addSpiralToActiveSketch);
  const addEquationCurveToActiveSketch = useCADStore((s) => s.addEquationCurveToActiveSketch);
  const addVectorTextToActiveSketch = useCADStore((s) => s.addVectorTextToActiveSketch);
  const applySketchCornerFilletOrChamfer = useCADStore(
    (s) => s.applySketchCornerFilletOrChamfer
  );
  const splitSelectedSketchCurve = useCADStore((s) => s.splitSelectedSketchCurve);
  const projectIntersectionCurveToActiveSketch = useCADStore(
    (s) => s.projectIntersectionCurveToActiveSketch
  );

  const commitDeleteAndHealFaces = useCADStore((s) => s.commitDeleteAndHealFaces);
  const commitVariableRadiusFillet = useCADStore((s) => s.commitVariableRadiusFillet);
  const commitReplaceFace = useCADStore((s) => s.commitReplaceFace);
  const commitBridgeFaces = useCADStore((s) => s.commitBridgeFaces);
  const commitEmbossOrDebossText = useCADStore((s) => s.commitEmbossOrDebossText);

  const setHoleWizardModalOpen = useCADStore((s) => s.setHoleWizardModalOpen);
  const commitStructuralRib = useCADStore((s) => s.commitStructuralRib);
  const commitMountingBoss = useCADStore((s) => s.commitMountingBoss);
  const commitEnclosureLipGroove = useCADStore((s) => s.commitEnclosureLipGroove);

  const commitExtrudeAsSurface = useCADStore((s) => s.commitExtrudeAsSurface);
  const commitBoundaryPatchSurface = useCADStore((s) => s.commitBoundaryPatchSurface);
  const commitOffsetSurface = useCADStore((s) => s.commitOffsetSurface);
  const commitThickenSurface = useCADStore((s) => s.commitThickenSurface);
  const commitStitchSurfaces = useCADStore((s) => s.commitStitchSurfaces);

  const setSheetMetalBarOpen = useCADStore((s) => s.setSheetMetalBarOpen);
  const commitSheetMetalBaseFlange = useCADStore((s) => s.commitSheetMetalBaseFlange);
  const commitSheetMetalEdgeFlange = useCADStore((s) => s.commitSheetMetalEdgeFlange);
  const commitSheetMetalHem = useCADStore((s) => s.commitSheetMetalHem);
  const generateSheetMetalFlatPattern = useCADStore((s) => s.generateSheetMetalFlatPattern);

  const runAssemblyInterferenceCheck = useCADStore((s) => s.runAssemblyInterferenceCheck);
  const setExplosionFactor = useCADStore((s) => s.setExplosionFactor);
  const setVisualStyle = useCADStore((s) => s.setVisualStyle);
  const selectCoplanarFaces = useCADStore((s) => s.selectCoplanarFaces);
  const selectEqualRadiusFaces = useCADStore((s) => s.selectEqualRadiusFaces);
  const selectTangentFaceChain = useCADStore((s) => s.selectTangentFaceChain);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = useMemo<CommandItem[]>(
    () => [
      // 1. Advanced Sketching
      {
        id: 'cmd_sketch_new',
        title: 'Yeni 2B Eskiz Başlat (Sketch on Plane/Face)',
        category: '2B/3B Eskiz',
        shortcut: 'S',
        keywords: 'sketch eskiz 2d plane cizim',
        execute: () => startSketchOnSelectionOrPlane(),
      },
      {
        id: 'cmd_sketch_slot',
        title: 'Düz & Yay Yuva Çiz (Center-to-Center Slot Tool)',
        category: '2B/3B Eskiz',
        keywords: 'slot yuva kanal oval',
        execute: () => {
          if (!useCADStore.getState().activeSketchId) startSketchOnSelectionOrPlane();
          addSlotToActiveSketch(12, 38);
        },
      },
      {
        id: 'cmd_sketch_conic',
        title: 'Konik Eğri (Conic Curve ρ=0.60 Parabol/Hiperbol)',
        category: '2B/3B Eskiz',
        keywords: 'conic konik rho bezier',
        execute: () => {
          if (!useCADStore.getState().activeSketchId) startSketchOnSelectionOrPlane();
          addConicToActiveSketch(0.6);
        },
      },
      {
        id: 'cmd_sketch_spiral',
        title: 'Arşimet Spirali & Helis (Archimedean Spiral)',
        category: '2B/3B Eskiz',
        keywords: 'spiral helis yay coil',
        execute: () => {
          if (!useCADStore.getState().activeSketchId) startSketchOnSelectionOrPlane();
          addSpiralToActiveSketch(3.5, 26);
        },
      },
      {
        id: 'cmd_sketch_eq',
        title: 'Denklem Eğrisi (Equation Curve x(t), y(t) Kam Profili)',
        category: '2B/3B Eskiz',
        keywords: 'equation denklem matematik sin cos cam',
        execute: () => {
          if (!useCADStore.getState().activeSketchId) startSketchOnSelectionOrPlane();
          addEquationCurveToActiveSketch();
        },
      },
      {
        id: 'cmd_sketch_text',
        title: 'Vektörel Metin & Yay Üzeri Yazı (TrueType Vector Text)',
        category: '2B/3B Eskiz',
        keywords: 'text yazi font harf metin',
        execute: () => {
          if (!useCADStore.getState().activeSketchId) startSketchOnSelectionOrPlane();
          addVectorTextToActiveSketch('SHAPR', 12, 0);
        },
      },
      {
        id: 'cmd_sketch_fillet',
        title: '2B Eskiz Köşe Yuvarlatma (Sketch Fillet)',
        category: '2B/3B Eskiz',
        keywords: 'sketch fillet 2d kose radyus',
        execute: () => applySketchCornerFilletOrChamfer('fillet', 5),
      },
      {
        id: 'cmd_sketch_split',
        title: 'Eğriyi Noktadan İkiye Böl (Split Curve)',
        category: '2B/3B Eskiz',
        keywords: 'split curve bol parcala',
        execute: () => splitSelectedSketchCurve(),
      },
      {
        id: 'cmd_sketch_inter',
        title: '3B Gövde Kesişim Eğrisi Yansıt (Intersection Curve)',
        category: '2B/3B Eskiz',
        keywords: 'intersection project kesisim yansit',
        execute: () => projectIntersectionCurveToActiveSketch(),
      },

      // 2. Direct Modeling (Plasticity / Shapr3D)
      {
        id: 'cmd_delete_heal',
        title: 'Yüzeyi Sil ve Katıyı Onar (Delete Face & Heal)',
        category: 'Doğrudan Modelleme (Plasticity)',
        shortcut: 'Del',
        keywords: 'delete face heal delik kapat sil onar plasticity',
        execute: () => commitDeleteAndHealFaces(),
      },
      {
        id: 'cmd_var_fillet',
        title: 'Değişken Radyüslü Fillet (Variable Radius Fillet R1→R2→R3)',
        category: 'Doğrudan Modelleme (Plasticity)',
        shortcut: 'V',
        keywords: 'variable fillet chordal degisken radyus',
        execute: () => setActiveTool('variable_fillet'),
      },
      {
        id: 'cmd_replace_face',
        title: 'Yüzeyi Hedef Yüzeye Hizala (Replace / Match Face)',
        category: 'Doğrudan Modelleme (Plasticity)',
        keywords: 'replace match face yuzey degistir',
        execute: () => commitReplaceFace(),
      },
      {
        id: 'cmd_bridge_faces',
        title: 'G2 Süreklilikte Katı Köprü (Bridge / Loft Faces G0/G1/G2)',
        category: 'Doğrudan Modelleme (Plasticity)',
        keywords: 'bridge loft g2 continuity kopru',
        execute: () => setActiveTool('bridge_faces'),
      },
      {
        id: 'cmd_emboss_text',
        title: '3B Yüzeye Metin Kabartma / Kazıma (Emboss & Deboss on Face)',
        category: 'Doğrudan Modelleme (Plasticity)',
        keywords: 'emboss deboss engrave kabartma kazima yazi',
        execute: () => setActiveTool('emboss_deboss'),
      },
      {
        id: 'cmd_extrude',
        title: '3B Ekstrüzyon & Otomatik Boolean (Extrude)',
        category: 'Doğrudan Modelleme (Plasticity)',
        shortcut: 'E',
        keywords: 'extrude push pull katilastir',
        execute: () => setActiveTool('extrude'),
      },

      // 3. Enclosure & Mechanical Features
      {
        id: 'cmd_hole_wizard',
        title: 'ISO Metrik Delik Sihirbazı (Hole Wizard M2-M20 Counterbore/Countersink)',
        category: 'Kutu & Mekanik',
        shortcut: 'H',
        keywords: 'hole wizard delik imdatli havsa m3 m4 m5 m6 m8 m10',
        execute: () => setHoleWizardModalOpen(true),
      },
      {
        id: 'cmd_rib_web',
        title: 'Yapısal Takviye Federi Ekle (Rib / Web Stiffener)',
        category: 'Kutu & Mekanik',
        keywords: 'rib web feder destek',
        execute: () => commitStructuralRib(2.5, 14),
      },
      {
        id: 'cmd_mounting_boss',
        title: '4-Kanatlı PCB Vida Burcu Ekle (Mounting Boss + Gussets)',
        category: 'Kutu & Mekanik',
        keywords: 'boss pcb standoff vida burcu gusset',
        execute: () => commitMountingBoss(9.0, 3.2, 15.0),
      },
      {
        id: 'cmd_lip_groove',
        title: 'Geçmeli Kutu Dudak & Kanal (Snap-Fit Lip & Groove)',
        category: 'Kutu & Mekanik',
        keywords: 'lip groove snap fit kutu kapak gecmeli',
        execute: () => commitEnclosureLipGroove('lip', 0.15),
      },

      // 4. Surface Modeling
      {
        id: 'cmd_surf_extrude',
        title: 'Açık Yüzey Ekstrüzyonu (Extrude as Zero-Thickness Surface)',
        category: 'Yüzey (Surface)',
        keywords: 'surface extrude acik yuzey',
        execute: () => commitExtrudeAsSurface(28),
      },
      {
        id: 'cmd_surf_patch',
        title: 'Sınır Yüzey Yaması (Boundary Patch / G1 Dome Fill)',
        category: 'Yüzey (Surface)',
        keywords: 'patch fill boundary yama kubbe',
        execute: () => commitBoundaryPatchSurface(5.0),
      },
      {
        id: 'cmd_surf_offset',
        title: 'Yüzey Öteleme / Kopyalama (Offset / Extract Surface)',
        category: 'Yüzey (Surface)',
        keywords: 'offset extract copy surface',
        execute: () => commitOffsetSurface(4.0),
      },
      {
        id: 'cmd_surf_thicken',
        title: 'Yüzeye Et Kalınlığı Ver -> Katı Gövde (Thicken Surface)',
        category: 'Yüzey (Surface)',
        keywords: 'thicken surface kalinlastir kati',
        execute: () => commitThickenSurface(3.0),
      },
      {
        id: 'cmd_surf_stitch',
        title: 'Açık Yüzeyleri Dik ve Birleştir (Stitch / Knit Surfaces)',
        category: 'Yüzey (Surface)',
        keywords: 'stitch knit birlestir dik',
        execute: () => commitStitchSurfaces(),
      },

      // 5. Sheet Metal
      {
        id: 'cmd_sheet_studio',
        title: 'Sac Metal & Lazer Kesim Açınım Stüdyosu (Sheet Metal Studio)',
        category: 'Sac Metal',
        keywords: 'sheet metal sac bukum dxf flat pattern k-factor',
        execute: () => setSheetMetalBarOpen(true),
      },
      {
        id: 'cmd_sheet_base',
        title: 'Sac Metal Taban Plakası Oluştur (Base Flange)',
        category: 'Sac Metal',
        keywords: 'base flange sac taban',
        execute: () => commitSheetMetalBaseFlange(74, 52),
      },
      {
        id: 'cmd_sheet_flange',
        title: 'Sac Kenar Bükümü Ekle (Edge Flange 90° Bend)',
        category: 'Sac Metal',
        keywords: 'edge flange bend bukum',
        execute: () => commitSheetMetalEdgeFlange('right'),
      },
      {
        id: 'cmd_sheet_hem',
        title: 'Sac 180° Kenar Kıvırma (Rolled Hem)',
        category: 'Sac Metal',
        keywords: 'hem kivirma sac',
        execute: () => commitSheetMetalHem(),
      },
      {
        id: 'cmd_sheet_unfold',
        title: 'Sac Metal Düz Açınım & 1:1 Lazer DXF Üret (Unfold Flat Pattern)',
        category: 'Sac Metal',
        keywords: 'unfold flat pattern acinim dxf lazer',
        execute: () => {
          setSheetMetalBarOpen(true);
          generateSheetMetalFlatPattern();
        },
      },

      // 6. Assemblies & Diagnostics
      {
        id: 'cmd_explode_50',
        title: 'Montajı Otomatik Patlat (%65 Exploded View)',
        category: 'Montaj & Analiz',
        keywords: 'explode patlatilmis gorunum montaj',
        execute: () => setExplosionFactor(0.65),
      },
      {
        id: 'cmd_interference',
        title: 'Montaj Çakışma ve Girişim Analizi (Interference / Clash Check)',
        category: 'Montaj & Analiz',
        keywords: 'interference collision clash cakisma analiz',
        execute: () => runAssemblyInterferenceCheck(),
      },
      {
        id: 'cmd_sel_coplanar',
        title: 'Eş Düzlemli Tüm Yüzeyleri Seç (Select Coplanar Faces)',
        category: 'Montaj & Analiz',
        keywords: 'coplanar es duzlemli yuzey sec',
        execute: () => selectCoplanarFaces(),
      },
      {
        id: 'cmd_sel_radius',
        title: 'Eşit Çaplı Delik ve Yüzeyleri Seç (Select Equal Radius Faces)',
        category: 'Montaj & Analiz',
        keywords: 'equal radius esit cap delik sec',
        execute: () => selectEqualRadiusFaces(),
      },
      {
        id: 'cmd_sel_tangent',
        title: 'Teğet Yüzey Zincirini Seç (Select Tangent Face Chain)',
        category: 'Montaj & Analiz',
        keywords: 'tangent chain teget zincir',
        execute: () => selectTangentFaceChain(),
      },

      // 7. Metrology & Shaders
      {
        id: 'cmd_view_curvature',
        title: 'Gauss / Ortalama Eğrilik Haritası (Curvature Map)',
        category: 'Görünüm & Metrology',
        keywords: 'curvature egrilik analiz',
        execute: () => setVisualStyle('curvature_map'),
      },
      {
        id: 'cmd_view_draft',
        title: 'Kalıp Çıkış Açısı Analizi (Mold Draft Angle Analysis)',
        category: 'Görünüm & Metrology',
        keywords: 'draft angle kalip cikis acisi',
        execute: () => setVisualStyle('draft_analysis'),
      },
      {
        id: 'cmd_view_thickness',
        title: 'Et Kalınlığı Isı Haritası (Wall Thickness Heatmap)',
        category: 'Görünüm & Metrology',
        keywords: 'wall thickness et kalinligi isi haritasi',
        execute: () => setVisualStyle('thickness_heatmap'),
      },
    ],
    [
      startSketchOnSelectionOrPlane,
      addSlotToActiveSketch,
      addConicToActiveSketch,
      addSpiralToActiveSketch,
      addEquationCurveToActiveSketch,
      addVectorTextToActiveSketch,
      applySketchCornerFilletOrChamfer,
      splitSelectedSketchCurve,
      projectIntersectionCurveToActiveSketch,
      commitDeleteAndHealFaces,
      commitVariableRadiusFillet,
      commitReplaceFace,
      commitBridgeFaces,
      commitEmbossOrDebossText,
      setActiveTool,
      setHoleWizardModalOpen,
      commitStructuralRib,
      commitMountingBoss,
      commitEnclosureLipGroove,
      commitExtrudeAsSurface,
      commitBoundaryPatchSurface,
      commitOffsetSurface,
      commitThickenSurface,
      commitStitchSurfaces,
      setSheetMetalBarOpen,
      commitSheetMetalBaseFlange,
      commitSheetMetalEdgeFlange,
      commitSheetMetalHem,
      generateSheetMetalFlatPattern,
      setExplosionFactor,
      runAssemblyInterferenceCheck,
      selectCoplanarFaces,
      selectEqualRadiusFaces,
      selectTangentFaceChain,
      setVisualStyle,
    ]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.keywords.toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query, isCommandPaletteOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
        return;
      }
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }
      if (!isCommandPaletteOpen) return;

      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].execute();
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen, filtered, selectedIndex]);

  if (!isCommandPaletteOpen) return null;

  const getCategoryIcon = (cat: CommandItem['category']) => {
    switch (cat) {
      case '2B/3B Eskiz':
        return <PencilRuler className="w-3.5 h-3.5 text-sky-400" />;
      case 'Doğrudan Modelleme (Plasticity)':
        return <Sparkles className="w-3.5 h-3.5 text-amber-400" />;
      case 'Kutu & Mekanik':
        return <Wrench className="w-3.5 h-3.5 text-emerald-400" />;
      case 'Yüzey (Surface)':
        return <Layers className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Sac Metal':
        return <Scissors className="w-3.5 h-3.5 text-orange-400" />;
      case 'Montaj & Analiz':
        return <Box className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Eye className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/75 backdrop-blur-md p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#0B0E17] border border-sky-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[78vh]"
      >
        {/* Search Input Bar */}
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center gap-3">
          <Search className="w-4 h-4 text-sky-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tüm CAD komutlarında ara (Örn: Slot, Delete Face, Hole Wizard, Sac Metal, G2 Bridge, Curvature...)"
            className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
          />
          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
            Ctrl+K / ESC
          </span>
          <button
            onClick={() => setCommandPaletteOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Command Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.map((cmd, idx) => {
            const active = idx === selectedIndex;
            return (
              <button
                key={cmd.id}
                onMouseEnter={() => setSelectedIndex(idx)}
                onClick={() => {
                  cmd.execute();
                  setCommandPaletteOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-left flex items-center justify-between gap-3 transition ${
                  active
                    ? 'bg-sky-500/20 border border-sky-500/50 text-white'
                    : 'hover:bg-slate-900 border border-transparent text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 shrink-0">
                    {getCategoryIcon(cmd.category)}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold truncate">{cmd.title}</div>
                    <div className="text-[10px] text-slate-400">{cmd.category}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {cmd.shortcut && (
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 font-mono text-[10px] text-sky-300">
                      {cmd.shortcut}
                    </span>
                  )}
                  <span className="text-[10px] text-sky-400 font-semibold">Çalıştır ↵</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div className="py-10 text-center text-xs text-slate-500">
              Eşleşen CAD komutu bulunamadı.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Command className="w-3.5 h-3.5 text-sky-400" />
            <span>SHAPR-PRO + Plasticity + Fusion 360 Evrensel Komut Merkezi ({commands.length} Komut)</span>
          </span>
          <span>↑↓ Gezin • Enter Çalıştır</span>
        </div>
      </div>
    </div>
  );
};
