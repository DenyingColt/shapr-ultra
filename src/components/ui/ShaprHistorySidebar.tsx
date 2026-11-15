import React, { useState } from 'react';
import {
  History,
  Filter,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  GitMerge,
  SkipBack,
  SkipForward,
  X,
  Sliders,
} from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';

export const ShaprHistorySidebar: React.FC = () => {
  const activeWorkspace = useCADStore((s) => s.activeWorkspace);
  const isHistorySidebarOpen = useCADStore((s) => s.isHistorySidebarOpen);
  const setHistorySidebarOpen = useCADStore((s) => s.setHistorySidebarOpen);
  const historyFilterBySelection = useCADStore((s) => s.historyFilterBySelection);
  const setHistoryFilterBySelection = useCADStore(
    (s) => s.setHistoryFilterBySelection
  );

  const history = useCADStore((s) => s.history);
  const rollbackIndex = useCADStore((s) => s.rollbackIndex);
  const setRollbackIndex = useCADStore((s) => s.setRollbackIndex);
  const toggleSuppressFeature = useCADStore((s) => s.toggleSuppressFeature);
  const updateHistoryStepParam = useCADStore((s) => s.updateHistoryStepParam);
  const mergeHistorySteps = useCADStore((s) => s.mergeHistorySteps);
  const selectedBodyIds = useCADStore((s) => s.selectedBodyIds);

  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(
    history[history.length - 1]?.id || null
  );

  if (activeWorkspace !== 'modeling' || !isHistorySidebarOpen) {
    return null;
  }

  const visibleHistory = historyFilterBySelection && selectedBodyIds.length > 0
    ? history.filter(
        (node) =>
          node.targetBodyIds.some((id) => selectedBodyIds.includes(id)) ||
          (node.resultBodyId && selectedBodyIds.includes(node.resultBodyId))
      )
    : history;

  return (
    <aside className="w-72 bg-[#0E131F]/95 border-l border-slate-800/90 flex flex-col shrink-0 z-20 select-none text-xs">
      {/* Header: Title, Selection Filter Toggle & Close */}
      <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <History className="w-4 h-4 text-sky-400" />
          <span className="font-bold text-slate-100 tracking-tight">
            Parametrik Geçmiş ({history.length})
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setHistoryFilterBySelection(!historyFilterBySelection)}
            title="Seçili 3B Gövdeye Ait Geçmiş Adımlarını Filtrele"
            className={`px-2 py-1 rounded-lg border text-[10px] font-semibold flex items-center gap-1 transition ${
              historyFilterBySelection
                ? 'bg-sky-600/30 border-sky-500 text-sky-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>Seçim</span>
          </button>

          <button
            onClick={() => setHistorySidebarOpen(false)}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            title="Geçmiş Panelini Gizle"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rollback Scrubber Controls */}
      <div className="px-3 py-1.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 font-mono">
          Adım: <strong className="text-sky-400">{rollbackIndex + 1}</strong> /{' '}
          {history.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setRollbackIndex(Math.max(-1, rollbackIndex - 1))}
            disabled={rollbackIndex < 0}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-300 flex items-center gap-1 border border-slate-800"
            title="Önceki Adıma Geri Sar"
          >
            <SkipBack className="w-3 h-3" /> Geri
          </button>
          <button
            onClick={() =>
              setRollbackIndex(Math.min(history.length - 1, rollbackIndex + 1))
            }
            disabled={rollbackIndex >= history.length - 1}
            className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-35 text-slate-300 flex items-center gap-1 border border-slate-800"
            title="Sonraki Adıma İlerle"
          >
            İleri <SkipForward className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expandable Shapr3D Parameter Cards List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {visibleHistory.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-slate-400 text-[11px]">
            {historyFilterBySelection
              ? 'Seçili gövdeye bağlı özel geçmiş adımı bulunamadı.'
              : 'Henüz parametrik işlem kaydı yok.'}
          </div>
        ) : (
          visibleHistory.map((node) => {
            const fullIdx = history.findIndex((h) => h.id === node.id);
            const isExpanded = expandedNodeId === node.id;
            const isRolledBack = fullIdx > rollbackIndex;
            const paramEntries = Object.entries(node.params || {});

            return (
              <div
                key={node.id}
                className={`rounded-xl border transition overflow-hidden ${
                  node.suppressed
                    ? 'bg-slate-950/50 border-slate-800/70 opacity-60'
                    : isRolledBack
                    ? 'bg-slate-950/40 border-slate-800/50 opacity-45'
                    : isExpanded
                    ? 'bg-slate-900/95 border-sky-500/70 shadow-lg'
                    : 'bg-slate-950/85 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Header */}
                <div
                  onClick={() => {
                    setExpandedNodeId(isExpanded ? null : node.id);
                    setRollbackIndex(fullIdx);
                  }}
                  className="px-2.5 py-2 cursor-pointer flex items-center justify-between gap-1.5"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    )}
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 shrink-0">
                      #{fullIdx + 1}
                    </span>
                    <span
                      className={`truncate font-semibold ${
                        node.suppressed
                          ? 'line-through text-slate-500'
                          : 'text-slate-200'
                      }`}
                    >
                      {node.name}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSuppressFeature(node.id);
                    }}
                    title="Bu Adımı Pasifleştir / Aktifleştir (Suppress Step)"
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-amber-400 shrink-0"
                  >
                    {node.suppressed ? (
                      <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* Expandable Parameter Card Body */}
                {isExpanded && (
                  <div className="px-3 pb-2.5 pt-1.5 border-t border-slate-800/80 bg-slate-950/90 space-y-2">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1 font-semibold uppercase text-sky-400">
                        <Sliders className="w-3 h-3" /> Parametre Kartı ({node.type})
                      </span>
                      <span className="font-mono">
                        {new Date(node.timestamp).toLocaleTimeString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {paramEntries.length === 0 ? (
                      <div className="text-[11px] text-slate-500 italic">
                        Doğrudan geometrik adım (sabit parametre).
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {paramEntries.map(([key, val]) => {
                          if (Array.isArray(val)) return null;
                          const isNumeric = typeof val === 'number';
                          const isBool = typeof val === 'boolean';

                          return (
                            <div
                              key={key}
                              className="flex items-center justify-between gap-2 text-[11px]"
                            >
                              <span className="text-slate-400 font-mono truncate">
                                {key}:
                              </span>

                              {isNumeric ? (
                                <input
                                  type="number"
                                  step={key === 'factor' ? 0.1 : 1}
                                  value={val}
                                  onChange={(e) =>
                                    updateHistoryStepParam(
                                      node.id,
                                      key,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-24 bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-md px-2 py-0.5 font-mono text-right text-sky-300 focus:outline-none"
                                />
                              ) : isBool ? (
                                <input
                                  type="checkbox"
                                  checked={val}
                                  onChange={(e) =>
                                    updateHistoryStepParam(
                                      node.id,
                                      key,
                                      e.target.checked
                                    )
                                  }
                                  className="accent-sky-500"
                                />
                              ) : (
                                <span className="font-mono text-amber-300 truncate max-w-[110px]">
                                  {String(val)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer: Merge History Steps (Shapr3D History Compaction) */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-950/90 space-y-1.5">
        <button
          onClick={mergeHistorySteps}
          disabled={history.length <= 1}
          className="w-full py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-sky-600/30 disabled:opacity-40 border border-slate-700/80 text-slate-200 font-semibold flex items-center justify-center gap-1.5 transition"
          title="Tüm Geçmiş Adımlarını Tek Bir Baz Gövdede Birleştir (Merge History Steps)"
        >
          <GitMerge className="w-3.5 h-3.5 text-sky-400" />
          <span>Geçmiş Adımlarını Birleştir</span>
        </button>
      </div>
    </aside>
  );
};
