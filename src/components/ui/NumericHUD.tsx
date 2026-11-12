import React, { useEffect, useState } from 'react';
import { Check, X, Calculator, Keyboard } from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import { evaluateParametricExpression } from '../../kernel/mathParser';
import { BooleanMode } from '../../types/cad';
import { TouchNumpad } from './TouchNumpad';

export const NumericHUD: React.FC = () => {
  const numericHud = useCADStore((s) => s.numericHud);
  const closeNumericHUD = useCADStore((s) => s.closeNumericHUD);
  const variables = useCADStore((s) => s.variables);
  const unit = useCADStore((s) => s.unit);

  const extrudeDraftAngle = useCADStore((s) => s.extrudeDraftAngle);
  const extrudeBooleanMode = useCADStore((s) => s.extrudeBooleanMode);
  const setExtrudeParams = useCADStore((s) => s.setExtrudeParams);
  const commitExtrude = useCADStore((s) => s.commitExtrude);

  const setFilletChamferAmount = useCADStore((s) => s.setFilletChamferAmount);
  const commitFilletChamfer = useCADStore((s) => s.commitFilletChamfer);

  const setShellThickness = useCADStore((s) => s.setShellThickness);
  const commitShell = useCADStore((s) => s.commitShell);
  const commitRevolve = useCADStore((s) => s.commitRevolve);

  const [exprInput, setExprInput] = useState(numericHud.value);
  const [draftInput, setDraftInput] = useState(String(extrudeDraftAngle));
  const [showTouchNumpad, setShowTouchNumpad] = useState(true);

  useEffect(() => {
    setExprInput(numericHud.value);
  }, [numericHud.value, numericHud.visible]);

  if (!numericHud.visible) return null;

  const evalPreview = evaluateParametricExpression(exprInput, variables, unit);

  const handleApply = () => {
    if (!evalPreview.valid) return;
    const val = evalPreview.value;

    if (numericHud.targetField === 'extrude') {
      const draftEval = evaluateParametricExpression(draftInput, variables, unit);
      setExtrudeParams({
        distance: val,
        draftAngle: draftEval.valid ? draftEval.value : 0,
      });
      commitExtrude(val);
    } else if (numericHud.targetField === 'fillet') {
      setFilletChamferAmount(val);
      commitFilletChamfer(val);
    } else if (numericHud.targetField === 'shell') {
      setShellThickness(val);
      commitShell(val);
    } else if (numericHud.targetField === 'revolve') {
      commitRevolve(val);
    } else {
      closeNumericHUD();
    }
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-auto select-none flex flex-col items-center">
      <div className="bg-slate-900/95 backdrop-blur-xl border border-sky-500/60 rounded-2xl p-3 shadow-2xl flex flex-col gap-2 min-w-[336px]">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-sky-400 flex items-center gap-1.5">
            <Calculator className="w-3.5 h-3.5" />
            {numericHud.label}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-emerald-400 font-semibold">
              {evalPreview.valid
                ? `= ${evalPreview.value.toFixed(2)} ${numericHud.unit}`
                : 'Geçersiz Formül'}
            </span>
            <button
              type="button"
              onClick={() => setShowTouchNumpad((v) => !v)}
              className={`p-1 rounded border text-[10px] flex items-center gap-1 ${
                showTouchNumpad
                  ? 'bg-sky-500/20 border-sky-500/50 text-sky-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
              title="Dokunmatik Numpad Aç/Kapat"
            >
              <Keyboard className="w-3 h-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="text"
            value={exprInput}
            onChange={(e) => setExprInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApply();
              if (e.key === 'Escape') closeNumericHUD();
            }}
            placeholder="Örn: 25 veya base_width / 2"
            className="flex-1 bg-slate-950 border border-slate-700 focus:border-sky-400 rounded-lg px-2.5 py-1.5 font-mono text-xs text-white focus:outline-none"
          />

          <button
            onClick={handleApply}
            className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition"
            title="Onayla (Enter)"
          >
            <Check className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={closeNumericHUD}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="İptal (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {numericHud.targetField === 'extrude' && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px]">
            <div className="flex items-center justify-between gap-1">
              <span className="text-slate-400">Draft Açısı (°):</span>
              <input
                type="number"
                min={-45}
                max={45}
                value={draftInput}
                onChange={(e) => setDraftInput(e.target.value)}
                className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-between gap-1">
              <span className="text-slate-400">Mod:</span>
              <select
                value={extrudeBooleanMode}
                onChange={(e) =>
                  setExtrudeParams({
                    booleanMode: e.target.value as BooleanMode,
                  })
                }
                className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-[11px] text-white"
              >
                <option value="union">Birleştir (Union)</option>
                <option value="subtract">Kes / Oyuk (Cut)</option>
                <option value="intersect">Kesişim</option>
                <option value="new_body">Yeni Gövde</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {showTouchNumpad && (
        <TouchNumpad
          value={exprInput}
          onChange={setExprInput}
          onCommit={handleApply}
          onCancel={closeNumericHUD}
          variables={variables}
        />
      )}
    </div>
  );
};
