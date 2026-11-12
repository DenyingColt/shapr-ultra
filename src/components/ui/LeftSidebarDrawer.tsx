import React, { useState } from 'react';
import {
  Layers,
  Variable,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Crosshair,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sliders,
} from 'lucide-react';
import { DEFAULT_MATERIALS, useCADStore } from '../../store/useCADStore';
import { ConstraintType } from '../../types/cad';

export const LeftSidebarDrawer: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'tree' | 'vars' | 'constraints'>('tree');

  const bodies = useCADStore((s) => s.bodies);
  const sketches = useCADStore((s) => s.sketches);
  const selectedBodyIds = useCADStore((s) => s.selectedBodyIds);
  const selectBody = useCADStore((s) => s.selectBody);
  const toggleBodyVisibility = useCADStore((s) => s.toggleBodyVisibility);
  const toggleBodyLock = useCADStore((s) => s.toggleBodyLock);
  const isolateBody = useCADStore((s) => s.isolateBody);
  const updateBodyMaterial = useCADStore((s) => s.updateBodyMaterial);

  const variables = useCADStore((s) => s.variables);
  const addVariable = useCADStore((s) => s.addVariable);
  const updateVariable = useCADStore((s) => s.updateVariable);
  const removeVariable = useCADStore((s) => s.removeVariable);

  const selectedSketchPrimIds = useCADStore((s) => s.selectedSketchPrimIds);
  const addConstraintToActiveSketch = useCADStore(
    (s) => s.addConstraintToActiveSketch
  );

  const [newVarName, setNewVarName] = useState('');
  const [newVarExpr, setNewVarExpr] = useState('25mm');

  if (collapsed) {
    return (
      <div className="absolute top-16 left-3 z-20">
        <button
          onClick={() => setCollapsed(false)}
          className="p-2.5 rounded-xl bg-slate-900/95 border border-slate-700 text-slate-200 hover:text-white shadow-xl transition"
          title="Sahne Ağacı & Değişkenler Panelini Aç"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const selectedBody = bodies.find((b) => b.id === selectedBodyIds[0]);

  return (
    <aside className="w-72 bg-slate-900/95 border-r border-slate-800 flex flex-col shrink-0 z-20 select-none">
      {/* Drawer Header & Tab Switcher */}
      <div className="flex items-center justify-between px-2.5 py-2 border-b border-slate-800">
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 flex-1 mr-2 text-[11px] font-semibold">
          <button
            onClick={() => setActiveTab('tree')}
            className={`py-1 rounded-md flex items-center justify-center gap-1 transition ${
              activeTab === 'tree'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Unsurlar</span>
          </button>

          <button
            onClick={() => setActiveTab('vars')}
            className={`py-1 rounded-md flex items-center justify-center gap-1 transition ${
              activeTab === 'vars'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Variable className="w-3 h-3" />
            <span>fx Tablo</span>
          </button>

          <button
            onClick={() => setActiveTab('constraints')}
            className={`py-1 rounded-md flex items-center justify-center gap-1 transition ${
              activeTab === 'constraints'
                ? 'bg-sky-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3 h-3" />
            <span>Kısıtlar</span>
          </button>
        </div>

        <button
          onClick={() => setCollapsed(true)}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: SCENE TREE (BODIES, SKETCHES, MATERIALS)                     */}
      {/* =================================================================== */}
      {activeTab === 'tree' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs">
          {/* Solid Bodies List */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                3D Katı Gövdeler (B-Rep)
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-400">
                {bodies.length}
              </span>
            </div>

            <div className="space-y-1">
              {bodies.map((body) => {
                const isSelected = selectedBodyIds.includes(body.id);
                return (
                  <div
                    key={body.id}
                    onClick={() => selectBody(body.id)}
                    className={`px-2.5 py-1.5 rounded-lg border cursor-pointer flex items-center justify-between gap-1.5 transition ${
                      isSelected
                        ? 'bg-sky-600/20 border-sky-500 text-white font-semibold'
                        : 'bg-slate-950/70 border-slate-800/80 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: body.material.color }}
                      />
                      <span className="truncate">{body.name}</span>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => isolateBody(body.id)}
                        title="Yalnızca Bu Gövdeyi İzole Et"
                        className={`p-1 rounded hover:bg-slate-800 ${
                          body.isolated ? 'text-amber-400' : 'text-slate-500'
                        }`}
                      >
                        <Crosshair className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => toggleBodyLock(body.id)}
                        title="Kilitle / Çöz"
                        className={`p-1 rounded hover:bg-slate-800 ${
                          body.locked ? 'text-rose-400' : 'text-slate-500'
                        }`}
                      >
                        {body.locked ? (
                          <Lock className="w-3 h-3" />
                        ) : (
                          <Unlock className="w-3 h-3" />
                        )}
                      </button>

                      <button
                        onClick={() => toggleBodyVisibility(body.id)}
                        title="Gizle / Göster"
                        className="p-1 rounded hover:bg-slate-800 text-slate-400"
                      >
                        {body.visible ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-slate-600" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2D Sketches List */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                2D Parametrik Eskizler
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                {sketches.length}
              </span>
            </div>
            <div className="space-y-1">
              {sketches.map((sk) => (
                <div
                  key={sk.id}
                  onClick={() =>
                    useCADStore.setState({
                      activeSketchId: sk.id,
                      activeTool: 'sketch_line',
                    })
                  }
                  className="px-2.5 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-sky-500/50 cursor-pointer flex items-center justify-between text-slate-300"
                >
                  <span className="truncate">{sk.name}</span>
                  <span className="text-[10px] font-mono text-sky-400">
                    {sk.closedProfiles.length} Profil
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Material & Appearance Inspector for Selected Body */}
          {selectedBody && (
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Malzeme & Yoğunluk ({selectedBody.name})
              </div>

              <select
                value={
                  Object.keys(DEFAULT_MATERIALS).find(
                    (k) => DEFAULT_MATERIALS[k].name === selectedBody.material.name
                  ) || 'aluminum'
                }
                onChange={(e) => {
                  const preset = DEFAULT_MATERIALS[e.target.value];
                  if (preset) updateBodyMaterial(selectedBody.id, preset);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
              >
                {Object.entries(DEFAULT_MATERIALS).map(([key, mat]) => (
                  <option key={key} value={key}>
                    {mat.name} ({mat.densityGPerCm3} g/cm³)
                  </option>
                ))}
              </select>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400 text-[11px]">Gövde Rengi:</span>
                <input
                  type="color"
                  value={selectedBody.material.color}
                  onChange={(e) =>
                    updateBodyMaterial(selectedBody.id, { color: e.target.value })
                  }
                  className="w-10 h-6 rounded bg-transparent cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-slate-400">Saydamlık (Opacity)</span>
                  <span className="font-mono">
                    {Math.round(selectedBody.material.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.15}
                  max={1}
                  step={0.05}
                  value={selectedBody.material.opacity}
                  onChange={(e) =>
                    updateBodyMaterial(selectedBody.id, {
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

      {/* =================================================================== */}
      {/* TAB 2: GLOBAL PARAMETRIC VARIABLES (fx)                             */}
      {/* =================================================================== */}
      {activeTab === 'vars' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="font-semibold text-sky-400 text-[11px]">
              + Yeni Parametrik Değişken Ekle
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="text"
                placeholder="Ad (örn: hole_d)"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs"
              />
              <input
                type="text"
                placeholder="Formül (12mm)"
                value={newVarExpr}
                onChange={(e) => setNewVarExpr(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 font-mono text-xs"
              />
            </div>
            <button
              onClick={() => {
                if (!newVarName.trim()) return;
                addVariable(newVarName.trim(), newVarExpr.trim(), 'mm');
                setNewVarName('');
              }}
              className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Değişkeni Kaydet</span>
            </button>
          </div>

          <div className="space-y-1.5">
            {variables.map((v) => (
              <div
                key={v.id}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-amber-400">
                    {v.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] text-emerald-400">
                      = {v.value.toFixed(2)} {v.unit}
                    </span>
                    <button
                      onClick={() => removeVariable(v.id)}
                      className="text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <input
                  type="text"
                  value={v.expression}
                  onChange={(e) => updateVariable(v.id, e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 font-mono text-[11px] text-slate-200"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: 2D GEOMETRIC CONSTRAINTS SOLVER                              */}
      {/* =================================================================== */}
      {activeTab === 'constraints' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="font-semibold text-slate-200 text-[11px]">
              Geometrik Kısıtlama Ata ({selectedSketchPrimIds.length} Çizgi Seçili)
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              {(
                [
                  ['horizontal', 'Yatay (Horizontal)'],
                  ['vertical', 'Dikey (Vertical)'],
                  ['parallel', 'Paralel (//)'],
                  ['perpendicular', 'Dik (⊥)'],
                  ['tangent', 'Teğet (Tangent)'],
                  ['concentric', 'Eş Merkezli'],
                  ['equal', 'Eşit Boy (=)'],
                  ['lock', 'Sabitle (Lock)'],
                ] as [ConstraintType, string][]
              ).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => addConstraintToActiveSketch(type)}
                  className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-sky-600 border border-slate-800 text-left truncate transition"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-[11px]">
            <div className="font-semibold text-slate-300">Kısıtlama Renk Kodları</div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span className="text-slate-400">Mavi: Serbest (Under-Constrained)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-400">Yeşil: Tam Kısıtlı (Fully Defined)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span className="text-slate-400">Kırmızı: Aşırı Kısıtlı (Conflict)</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
