import React from 'react';
import {
  ArrowLeftRight,
  Compass,
  Layers,
  Magnet,
  MousePointerSquareDashed,
  Redo2,
  Undo2,
} from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';

export const ThumbModifierPad: React.FC = () => {
  const thumbModifiers = useCADStore((s) => s.thumbModifiers);
  const toggleThumbModifier = useCADStore((s) => s.toggleThumbModifier);
  const undo = useCADStore((s) => s.undo);
  const redo = useCADStore((s) => s.redo);
  const undoStackLen = useCADStore((s) => s.undoStack.length);
  const redoStackLen = useCADStore((s) => s.redoStack.length);

  const positionClass = thumbModifiers.leftHanded
    ? 'right-4 bottom-24'
    : 'left-4 bottom-24';

  return (
    <div
      className={`fixed ${positionClass} z-30 pointer-events-auto select-none flex flex-col gap-1.5 bg-[#0D1017]/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-2 shadow-2xl`}
    >
      <div className="flex items-center justify-between px-1 pb-1 border-b border-slate-800/80">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
          Başparmak Pad
        </span>
        <button
          onClick={() => toggleThumbModifier('leftHanded')}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400 transition"
          title="Sol / Sağ El Konumu Değiştir"
        >
          <ArrowLeftRight className="w-3 h-3" />
        </button>
      </div>

      {/* Multi-Select (Shift) */}
      <button
        onClick={() => toggleThumbModifier('multiSelect')}
        className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-2 transition ${
          thumbModifiers.multiSelect
            ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-md shadow-sky-500/20'
            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
        }`}
        title="Çoklu Seçim Kilidi (Shift Etkisi - Kalem ile birden fazla yüzey/kenar seçin)"
      >
        <Layers className="w-3.5 h-3.5 text-sky-400" />
        <span>Çoklu Seç (Shift)</span>
      </button>

      {/* Snap Override (Alt) */}
      <button
        onClick={() => toggleThumbModifier('snapOverride')}
        className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-2 transition ${
          thumbModifiers.snapOverride
            ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-md shadow-amber-500/20'
            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
        }`}
        title="Grid & Açı Mıknatısını Devre Dışı Bırak (Alt Serbest Çizim)"
      >
        <Magnet className="w-3.5 h-3.5 text-amber-400" />
        <span>Serbest (Snap Kapat)</span>
      </button>

      {/* Construction Mode */}
      <button
        onClick={() => toggleThumbModifier('constructionMode')}
        className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-2 transition ${
          thumbModifiers.constructionMode
            ? 'bg-orange-500/25 border-orange-400 text-orange-200 shadow-md shadow-orange-500/20'
            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
        }`}
        title="Yardımcı Eksen / Konstrüksiyon Çizgisi Modu"
      >
        <Compass className="w-3.5 h-3.5 text-orange-400" />
        <span>Konstrüksiyon</span>
      </button>

      {/* Box / Lasso Select */}
      <button
        onClick={() => toggleThumbModifier('boxSelectMode')}
        className={`px-2.5 py-2 rounded-xl border text-[11px] font-semibold flex items-center gap-2 transition ${
          thumbModifiers.boxSelectMode
            ? 'bg-indigo-500/25 border-indigo-400 text-indigo-200 shadow-md shadow-indigo-500/20'
            : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
        }`}
        title="Kutu Seçim Modu"
      >
        <MousePointerSquareDashed className="w-3.5 h-3.5 text-indigo-400" />
        <span>Çoklu Kutu Seç</span>
      </button>

      {/* Quick Thumb Undo / Redo */}
      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80">
        <button
          onClick={undo}
          disabled={undoStackLen === 0}
          className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-300"
          title="Geri Al (2 Parmak Çift Dokunuş)"
        >
          <Undo2 className="w-3.5 h-3.5" /> Geri
        </button>
        <button
          onClick={redo}
          disabled={redoStackLen === 0}
          className="py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 border border-slate-800 flex items-center justify-center gap-1 text-[10px] font-semibold text-slate-300"
          title="İleri Al (3 Parmak Dokunuş)"
        >
          <Redo2 className="w-3.5 h-3.5" /> İleri
        </button>
      </div>
    </div>
  );
};
