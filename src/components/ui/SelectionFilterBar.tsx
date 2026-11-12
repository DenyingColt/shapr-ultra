import React from 'react';
import { Filter, Layers, CircleDot, GitCommitHorizontal, RefreshCw } from 'lucide-react';
import { SelectionFilterMode } from '../../types/cad';
import { useCADStore } from '../../store/useCADStore';

export const SelectionFilterBar: React.FC = () => {
  const selectionFilter = useCADStore((s) => s.selectionFilter);
  const setSelectionFilter = useCADStore((s) => s.setSelectionFilter);
  const selectCoplanarFaces = useCADStore((s) => s.selectCoplanarFaces);
  const selectEqualRadiusFaces = useCADStore((s) => s.selectEqualRadiusFaces);
  const selectTangentFaceChain = useCADStore((s) => s.selectTangentFaceChain);
  const invertBodySelection = useCADStore((s) => s.invertBodySelection);

  const modes: { id: SelectionFilterMode; label: string }[] = [
    { id: 'all', label: 'Tümü (B-Rep)' },
    { id: 'face', label: 'Yüzey (Face)' },
    { id: 'edge', label: 'Kenar (Edge)' },
    { id: 'vertex', label: 'Köşe (Vertex)' },
    { id: 'body', label: 'Gövde (Body)' },
    { id: 'sketch', label: 'Eskiz' },
  ];

  return (
    <div className="fixed top-14 left-76 z-20 hidden xl:flex items-center gap-1.5 bg-[#0B0E16]/90 backdrop-blur-xl border border-slate-800/90 rounded-xl px-2 py-1 shadow-xl select-none text-[11px]">
      <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
        <Filter className="w-3 h-3 text-sky-400" /> Filtre:
      </span>

      <div className="flex items-center gap-0.5 bg-slate-950 rounded-lg p-0.5 border border-slate-800">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setSelectionFilter(m.id)}
            className={`px-2 py-0.5 rounded-md font-semibold transition ${
              selectionFilter === m.id
                ? 'bg-sky-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Smart Topological Selection Helpers */}
      <div className="flex items-center gap-1 pl-1.5 border-l border-slate-800">
        <button
          onClick={selectCoplanarFaces}
          title="Seçili yüzeyle aynı düzlemdeki tüm yüzeyleri seç (Select Coplanar)"
          className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-sky-300 flex items-center gap-1 transition"
        >
          <Layers className="w-3 h-3" /> Eş Düzlem
        </button>
        <button
          onClick={selectEqualRadiusFaces}
          title="Eşit yarıçaplı / alanlı delik ve yüzeyleri seç (Select Equal Radius)"
          className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-amber-300 flex items-center gap-1 transition"
        >
          <CircleDot className="w-3 h-3" /> Eşit Çap
        </button>
        <button
          onClick={selectTangentFaceChain}
          title="Teğet yüzey zincirini seç (Select Tangent Chain)"
          className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-emerald-300 flex items-center gap-1 transition"
        >
          <GitCommitHorizontal className="w-3 h-3" /> Teğet Zincir
        </button>
        <button
          onClick={invertBodySelection}
          title="Seçimi tersine çevir (Invert Selection)"
          className="p-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-300 transition"
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
