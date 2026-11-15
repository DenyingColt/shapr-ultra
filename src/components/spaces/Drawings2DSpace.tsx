import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import {
  ArrowLeft,
  Download,
  Eye,
  FileCode2,
  Layers,
  Maximize2,
  Plus,
  Ruler,
  Scissors,
  ZoomIn,
} from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import {
  exportProjectToOpenSCAD,
  exportSketchToDXF,
  triggerBrowserDownload,
} from '../../kernel/fileIO';

interface CustomDrawingAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
}

export const Drawings2DSpace: React.FC = () => {
  const activeWorkspace = useCADStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useCADStore((s) => s.setActiveWorkspace);
  const projectName = useCADStore((s) => s.projectName);
  const bodies = useCADStore((s) => s.bodies);
  const sketches = useCADStore((s) => s.sketches);
  const variables = useCADStore((s) => s.variables);
  const history = useCADStore((s) => s.history);

  const [sheetScale, setSheetScale] = useState<'1:1' | '1:2' | '2:1'>('1:1');
  const [projectionStd, setProjectionStd] = useState<'ISO-E' | 'ANSI'>('ISO-E');
  const [showHiddenLines, setShowHiddenLines] = useState(true);
  const [showSectionAA, setShowSectionAA] = useState(true);
  const [showDetailView, setShowDetailView] = useState(true);
  const [showCenterMarks, setShowCenterMarks] = useState(true);
  const [annotations, setAnnotations] = useState<CustomDrawingAnnotation[]>([
    {
      id: 'note_1',
      text: 'GENEL TOLERANS: ISO 2768-mK • KESKİN KÖŞELER 0.3×45° PAH KIRILACAK',
      x: 52,
      y: 486,
    },
  ]);
  const [newNoteText, setNewNoteText] = useState('YÜZEY PÜRÜZLÜLÜĞÜ Ra 1.6 μm');

  const bbox = useMemo(() => {
    const box = new THREE.Box3();
    for (const b of bodies) {
      if (!b.visible) continue;
      b.geometry.computeBoundingBox();
      if (b.geometry.boundingBox) {
        box.union(b.geometry.boundingBox);
      }
    }
    if (box.isEmpty()) {
      return { width: 90, depth: 56, height: 32, volumeCm3: 42.5 };
    }
    const size = new THREE.Vector3();
    box.getSize(size);
    const totalVol = bodies.reduce((acc, b) => acc + b.topology.volumeMm3, 0);
    return {
      width: Math.max(10, Math.round(size.x * 10) / 10),
      depth: Math.max(10, Math.round(size.y * 10) / 10),
      height: Math.max(8, Math.round(size.z * 10) / 10),
      volumeCm3: Math.round((totalVol / 1000) * 100) / 100,
    };
  }, [bodies]);

  if (activeWorkspace !== 'drawings2d') return null;

  const activeMaterialName = bodies[0]?.material.name || '6061-T6 Alüminyum';

  const handleExportSVG = () => {
    const svgEl = document.getElementById('shapr-2d-drawing-svg');
    if (!svgEl) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgEl);
    triggerBrowserDownload(
      `${projectName.replace(/\s+/g, '_')}_ISO_Drawing.svg`,
      svgStr,
      'image/svg+xml'
    );
  };

  const handleExportDXF = () => {
    if (sketches.length > 0) {
      const dxf = exportSketchToDXF(sketches[sketches.length - 1]);
      triggerBrowserDownload(
        `${projectName.replace(/\s+/g, '_')}_Drawing.dxf`,
        dxf,
        'text/plain'
      );
    }
  };

  const handleExportSCAD = () => {
    const scad = exportProjectToOpenSCAD(projectName, bodies, variables, history);
    triggerBrowserDownload(
      `${projectName.replace(/\s+/g, '_')}.scad`,
      scad,
      'text/plain'
    );
  };

  return (
    <div className="flex-1 flex bg-[#0B0F19] text-slate-100 overflow-hidden select-none z-20">
      {/* Left Shapr3D 2D Drawings Tool Sidebar */}
      <aside className="w-72 bg-[#111622] border-r border-slate-800 p-3 flex flex-col justify-between text-xs shrink-0 overflow-y-auto">
        <div className="space-y-4">
          <button
            onClick={() => setActiveWorkspace('modeling')}
            className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold flex items-center gap-2 transition"
          >
            <ArrowLeft className="w-4 h-4 text-sky-400" />
            <span>3B Modellemeye Dön</span>
          </button>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400 mb-1.5">
              Shapr3D 2B Teknik Resim Ayarları
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">
                  Pafta Ölçeği
                </span>
                <select
                  value={sheetScale}
                  onChange={(e) =>
                    setSheetScale(e.target.value as '1:1' | '1:2' | '2:1')
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 font-mono text-xs"
                >
                  <option value="1:1">Ölçek 1:1</option>
                  <option value="1:2">Ölçek 1:2</option>
                  <option value="2:1">Ölçek 2:1</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block mb-0.5">
                  İzdüşüm Standardı
                </span>
                <select
                  value={projectionStd}
                  onChange={(e) =>
                    setProjectionStd(e.target.value as 'ISO-E' | 'ANSI')
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 font-mono text-xs"
                >
                  <option value="ISO-E">ISO-E (1. Bölge)</option>
                  <option value="ANSI">ANSI (3. Bölge)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Views & Detail / Section Toggles */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-[10px] font-bold uppercase text-slate-400">
              Görünümler, Kesit & Detay Büyüteci
            </div>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Eye className="w-3.5 h-3.5 text-sky-400" /> Görünmez Kenarlar (Kesikli)
              </span>
              <input
                type="checkbox"
                checked={showHiddenLines}
                onChange={(e) => setShowHiddenLines(e.target.checked)}
                className="accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Scissors className="w-3.5 h-3.5 text-amber-400" /> A-A Tam Kesit Görünümü
              </span>
              <input
                type="checkbox"
                checked={showSectionAA}
                onChange={(e) => setShowSectionAA(e.target.checked)}
                className="accent-amber-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <ZoomIn className="w-3.5 h-3.5 text-emerald-400" /> Detay A (2:1 Büyüteç)
              </span>
              <input
                type="checkbox"
                checked={showDetailView}
                onChange={(e) => setShowDetailView(e.target.checked)}
                className="accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-0.5">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Maximize2 className="w-3.5 h-3.5 text-cyan-400" /> Delik Eksen Çizgileri (+)
              </span>
              <input
                type="checkbox"
                checked={showCenterMarks}
                onChange={(e) => setShowCenterMarks(e.target.checked)}
                className="accent-cyan-500"
              />
            </label>
          </div>

          {/* Add Technical Note / GD&T Callout */}
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
              <Ruler className="w-3.5 h-3.5 text-sky-400" /> Teknik Not & GD&T Ekle
            </div>
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200"
            />
            <button
              onClick={() => {
                if (!newNoteText.trim()) return;
                setAnnotations((prev) => [
                  ...prev,
                  {
                    id: `note_${Date.now()}`,
                    text: newNoteText.trim(),
                    x: 52,
                    y: 486 - prev.length * 18,
                  },
                ]);
              }}
              className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Paftaya Not Ekle
            </button>
          </div>
        </div>

        {/* Export CAD Sheet Actions */}
        <div className="space-y-1.5 pt-3 border-t border-slate-800">
          <button
            onClick={handleExportSVG}
            className="w-full py-2 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center justify-center gap-1.5 shadow"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ISO Teknik Paftayı İndir (.SVG)</span>
          </button>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={handleExportDXF}
              className="py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" /> .DXF Çıktı
            </button>
            <button
              onClick={handleExportSCAD}
              className="py-1.5 px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold flex items-center justify-center gap-1"
            >
              <FileCode2 className="w-3.5 h-3.5 text-emerald-400" /> .SCAD Kod
            </button>
          </div>
        </div>
      </aside>

      {/* Center Interactive ISO A3 Blueprint Canvas */}
      <main className="flex-1 p-6 flex items-center justify-center overflow-auto bg-[#090D16]">
        <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border-4 border-slate-700 overflow-hidden">
          <svg
            id="shapr-2d-drawing-svg"
            viewBox="0 0 920 580"
            className="w-full h-auto block"
          >
            <defs>
              <pattern
                id="iso-hatch-45"
                width="8"
                height="8"
                patternTransform="rotate(45 0 0)"
                patternUnits="userSpaceOnUse"
              >
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="8"
                  stroke="#334155"
                  strokeWidth="1.2"
                />
              </pattern>
            </defs>

            {/* Sheet Background & ISO Border */}
            <rect width="920" height="580" fill="#F8FAFC" />
            <rect
              x="18"
              y="18"
              width="884"
              height="544"
              fill="none"
              stroke="#0F172A"
              strokeWidth="2.2"
            />
            <rect
              x="24"
              y="24"
              width="872"
              height="532"
              fill="none"
              stroke="#334155"
              strokeWidth="0.8"
            />

            {/* ============================================================= */}
            {/* 1. FRONT VIEW (ÖN GÖRÜNÜŞ)                                    */}
            {/* ============================================================= */}
            <g transform="translate(80, 75)">
              <text
                x="0"
                y="-12"
                fontSize="11"
                fontWeight="bold"
                fill="#0F172A"
                fontFamily="monospace"
              >
                ÖN GÖRÜNÜŞ (FRONT VIEW) • ÖLÇEK {sheetScale}
              </text>

              {/* Outer Front Contour */}
              <rect
                x="0"
                y="35"
                width="210"
                height="65"
                fill="#E2E8F0"
                stroke="#0F172A"
                strokeWidth="2.2"
              />
              {/* Central Bearing Boss */}
              <rect
                x="63"
                y="0"
                width="84"
                height="100"
                fill="#CBD5E1"
                stroke="#0F172A"
                strokeWidth="2.2"
              />

              {/* Hidden Bore & Mounting Holes */}
              {showHiddenLines && (
                <>
                  <line
                    x1="82"
                    y1="0"
                    x2="82"
                    y2="100"
                    stroke="#475569"
                    strokeWidth="1.2"
                    strokeDasharray="5,4"
                  />
                  <line
                    x1="128"
                    y1="0"
                    x2="128"
                    y2="100"
                    stroke="#475569"
                    strokeWidth="1.2"
                    strokeDasharray="5,4"
                  />
                  <line
                    x1="34"
                    y1="35"
                    x2="34"
                    y2="100"
                    stroke="#475569"
                    strokeWidth="1.2"
                    strokeDasharray="5,4"
                  />
                  <line
                    x1="176"
                    y1="35"
                    x2="176"
                    y2="100"
                    stroke="#475569"
                    strokeWidth="1.2"
                    strokeDasharray="5,4"
                  />
                </>
              )}

              {/* Centerline */}
              {showCenterMarks && (
                <line
                  x1="105"
                  y1="-14"
                  x2="105"
                  y2="115"
                  stroke="#0284C7"
                  strokeWidth="1"
                  strokeDasharray="12,4,3,4"
                />
              )}

              {/* Horizontal Width Dimension */}
              <line x1="0" y1="125" x2="210" y2="125" stroke="#0284C7" strokeWidth="1.4" />
              <line x1="0" y1="100" x2="0" y2="132" stroke="#0284C7" strokeWidth="1" />
              <line x1="210" y1="100" x2="210" y2="132" stroke="#0284C7" strokeWidth="1" />
              <text
                x="105"
                y="140"
                fontSize="11"
                fontWeight="bold"
                fill="#0369A1"
                textAnchor="middle"
                fontFamily="monospace"
              >
                {bbox.width.toFixed(1)} mm ±0.05
              </text>

              {/* Vertical Height Dimension */}
              <line x1="230" y1="0" x2="230" y2="100" stroke="#0284C7" strokeWidth="1.4" />
              <line x1="147" y1="0" x2="236" y2="0" stroke="#0284C7" strokeWidth="1" />
              <line x1="210" y1="100" x2="236" y2="100" stroke="#0284C7" strokeWidth="1" />
              <text
                x="242"
                y="54"
                fontSize="11"
                fontWeight="bold"
                fill="#0369A1"
                fontFamily="monospace"
              >
                H={bbox.height.toFixed(1)} mm
              </text>
            </g>

            {/* ============================================================= */}
            {/* 2. TOP VIEW (ÜST GÖRÜNÜŞ)                                     */}
            {/* ============================================================= */}
            <g transform="translate(80, 265)">
              <text
                x="0"
                y="-12"
                fontSize="11"
                fontWeight="bold"
                fill="#0F172A"
                fontFamily="monospace"
              >
                ÜST GÖRÜNÜŞ (TOP VIEW) • A-A KESİT HATTI
              </text>

              <rect
                x="0"
                y="0"
                width="210"
                height="130"
                rx="10"
                fill="#E2E8F0"
                stroke="#0F172A"
                strokeWidth="2.2"
              />

              {/* Central Boss Outer & Bore Circles */}
              <circle
                cx="105"
                cy="65"
                r="42"
                fill="none"
                stroke="#0F172A"
                strokeWidth="2"
              />
              <circle
                cx="105"
                cy="65"
                r="23"
                fill="#F8FAFC"
                stroke="#0F172A"
                strokeWidth="2"
              />

              {/* Side Mounting Holes */}
              <circle
                cx="40"
                cy="65"
                r="14"
                fill="#F8FAFC"
                stroke="#0F172A"
                strokeWidth="1.8"
              />
              <circle
                cx="170"
                cy="65"
                r="14"
                fill="#F8FAFC"
                stroke="#0F172A"
                strokeWidth="1.8"
              />

              {/* Centerlines */}
              {showCenterMarks && (
                <>
                  <line
                    x1="-12"
                    y1="65"
                    x2="222"
                    y2="65"
                    stroke="#DC2626"
                    strokeWidth="1.2"
                    strokeDasharray="14,4,3,4"
                  />
                  <text
                    x="-22"
                    y="61"
                    fontSize="12"
                    fontWeight="bold"
                    fill="#DC2626"
                    fontFamily="monospace"
                  >
                    A
                  </text>
                  <text
                    x="226"
                    y="61"
                    fontSize="12"
                    fontWeight="bold"
                    fill="#DC2626"
                    fontFamily="monospace"
                  >
                    A
                  </text>
                </>
              )}

              {/* Depth Dimension */}
              <line x1="-22" y1="0" x2="-22" y2="130" stroke="#0284C7" strokeWidth="1.4" />
              <text
                x="-30"
                y="68"
                fontSize="10"
                fontWeight="bold"
                fill="#0369A1"
                textAnchor="end"
                fontFamily="monospace"
              >
                {bbox.depth.toFixed(1)}mm
              </text>

              {/* Bore Diameter Callout */}
              <line
                x1="105"
                y1="65"
                x2="162"
                y2="14"
                stroke="#0284C7"
                strokeWidth="1.3"
              />
              <text
                x="166"
                y="14"
                fontSize="11"
                fontWeight="bold"
                fill="#0369A1"
                fontFamily="monospace"
              >
                Ø20.0 H7 Rulman Yatağı
              </text>
            </g>

            {/* ============================================================= */}
            {/* 3. SECTION VIEW A-A (45° ANSI/ISO HATCHED CUT)                */}
            {/* ============================================================= */}
            {showSectionAA && (
              <g transform="translate(415, 75)">
                <text
                  x="0"
                  y="-12"
                  fontSize="11"
                  fontWeight="bold"
                  fill="#DC2626"
                  fontFamily="monospace"
                >
                  KESİT A-A (SECTION VIEW A-A • 45° TARAMALI)
                </text>

                {/* Left Sectioned Block */}
                <path
                  d="M 0 35 L 63 35 L 63 0 L 82 0 L 82 100 L 0 100 Z"
                  fill="url(#iso-hatch-45)"
                  stroke="#0F172A"
                  strokeWidth="2.2"
                />
                {/* Right Sectioned Block */}
                <path
                  d="M 128 0 L 147 0 L 147 35 L 210 35 L 210 100 L 128 100 Z"
                  fill="url(#iso-hatch-45)"
                  stroke="#0F172A"
                  strokeWidth="2.2"
                />
                {/* Back Bore Wall */}
                <rect
                  x="82"
                  y="0"
                  width="46"
                  height="100"
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* ============================================================= */}
            {/* 4. DETAIL VIEW MAGNIFIER (DETAY A - 2:1)                      */}
            {/* ============================================================= */}
            {showDetailView && (
              <g transform="translate(705, 75)">
                <text
                  x="70"
                  y="-12"
                  fontSize="11"
                  fontWeight="bold"
                  fill="#059669"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  DETAY A (ÖLÇEK 2:1)
                </text>
                <circle
                  cx="70"
                  cy="62"
                  r="58"
                  fill="#F1F5F9"
                  stroke="#059669"
                  strokeWidth="2"
                  strokeDasharray="8,3"
                />
                <path
                  d="M 28 88 L 28 45 Q 28 32 41 32 L 105 32"
                  fill="none"
                  stroke="#0F172A"
                  strokeWidth="3"
                />
                <text
                  x="70"
                  y="74"
                  fontSize="11"
                  fontWeight="bold"
                  fill="#059669"
                  textAnchor="middle"
                  fontFamily="monospace"
                >
                  R2.50 mm Pah/Fillet
                </text>
              </g>
            )}

            {/* ============================================================= */}
            {/* 5. ISOMETRIC 3D SHADED REFERENCE VIEW                         */}
            {/* ============================================================= */}
            <g transform="translate(425, 255)">
              <text
                x="0"
                y="-10"
                fontSize="11"
                fontWeight="bold"
                fill="#0F172A"
                fontFamily="monospace"
              >
                İZOMETRİK 3B REFERANS GÖRÜNÜMÜ ({bodies.length} GÖVDE)
              </text>
              <polygon
                points="95,20 185,55 185,115 95,150 5,115 5,55"
                fill="#CBD5E1"
                stroke="#0F172A"
                strokeWidth="2.2"
              />
              <polyline
                points="5,55 95,90 185,55"
                fill="none"
                stroke="#0F172A"
                strokeWidth="1.6"
              />
              <line
                x1="95"
                y1="90"
                x2="95"
                y2="150"
                stroke="#0F172A"
                strokeWidth="1.6"
              />
              <ellipse
                cx="95"
                cy="55"
                rx="28"
                ry="14"
                fill="#94A3B8"
                stroke="#0F172A"
                strokeWidth="2"
              />
            </g>

            {/* Custom Technical Notes */}
            {annotations.map((note) => (
              <text
                key={note.id}
                x={note.x}
                y={note.y}
                fontSize="10.5"
                fontWeight="bold"
                fill="#1E293B"
                fontFamily="monospace"
              >
                • {note.text}
              </text>
            ))}

            {/* ============================================================= */}
            {/* ISO 7200 ENGINEERING TITLE BLOCK (ANTET)                      */}
            {/* ============================================================= */}
            <g transform="translate(500, 462)">
              <rect
                x="0"
                y="0"
                width="396"
                height="94"
                fill="#F1F5F9"
                stroke="#0F172A"
                strokeWidth="2"
              />
              <line x1="0" y1="32" x2="396" y2="32" stroke="#0F172A" strokeWidth="1.2" />
              <line x1="0" y1="64" x2="396" y2="64" stroke="#0F172A" strokeWidth="1.2" />
              <line x1="210" y1="0" x2="210" y2="94" stroke="#0F172A" strokeWidth="1.2" />

              <text x="10" y="13" fontSize="8.5" fill="#64748B" fontFamily="monospace">
                PROJE / PARÇA ADI:
              </text>
              <text
                x="10"
                y="26"
                fontSize="11.5"
                fontWeight="bold"
                fill="#0F172A"
                fontFamily="monospace"
              >
                {projectName.toUpperCase()}
              </text>

              <text x="220" y="13" fontSize="8.5" fill="#64748B" fontFamily="monospace">
                MALZEME:
              </text>
              <text
                x="220"
                y="26"
                fontSize="10.5"
                fontWeight="bold"
                fill="#0369A1"
                fontFamily="monospace"
              >
                {activeMaterialName}
              </text>

              <text x="10" y="45" fontSize="8.5" fill="#64748B" fontFamily="monospace">
                BOYUTLAR (W×D×H):
              </text>
              <text
                x="10"
                y="58"
                fontSize="10.5"
                fontWeight="bold"
                fill="#0F172A"
                fontFamily="monospace"
              >
                {bbox.width} × {bbox.depth} × {bbox.height} mm
              </text>

              <text x="220" y="45" fontSize="8.5" fill="#64748B" fontFamily="monospace">
                ÖLÇEK / STANDART:
              </text>
              <text
                x="220"
                y="58"
                fontSize="10.5"
                fontWeight="bold"
                fill="#0F172A"
                fontFamily="monospace"
              >
                {sheetScale} • {projectionStd} • {bbox.volumeCm3} cm³
              </text>

              <text x="10" y="78" fontSize="8.5" fill="#64748B" fontFamily="monospace">
                CAD SİSTEMİ:
              </text>
              <text
                x="10"
                y="89"
                fontSize="10"
                fontWeight="bold"
                fill="#0F172A"
                fontFamily="monospace"
              >
                SHAPR-ULTRA 3D CAD STUDIO
              </text>

              <text x="220" y="78" fontSize="8.5" fill="#64748B" fontFamily="monospace">
                ONAY / TARİH:
              </text>
              <text
                x="220"
                y="89"
                fontSize="10"
                fontWeight="bold"
                fill="#059669"
                fontFamily="monospace"
              >
                ÜRETİME UYGUN (ISO 9001)
              </text>
            </g>
          </svg>
        </div>
      </main>
    </div>
  );
};
