import React, { useState } from 'react';
import {
  Sparkles,
  Sun,
  Search,
  Camera,
  Sliders,
  Check,
  Palette,
  ArrowLeft,
} from 'lucide-react';
import {
  SHAPR_MATERIAL_LIBRARY,
  useCADStore,
} from '../../store/useCADStore';
import {
  EnvironmentPresetId,
  PBRMaterialPreset,
} from '../../types/cad';
import { triggerBrowserDownload } from '../../kernel/fileIO';

const CATEGORY_LABELS: {
  id: 'all' | PBRMaterialPreset['category'];
  label: string;
}[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'metals', label: 'Metaller' },
  { id: 'plastics', label: 'Plastik & Karbon' },
  { id: 'woods', label: 'Ahşap' },
  { id: 'glass', label: 'Cam & Optik' },
  { id: 'automotive', label: 'Otomotiv' },
  { id: 'stone', label: 'Granit' },
];

const ENV_PRESETS: {
  id: EnvironmentPresetId;
  name: string;
  badgeColor: string;
  desc: string;
}[] = [
  {
    id: 'studio_softbox',
    name: 'Stüdyo Softbox (Varsayılan)',
    badgeColor: 'from-sky-400 to-slate-800',
    desc: 'Üç noktalı yumuşak ürün fotoğrafçılığı aydınlatması',
  },
  {
    id: 'gradient_mood',
    name: 'Gradient Mood',
    badgeColor: 'from-indigo-500 to-amber-500',
    desc: 'Yüksek kontrastlı endüstriyel tasarım yansımaları',
  },
  {
    id: 'industrial_loft',
    name: 'Endüstriyel Fabrika & Atölye',
    badgeColor: 'from-amber-400 to-slate-900',
    desc: 'Gerçekçi metal ve fırçalanmış çelik yansımaları',
  },
  {
    id: 'daylight_sun',
    name: 'Doğal Gün Işığı (Daylight)',
    badgeColor: 'from-cyan-300 to-blue-600',
    desc: 'Parlak dış mekan güneş ve gökyüzü kubbesi',
  },
  {
    id: 'dark_showroom',
    name: 'Karanlık Otomotiv Showroom',
    badgeColor: 'from-slate-700 to-black',
    desc: 'Dramatik kontur ışığı ve zemin yansıması',
  },
  {
    id: 'warm_workshop',
    name: 'Sıcak Ahşap & Pirinç Stüdyosu',
    badgeColor: 'from-orange-400 to-amber-900',
    desc: 'Sıcak renk sıcaklığı (3200K) vitrin ışığı',
  },
];

