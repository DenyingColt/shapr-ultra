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
} from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import { UnitSystem, VisualStyle } from '../../types/cad';
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
  const setBlueprintModalOpen = useCADStore((s) => s.setBlueprintModalOpen);
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
      {/* Left: Brand, Project Hub Trigger, Auto-Save Status & Editable Project Title */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setProjectHubOpen(true)}
          className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition"
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>Projelerim</span>
        </button>

        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
          <span
            className={`w-2 h-2 rounded-full mr-1.5 transition ${
              autoSaveStatus === 'saving'
                ? 'bg-amber-400 animate-pulse'
                : 'bg-emerald-400'
            }`}
          />
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-100 w-32 focus:outline-none"
          />
        </div>

        <button
          onClick={() => saveCurrentProjectToDevice()}
          title="IndexedDB Cihaz Kaydını Doğrula"
          className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] text-slate-400 hover:text-emerald-400 font-mono transition"
        >
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>{autoSaveStatus === 'saving' ? 'Kaydediliyor...' : 'Kayıtlı'}</span>
        </button>

        {/* Universal Command Palette Button (Ctrl+K / /) */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-300 flex items-center gap-1.5 transition"
          title="Evrensel Komut Arama Paleti (Ctrl+K veya /)"
        >
          <Search className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden lg:inline">Komut Ara</span>
          <kbd className="text-[9px] font-mono bg-slate-950 px-1.5 py-0.5 rounded text-slate-400 border border-slate-800">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Center: Units, Grid Snap, Undo/Redo, Visual Style (Matcap/Blueprint/Metrology) & Section View */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
          <button
            onClick={undo}
            disabled={undoStack.length === 0}
            title="Geri Al (2 Parmak Çift Dokunuş / Ctrl+Z)"
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

        {/* Unit Selector */}
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as UnitSystem)}
          className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-200 focus:outline-none"
        >
          <option value="mm">Birim: mm</option>
          <option value="cm">Birim: cm</option>
          <option value="m">Birim: m</option>
          <option value="in">Birim: in</option>
        </select>

        {/* Grid Snap Selector */}
        <div className="hidden md:flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 gap-1 text-xs">
          <GridIcon className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={gridSnapMm}
            onChange={(e) => setGridSnapMm(Number(e.target.value))}
            className="bg-transparent font-mono text-xs text-slate-200 focus:outline-none"
          >
            <option value={0.1}>Snap: 0.1mm</option>
            <option value={0.5}>Snap: 0.5mm</option>
            <option value={1}>Snap: 1.0mm</option>
            <option value={2}>Snap: 2.0mm</option>
            <option value={5}>Snap: 5.0mm</option>
            <option value={10}>Snap: 10mm</option>
          </select>
        </div>

        {/* Visual Style Switcher (Matcap, Blueprint, Zebra, Overhang, Metrology Shaders) */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 gap-1 text-xs">
          <Eye className="w-3.5 h-3.5 text-sky-400" />
          <select
            value={visualStyle}
            onChange={(e) => setVisualStyle(e.target.value as VisualStyle)}
            className="bg-transparent text-xs text-slate-200 focus:outline-none"
          >
            <option value="shaded_edges">Katı + B-Rep Kenar</option>
            <option value="matcap">Stüdyo Matcap (High-Contrast)</option>
            <option value="blueprint_white">Teknik Mavi Blueprint</option>
            <option value="shaded">Yalnızca Gölgeli</option>
            <option value="wireframe">Tel Kafes (Wireframe)</option>
            <option value="xray">X-Ray Yarı Saydam</option>
            <option value="zebra">Zebra Yüzey Sürekliliği (G2)</option>
            <option value="overhang">3D Baskı 45° Sarkma Haritası</option>
            <option value="curvature_map">Eğrilik Haritası (Gaussian Curvature)</option>
            <option value="draft_analysis">Kalıp Çıkma Açısı Analizi (Draft)</option>
            <option value="thickness_heatmap">Et Kalınlığı Isı Haritası (Wall Thickness)</option>
          </select>
        </div>

        {/* Section Clipping Plane Toggle & Slider */}
        <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1">
          <button
            onClick={toggleSectionView}
            className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded transition ${
              sectionViewEnabled
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">Kesit</span>
          </button>

          {sectionViewEnabled && (
            <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
              {(['X', 'Y', 'Z'] as const).map((ax) => (
                <button
                  key={ax}
                  onClick={() => setSectionPlaneAxis(ax)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                    sectionPlaneAxis === ax
                      ? 'bg-sky-600 text-white'
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
            </div>
          )}
        </div>
      </div>

      {/* Right: 3D Print Doctor, Mechanical Macros, Technical Blueprint & Export */}
      <div className="flex items-center gap-1.5 relative">
        <button
          onClick={() => setMeshDoctorModalOpen(true)}
          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden lg:inline">3B Baskı Doktoru</span>
        </button>

        <button
          onClick={() => setMacrosModalOpen(true)}
          className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition"
        >
          <Cog className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Mekanik Parça</span>
        </button>

        <button
          onClick={() => setBlueprintModalOpen(true)}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
        >
          <FileCode2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden md:inline">Teknik Resim & SCAD</span>
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
            <span>Dışa Aktar</span>
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
