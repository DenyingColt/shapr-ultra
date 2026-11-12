import React from 'react';
import { History, SkipBack, SkipForward, EyeOff, Eye } from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';

export const HistoryTimeline: React.FC = () => {
  const history = useCADStore((s) => s.history);
  const rollbackIndex = useCADStore((s) => s.rollbackIndex);
  const setRollbackIndex = useCADStore((s) => s.setRollbackIndex);
  const toggleSuppressFeature = useCADStore((s) => s.toggleSuppressFeature);
  const statusMessage = useCADStore((s) => s.statusMessage);

  return (
    <footer className="h-9 px-3 bg-slate-900/95 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0 z-30 select-none text-xs">
      {/* Left: Parametric History Timeline Nodes & Rollback Controls */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-[62%]">
        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1 shrink-0">
          <History className="w-3.5 h-3.5 text-sky-400" />
          <span>Zaman Çizelgesi ({rollbackIndex + 1}/{history.length})</span>
        </div>

        <button
          onClick={() => setRollbackIndex(Math.max(-1, rollbackIndex - 1))}
          disabled={rollbackIndex < 0}
          title="Önceki Adıma Sar"
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-300"
        >
          <SkipBack className="w-3 h-3" />
        </button>

        <div className="flex items-center gap-1 overflow-x-auto">
          {history.map((node, idx) => {
            const isRolledBack = idx > rollbackIndex;
            return (
              <div
                key={node.id}
                onClick={() => setRollbackIndex(idx)}
                className={`px-2 py-0.5 rounded-md border text-[11px] font-mono flex items-center gap-1 cursor-pointer shrink-0 transition ${
                  node.suppressed
                    ? 'bg-slate-900 border-slate-800 text-slate-600 line-through'
                    : isRolledBack
                    ? 'bg-slate-950 border-slate-800 text-slate-500 opacity-50'
                    : idx === rollbackIndex
                    ? 'bg-sky-600/25 border-sky-500 text-sky-200 font-bold'
                    : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:border-sky-500/60'
                }`}
              >
                <span>
                  {idx + 1}. {node.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSuppressFeature(node.id);
                  }}
                  title="Unsuru Pasifleştir / Aktifleştir (Suppress)"
                  className="hover:text-amber-400 ml-0.5"
                >
                  {node.suppressed ? (
                    <EyeOff className="w-2.5 h-2.5" />
                  ) : (
                    <Eye className="w-2.5 h-2.5 opacity-60" />
                  )}
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={() =>
            setRollbackIndex(Math.min(history.length - 1, rollbackIndex + 1))
          }
          disabled={rollbackIndex >= history.length - 1}
          title="Sonraki Adıma İlerle"
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-35 text-slate-300"
        >
          <SkipForward className="w-3 h-3" />
        </button>
      </div>

      {/* Right: Live CAD Kernel Status Readout */}
      <div className="text-[11px] text-slate-400 truncate max-w-[36%] font-medium">
        {statusMessage}
      </div>
    </footer>
  );
};