export const VisualizationSpace: React.FC = () => {
  const activeWorkspace = useCADStore((s) => s.activeWorkspace);
  const setActiveWorkspace = useCADStore((s) => s.setActiveWorkspace);
  const projectName = useCADStore((s) => s.projectName);

  const bodies = useCADStore((s) => s.bodies);
  const selectedBodyIds = useCADStore((s) => s.selectedBodyIds);
  const selectBody = useCADStore((s) => s.selectBody);
  const applyPBRMaterialPreset = useCADStore((s) => s.applyPBRMaterialPreset);
  const updateBodyMaterial = useCADStore((s) => s.updateBodyMaterial);

  const environmentPreset = useCADStore((s) => s.environmentPreset);
  const envRotationDeg = useCADStore((s) => s.envRotationDeg);
  const envAltitudeDeg = useCADStore((s) => s.envAltitudeDeg);
  const envIntensity = useCADStore((s) => s.envIntensity);
  const groundReflection = useCADStore((s) => s.groundReflection);
  const setEnvironmentConfig = useCADStore((s) => s.setEnvironmentConfig);

  const [activeTab, setActiveTab] = useState<'materials' | 'environment'>('materials');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | PBRMaterialPreset['category']
  >('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (activeWorkspace !== 'visualization') return null;

  const activeBody =
    bodies.find((b) => selectedBodyIds.includes(b.id)) || bodies[0];

  const filteredMaterials = SHAPR_MATERIAL_LIBRARY.filter((m) => {
    const matchesCat =
      selectedCategory === 'all' || m.category === selectedCategory;
    const matchesQuery =
      !searchQuery.trim() ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const handleCaptureRender = () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${projectName.replace(/\s+/g, '_')}_Shapr3D_Render.png`;
      a.click();
    } catch {
      triggerBrowserDownload(
        `${projectName}_Render_Info.txt`,
        'Render captured',
        'text/plain'
      );
    }
  };

  return (
    <>
      {/* Top-Left Return to Modeling Banner */}
      <div className="fixed top-14 left-4 z-30 flex items-center gap-2 pointer-events-auto select-none">
        <button
          onClick={() => setActiveWorkspace('modeling')}
          className="px-3 py-1.5 rounded-xl bg-[#111622]/95 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 shadow-xl backdrop-blur-xl transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
          <span>3B Modellemeye Dön</span>
        </button>

        <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600/90 to-sky-600/90 text-white text-xs font-bold flex items-center gap-1.5 shadow-xl">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Shapr3D Visualization (Gerçek Zamanlı PBR Stüdyo)</span>
        </div>
      </div>

      {/* Right-Hand Shapr3D Visualization Material & Environment Drawer */}
      <aside className="w-80 bg-[#0E131F]/95 border-l border-slate-800 flex flex-col shrink-0 z-20 select-none text-xs">
        {/* Tabs: Materials vs Environment */}
        <div className="p-2.5 border-b border-slate-800">
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('materials')}
              className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'materials'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>PBR Malzemeler</span>
            </button>
            <button
              onClick={() => setActiveTab('environment')}
              className={`py-1.5 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition ${
                activeTab === 'environment'
                  ? 'bg-sky-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Ortam & Işık</span>
            </button>
          </div>
        </div>

        {/* Target Body Selector */}
        <div className="px-3 py-2 bg-slate-950/70 border-b border-slate-800/80 space-y-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Hedef Gövde Seçimi ({bodies.length} Gövde)
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
            {bodies.map((b) => {
              const isSel = activeBody?.id === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => selectBody(b.id)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1.5 shrink-0 transition ${
                    isSel
                      ? 'bg-sky-600/25 border-sky-500 text-white font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: b.material.color }}
                  />
                  <span className="truncate max-w-[110px]">{b.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================================================================= */}
        {/* TAB 1: SHAPR3D PBR MATERIAL CATALOG                               */}
        {/* ================================================================= */}
        {activeTab === 'materials' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Malzeme ara (Alüminyum, Çelik, Cam, Ceviz...)"
                className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1">
              {CATEGORY_LABELS.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                    selectedCategory === cat.id
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Material Swatches Grid */}
            <div className="grid grid-cols-2 gap-2">
              {filteredMaterials.map((preset) => {
                const isApplied =
                  activeBody?.material.name === preset.name;
                return (
                  <button
                    key={preset.id}
                    onClick={() =>
                      applyPBRMaterialPreset(preset.id, activeBody?.id)
                    }
                    className={`p-2 rounded-xl border text-left transition flex flex-col gap-1.5 ${
                      isApplied
                        ? 'bg-sky-600/20 border-sky-500 shadow-lg'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* 3D Sphere Material Preview Orb */}
                      <div
                        className="w-8 h-8 rounded-full shadow-inner border border-white/20"
                        style={{
                          background: `radial-gradient(circle at 32% 30%, #ffffff 0%, ${preset.color} 48%, #090d16 100%)`,
                          opacity: Math.max(0.45, preset.opacity),
                        }}
                      />
                      {isApplied && (
                        <span className="p-1 rounded-full bg-sky-500 text-slate-950">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <div className="font-semibold text-slate-200 leading-tight line-clamp-2">
                      {preset.name}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400">
                      M:{Math.round(preset.metalness * 100)}% • R:
                      {Math.round(preset.roughness * 100)}% • {preset.densityGPerCm3}g/cm³
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Fine-Tuning Sliders for Active Body Material */}
            {activeBody && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-sky-400">
                  <span className="flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5" /> Yüzey Dokusu İnce Ayarı
                  </span>
                  <input
                    type="color"
                    value={activeBody.material.color}
                    onChange={(e) =>
                      updateBodyMaterial(activeBody.id, { color: e.target.value })
                    }
                    className="w-6 h-5 bg-transparent cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-400">Metaliklik (Metalness)</span>
                    <span className="font-mono">
                      {Math.round(activeBody.material.metalness * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={activeBody.material.metalness}
                    onChange={(e) =>
                      updateBodyMaterial(activeBody.id, {
                        metalness: Number(e.target.value),
                      })
                    }
                    className="w-full accent-sky-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-400">Pürüzlülük (Roughness)</span>
                    <span className="font-mono">
                      {Math.round(activeBody.material.roughness * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.02}
                    max={1}
                    step={0.02}
                    value={activeBody.material.roughness}
                    onChange={(e) =>
                      updateBodyMaterial(activeBody.id, {
                        roughness: Number(e.target.value),
                      })
                    }
                    className="w-full accent-sky-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="text-slate-400">Saydamlık (Opacity)</span>
                    <span className="font-mono">
                      {Math.round(activeBody.material.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.15}
                    max={1}
                    step={0.05}
                    value={activeBody.material.opacity}
                    onChange={(e) =>
                      updateBodyMaterial(activeBody.id, {
                        opacity: Number(e.target.value),
                      })
                    }
                    className="w-full accent-sky-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TAB 2: HDRI ENVIRONMENT & LIGHTING ROTATION / ALTITUDE            */}
        {/* ================================================================= */}
        {activeTab === 'environment' && (
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Stüdyo HDRI Işık Ortamları
            </div>

            <div className="space-y-1.5">
              {ENV_PRESETS.map((env) => {
                const isSel = environmentPreset === env.id;
                return (
                  <button
                    key={env.id}
                    onClick={() => setEnvironmentConfig({ preset: env.id })}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition ${
                      isSel
                        ? 'bg-sky-600/20 border-sky-500'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${env.badgeColor} shrink-0 border border-white/15`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-100 truncate">
                        {env.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {env.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                Işık Açısı & Zemin Yansıması Ayarları
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">Işık Yatay Dönüşü (Rotation)</span>
                  <span className="font-mono text-sky-300">{envRotationDeg}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={5}
                  value={envRotationDeg}
                  onChange={(e) =>
                    setEnvironmentConfig({ rotationDeg: Number(e.target.value) })
                  }
                  className="w-full accent-sky-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">Işık Yüksekliği (Altitude)</span>
                  <span className="font-mono text-amber-300">{envAltitudeDeg}°</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={85}
                  step={1}
                  value={envAltitudeDeg}
                  onChange={(e) =>
                    setEnvironmentConfig({ altitudeDeg: Number(e.target.value) })
                  }
                  className="w-full accent-amber-400"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">Pozlama Şiddeti (Exposure)</span>
                  <span className="font-mono text-emerald-300">
                    {envIntensity.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.4}
                  max={2.5}
                  step={0.05}
                  value={envIntensity}
                  onChange={(e) =>
                    setEnvironmentConfig({ intensity: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-400"
                />
              </div>

              <label className="flex items-center justify-between pt-1 cursor-pointer">
                <span className="text-slate-300">Zemin Gölgesi & Yansıması</span>
                <input
                  type="checkbox"
                  checked={groundReflection}
                  onChange={(e) =>
                    setEnvironmentConfig({ groundReflection: e.target.checked })
                  }
                  className="accent-sky-500"
                />
              </label>
            </div>
          </div>
        )}

        {/* Footer: High-Res Render Export */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/90">
          <button
            onClick={handleCaptureRender}
            className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg transition"
          >
            <Camera className="w-4 h-4" />
            <span>Stüdyo Render Kare Yakala (.PNG)</span>
          </button>
        </div>
      </aside>
    </>
  );
};
