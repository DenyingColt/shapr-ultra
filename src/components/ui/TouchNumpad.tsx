import React, { useState } from 'react';
import { Delete, GripHorizontal, Variable, Check, RotateCcw } from 'lucide-react';
import { ParametricVariable } from '../../types/cad';
import { triggerHapticPulse } from '../../services/nativeBridge';

interface TouchNumpadProps {
  value: string;
  onChange: (nextVal: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  variables: ParametricVariable[];
}

export const TouchNumpad: React.FC<TouchNumpadProps> = ({
  value,
  onChange,
  onCommit,
  onCancel,
  variables,
}) => {
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const appendToken = (token: string) => {
    triggerHapticPulse('snap');
    if (value === '0' && /^[0-9]$/.test(token)) {
      onChange(token);
    } else {
      onChange(value + token);
    }
  };

  const handleHalf = () => {
    triggerHapticPulse('snap');
    onChange(`(${value || '0'}) / 2`);
  };

  const handleDouble = () => {
    triggerHapticPulse('snap');
    onChange(`(${value || '0'}) * 2`);
  };

  const handleToggleSign = () => {
    triggerHapticPulse('snap');
    if (value.startsWith('-')) {
      onChange(value.slice(1));
    } else {
      onChange(`-${value}`);
    }
  };

  const handleBackspace = () => {
    triggerHapticPulse('snap');
    onChange(value.length > 1 ? value.slice(0, -1) : '0');
  };

  const handleClear = () => {
    triggerHapticPulse('snap');
    onChange('0');
  };

  return (
    <div
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
      }}
      className="mt-2 w-[336px] rounded-2xl bg-[#0B0E15]/95 backdrop-blur-2xl border border-slate-700/90 shadow-2xl p-3 select-none text-white"
    >
      {/* Draggable Header + Variable Dropdown */}
      <div
        onPointerDown={(e) => {
          setDragging(true);
          setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!dragging) return;
          setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
        }}
        onPointerUp={() => setDragging(false)}
        className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-sky-400">
          <GripHorizontal className="w-4 h-4 text-slate-500" />
          <span>DOKUNMATİK CAD NUMPAD</span>
        </div>

        {/* Global Variable Selector */}
        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <Variable className="w-3.5 h-3.5 text-amber-400" />
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                appendToken(e.target.value);
              }
            }}
            className="bg-slate-900 border border-slate-700 rounded-md px-1.5 py-0.5 text-[10px] font-mono text-amber-300 focus:outline-none"
          >
            <option value="">fx Değişken Ekle...</option>
            {variables.map((v) => (
              <option key={v.id} value={v.name}>
                {v.name} ({v.value}
                {v.unit === 'unitless' ? '' : v.unit})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Preset & Unit Row */}
      <div className="grid grid-cols-6 gap-1.5 mb-2">
        <button
          type="button"
          onClick={handleHalf}
          className="py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-[11px] font-mono font-bold text-indigo-300"
        >
          ÷2
        </button>
        <button
          type="button"
          onClick={handleDouble}
          className="py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-[11px] font-mono font-bold text-indigo-300"
        >
          ×2
        </button>
        <button
          type="button"
          onClick={() => appendToken('PI')}
          className="py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-mono font-bold text-amber-300"
        >
          π (PI)
        </button>
        <button
          type="button"
          onClick={() => appendToken('mm')}
          className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300"
        >
          mm
        </button>
        <button
          type="button"
          onClick={() => appendToken('cm')}
          className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300"
        >
          cm
        </button>
        <button
          type="button"
          onClick={() => appendToken('deg')}
          className="py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300"
        >
          deg°
        </button>
      </div>

      {/* Main Hardware Calculator Keypad */}
      <div className="grid grid-cols-5 gap-1.5">
        {/* Row 1 */}
        {['7', '8', '9'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => appendToken(d)}
            className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-sky-600 border border-slate-800 text-sm font-mono font-bold transition"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => appendToken(' + ')}
          className="h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-sky-400 font-mono font-bold text-sm"
        >
          +
        </button>
        <button
          type="button"
          onClick={handleBackspace}
          className="h-10 rounded-xl bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/40 text-rose-300 flex items-center justify-center"
          title="Geri Sil"
        >
          <Delete className="w-4 h-4" />
        </button>

        {/* Row 2 */}
        {['4', '5', '6'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => appendToken(d)}
            className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-sky-600 border border-slate-800 text-sm font-mono font-bold transition"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => appendToken(' - ')}
          className="h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-sky-400 font-mono font-bold text-sm"
        >
          −
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold"
          title="Sıfırla (AC)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        {/* Row 3 */}
        {['1', '2', '3'].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => appendToken(d)}
            className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-sky-600 border border-slate-800 text-sm font-mono font-bold transition"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => appendToken(' * ')}
          className="h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-sky-400 font-mono font-bold text-sm"
        >
          ×
        </button>
        <button
          type="button"
          onClick={() => appendToken('(')}
          className="h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-300 font-mono text-xs"
        >
          ( )
        </button>

        {/* Row 4 */}
        <button
          type="button"
          onClick={handleToggleSign}
          className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-mono font-bold text-slate-300"
        >
          ±
        </button>
        <button
          type="button"
          onClick={() => appendToken('0')}
          className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-sky-600 border border-slate-800 text-sm font-mono font-bold transition"
        >
          0
        </button>
        <button
          type="button"
          onClick={() => appendToken('.')}
          className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-sm font-mono font-bold"
        >
          .
        </button>
        <button
          type="button"
          onClick={() => appendToken(' / ')}
          className="h-10 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-sky-400 font-mono font-bold text-sm"
        >
          ÷
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHapticPulse('commit');
            onCommit();
          }}
          className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center shadow-lg shadow-emerald-600/30"
          title="Uygula (=)"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
        <span>Tablet / S-Pen Hassas Ölçü Girişi</span>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-white underline"
        >
          Kapat
        </button>
      </div>
    </div>
  );
};
