import React, { useRef, useState } from 'react';
import {
  FolderKanban,
  Undo2,
  Redo2,
  Eye,
  Scissors,
  Cog,
  FileCode2,
  Download,
  Upload,
  Sparkles,
  Grid as GridIcon,
  ShieldCheck,
  Share2,
  Search,
  Layers,
  History,
  Box,
  Palette,
} from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import { ShaprWorkspace, UnitSystem, VisualStyle } from '../../types/cad';
import {
  exportBodiesToAsciiSTL,
  exportBodiesToBinarySTL,
  exportBodiesToOBJ,
  exportProjectToOpenSCAD,
  exportSketchToDXF,
  exportSketchToSVG,
  importOBJToGeometry,
  importSTLToGeometry,
  serializeProjectToSHAPRX,
  triggerBrowserDownload,
} from '../../kernel/fileIO';
import { shareOrDownloadCADFile } from '../../services/nativeBridge';

export const TopHeaderBar: React.FC = () => {
  const projectName = useCADStore((s) => s.projectName);
  const setProjectName = useCADStore((s) => s.setProjectName);
  const setProjectHubOpen = useCADStore((s) => s.setProjectHubOpen);
  const autoSaveStatus = useCADStore((s) => s.autoSaveStatus);
  const saveCurrentProjectToDevice = useCADStore(
    (s) => s.saveCurrentProjectToDevice
  );

  // Shapr3D Project Spaces & Sidebars
  const activeWorkspace = useCADStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useCADStore((s) => s.setActiveWorkspace);
  const isItemsDrawerOpen = useCADStore((s) => s.isItemsDrawerOpen);
  const setItemsDrawerOpen = useCADStore((s) => s.setItemsDrawerOpen);
  const isHistorySidebarOpen = useCADStore((s) => s.isHistorySidebarOpen);
  const setHistorySidebarOpen = useCADStore((s) => s.setHistorySidebarOpen);

  const unit = useCADStore((s) => s.unit);
  const setUnit = useCADStore((s) => s.setUnit);
  const gridSnapMm = useCADStore((s) => s.gridSnapMm);
  const setGridSnapMm = useCADStore((s) => s.setGridSnapMm);
  const visualStyle = useCADStore((s) => s.visualStyle);
  const setVisualStyle = useCADStore((s) => s.setVisualStyle);

  const sectionViewEnabled = useCADStore((s) => s.sectionViewEnabled);
  const toggleSectionView = useCADStore((s) => s.toggleSectionView);
  const sectionPlaneAxis = useCADStore((s) => s.sectionPlaneAxis);
  const setSectionPlaneAxis = useCADStore((s) => s.setSectionPlaneAxis);
  const sectionPlaneOffset = useCADStore((s) => s.sectionPlaneOffset);
  const setSectionPlaneOffset = useCADStore((s) => s.setSectionPlaneOffset);

  const undo = useCADStore((s) => s.undo);
  const redo = useCADStore((s) => s.redo);
  const undoStack = useCADStore((s) => s.undoStack);
  const redoStack = useCADStore((s) => s.redoStack);

  const setMacrosModalOpen = useCADStore((s) => s.setMacrosModalOpen);
  const setMeshDoctorModalOpen = useCADStore((s) => s.setMeshDoctorModalOpen);
  const setCommandPaletteOpen = useCADStore((s) => s.setCommandPaletteOpen);

  const bodies = useCADStore((s) => s.bodies);
  const sketches = useCADStore((s) => s.sketches);
  const variables = useCADStore((s) => s.variables);
  const history = useCADStore((s) => s.history);
  const importExternalGeometry = useCADStore((s) => s.importExternalGeometry);

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'stl') {
      const buf = await file.arrayBuffer();
      const geom = importSTLToGeometry(buf);
      importExternalGeometry(geom, file.name.replace(/\.stl$/i, ''));
    } else if (ext === 'obj') {
      const txt = await file.text();
      const geom = importOBJToGeometry(txt);
      importExternalGeometry(geom, file.name.replace(/\.obj$/i, ''));
    }
    e.target.value = '';
  };

  const handleNativeShareSTL = async () => {
    const buf = exportBodiesToBinarySTL(bodies);
    await shareOrDownloadCADFile(
      `${projectName.replace(/\s+/g, '_')}.stl`,
      buf,
      'application/sla',
      true
    );
  };

  return (
    <header className="h-12 px-3 bg-[#0A0D14]/95 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0 z-30 select-none">
      {/* Left: Project Hub, Items Drawer Toggle, Editable Project Name & Shapr3D Workspace Switcher */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setProjectHubOpen(true)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
          title="Proje Galerisi & Şablonlar"
        >
          <FolderKanban className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Projeler</span>
        </button>

        {/* Authentic Shapr3D Items (Unsurlar) Toggle */}
        <button
          onClick={() => setItemsDrawerOpen(!isItemsDrawerOpen)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
            isItemsDrawerOpen
              ? 'bg-sky-600 border-sky-500 text-white'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
          }`}
          title="Shapr3D Unsur Ağacı & Değişkenler (Items Manager)"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Unsurlar ({bodies.length})</span>
        </button>

        <div className="hidden xl:flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
          <span
            onClick={() => saveCurrentProjectToDevice()}
            className={`w-2 h-2 rounded-full mr-1.5 cursor-pointer transition ${
              autoSaveStatus === 'saving'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-emerald-400'
            }`}
            title="Cihaza Otomatik Kaydedildi"
          />
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-100 w-28 focus:outline-none"
          />
          <ShieldCheck className="w-3 h-3 text-emerald-400 ml-1" />
        </div>

        {/* Authentic Shapr3D Project Space Switcher: Modeling | Visualization | 2D Drawings */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-[11px] font-semibold">
          {(
            [
              ['modeling', '3B Modelleme', Box],
              ['visualization', 'Görselleştirme', Palette],
              ['drawings2d', '2B Teknik Resim', FileCode2],
            ] as [ShaprWorkspace, string, React.ElementType][]
          ).map(([ws, label, Icon]) => {
            const active = activeWorkspace === ws;
            return (
              <button
                key={ws}
                onClick={() => setActiveWorkspace(ws)}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition ${
                  active
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Center: Undo/Redo, Live Grid Resolution Badge (# mm), Appearance/Visual Style & Section Cut */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Geri Al (2 Parmak Dokunuş / Ctrl+Z)"
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-35 text-slate-300 transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Yinele (3 Parmak Dokunuş / Ctrl+Y)"
            className="p-1.5 rounded hover:bg-slate-800 disabled:opacity-35 text-slate-300 transition"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Authentic Shapr3D Live Grid & Units Pill (# 1.0 mm) */}
        <div className="hidden md:flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 gap-1 text-xs">
          <GridIcon className="w-3.5 h-3.5 text-sky-400" />
          <select
            value={gridSnapMm}
            onChange={(e) => setGridSnapMm(Number(e.target.value))}
            className="bg-transparent font-mono text-xs text-slate-200 focus:outline-none"
            title="Izgara Yakalama (Grid Snap) Çözünürlüğü"
          >
            <option value={0.1}># 0.1</option>
            <option value={0.5}># 0.5</option>
            <option value={1}># 1.0</option>
            <option value={2}># 2.0</option>
            <option value={5}># 5.0</option>
            <option value={10}># 10</option>
          </select>
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as UnitSystem)}
            className="bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-[11px] font-mono text-sky-300 focus:outline-none"
          >
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="m">m</option>
            <option value="in">in</option>
          </select>
        </div>

        {/* Visual Style / Shapr3D Display Mode Switcher */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 gap-1 text-xs">
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          <select
            value={visualStyle}
            onChange={(e) => setVisualStyle(e.target.value as VisualStyle)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none max-w-[145px]"
          >
            <option value="shaded_edges">Katı + B-Rep Kenar</option>
            <option value="matcap">Stüdyo Matcap</option>
            <option value="blueprint_white">Teknik Blueprint</option>
            <option value="shaded">Yalnızca Gölgeli</option>
            <option value="wireframe">Tel Kafes (Wireframe)</option>
            <option value="xray">X-Ray Yarı Saydam</option>
            <option value="zebra">Zebra Analizi (G2)</option>
            <option value="overhang">3D Baskı 45° Sarkma</option>
            <option value="curvature_map">Eğrilik Haritası</option>
            <option value="draft_analysis">Kalıp Çıkma Açısı</option>
            <option value="thickness_heatmap">Et Kalınlığı Haritası</option>
          </select>
        </div>

        {/* Section Clipping Plane Controls when active */}
        {sectionViewEnabled && (
          <div className="hidden lg:flex items-center gap-1 bg-slate-950 border border-amber-500/50 rounded-lg px-2 py-1">
            <Scissors className="w-3.5 h-3.5 text-amber-400" />
            {(['X', 'Y', 'Z'] as const).map((ax) => (
              <button
                key={ax}
                onClick={() => setSectionPlaneAxis(ax)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  sectionPlaneAxis === ax
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {ax}
              </button>
            ))}
            <input
              type="range"
              min={-60}
              max={60}
              step={1}
              value={sectionPlaneOffset}
              onChange={(e) => setSectionPlaneOffset(Number(e.target.value))}
              className="w-16 accent-amber-400"
            />
            <button
              onClick={toggleSectionView}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold px-1"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* Right: Search, 3D Print Doctor, Macros, Shapr3D History Sidebar Toggle & Export */}
      <div className="flex items-center gap-1.5 relative">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-cyan-400 transition"
          title="Komut Ara (Ctrl+K / /)"
        >
          <Search className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => setMeshDoctorModalOpen(true)}
          className="px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1 transition"
          title="3B Baskı Doktoru & Tolerans Analizi"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">3B Doktor</span>
        </button>

        <button
          onClick={() => setMacrosModalOpen(true)}
          className="px-2 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1 transition"
          title="ISO Dişli, Cıvata, Yay Üreteci"
        >
          <Cog className="w-3.5 h-3.5" />
          <span className="hidden xl:inline">Makro</span>
        </button>

        {/* Authentic Shapr3D Right-Hand History Drawer Toggle */}
        <button
          onClick={() => setHistorySidebarOpen(!isHistorySidebarOpen)}
          className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
            isHistorySidebarOpen
              ? 'bg-sky-600 border-sky-500 text-white shadow'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
          title="Shapr3D Parametrik Geçmiş Kartları (History Sidebar)"
        >
          <History className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Geçmiş ({history.length})</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".stl,.obj"
          onChange={handleFileImport}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          title="STL veya OBJ İçe Aktar"
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
        >
          <Upload className="w-3.5 h-3.5" />
        </button>

        {/* Export & Native Android Share Sheet Dropdown */}
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dışa Aktar</span>
          </button>

          {exportMenuOpen && (
            <div
              onMouseLeave={() => setExportMenuOpen(false)}
              className="absolute right-0 mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-1"
            >
              <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Android & 3D Yazıcı Çıktıları
              </div>

              <button
                onClick={() => {
                  handleNativeShareSTL();
                  setExportMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg bg-sky-600/30 hover:bg-sky-600 text-left flex items-center justify-between text-sky-200 transition font-semibold"
              >
                <span className="flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5" /> Android Hızlı Paylaş (STL)
                </span>
                <span className="font-mono text-[10px]">.STL</span>
              </button>

              <button
                onClick={() => {
                  const buf = exportBodiesToBinarySTL(bodies);
                  triggerBrowserDownload(`${projectName}.stl`, buf, 'application/sla');
                  setExportMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-sky-600 text-left flex items-center justify-between transition"
              >
                <span>Binary STL (3D Yazıcı)</span>
                <span className="font-mono text-[10px] opacity-75">.STL</span>
              </button>

              <button
                onClick={() => {
                  const ascii = exportBodiesToAsciiSTL(bodies, projectName);
                  triggerBrowserDownload(`${projectName}_ascii.stl`, ascii, 'text/plain');
                  setExportMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-sky-600 text-left flex items-center justify-between transition"
              >
                <span>ASCII STL</span>
                <span className="font-mono text-[10px] opacity-75">.STL</span>
              </button>

              <button
                onClick={() => {
                  const scad = exportProjectToOpenSCAD(
                    projectName,
                    bodies,
                    variables,
                    history
                  );
                  triggerBrowserDownload(`${projectName}.scad`, scad, 'text/plain');
                  setExportMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-sky-600 text-left flex items-center justify-between transition"
              >
                <span>OpenSCAD Parametrik Kod</span>
                <span className="font-mono text-[10px] opacity-75">.SCAD</span>
              </button>

              <button
                onClick={() => {
                  const obj = exportBodiesToOBJ(bodies);
                  triggerBrowserDownload(`${projectName}.obj`, obj, 'text/plain');
                  setExportMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-sky-600 text-left flex items-center justify-between transition"
              >
                <span>Wavefront 3D Mesh</span>
                <span className="font-mono text-[10px] opacity-75">.OBJ</span>
              </button>

              {sketches.length > 0 && (
                <>
                  <div className="border-t border-slate-800 my-1" />
                  <button
                    onClick={() => {
                      const svg = exportSketchToSVG(sketches[sketches.length - 1]);
                      triggerBrowserDownload(`${projectName}_sketch.svg`, svg, 'image/svg+xml');
                      setExportMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-sky-600 text-left flex items-center justify-between transition"
                  >
                    <span>1:1 Lazer Kesim Eskiz</span>
                    <span className="font-mono text-[10px] opacity-75">.SVG</span>
                  </button>
                  <button
                    onClick={() => {
                      const dxf = exportSketchToDXF(sketches[sketches.length - 1]);
                      triggerBrowserDownload(`${projectName}_sketch.dxf`, dxf, 'text/plain');
                      setExportMenuOpen(false);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg hover:bg-sky-600 text-left flex items-center justify-between transition"
                  >
                    <span>AutoCAD 2D Eskiz</span>
                    <span className="font-mono text-[10px] opacity-75">.DXF</span>
                  </button>
                </>
              )}

              <div className="border-t border-slate-800 my-1" />
              <button
                onClick={async () => {
                  const json = serializeProjectToSHAPRX(
                    projectName,
                    bodies,
                    sketches,
                    variables,
                    history
                  );
                  await shareOrDownloadCADFile(
                    `${projectName.replace(/\s+/g, '_')}.shaprx`,
                    json,
                    'application/json'
                  );
                  setExportMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg hover:bg-emerald-600 text-left flex items-center justify-between transition"
              >
                <span>Tam Proje Paketi Kaydet (.SHAPRX)</span>
                <span className="font-mono text-[10px] opacity-75">.SHAPRX</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
