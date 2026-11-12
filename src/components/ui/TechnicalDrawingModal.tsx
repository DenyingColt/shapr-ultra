import React, { useMemo, useState } from 'react';
import { X, Download, Copy, FileText, Code2 } from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import {
  exportProjectToOpenSCAD,
  generateOrthographicBlueprintSVG,
  triggerBrowserDownload,
} from '../../kernel/fileIO';

export const TechnicalDrawingModal: React.FC = () => {
  const isOpen = useCADStore((s) => s.isBlueprintModalOpen);
  const setOpen = useCADStore((s) => s.setBlueprintModalOpen);
  const projectName = useCADStore((s) => s.projectName);
  const bodies = useCADStore((s) => s.bodies);
  const variables = useCADStore((s) => s.variables);
  const history = useCADStore((s) => s.history);
  const unit = useCADStore((s) => s.unit);

  const [activeTab, setActiveTab] = useState<'blueprint' | 'openscad'>('blueprint');

  const blueprintSvg = useMemo(() => {
    if (!isOpen) return '';
    return generateOrthographicBlueprintSVG(projectName, bodies, unit);
  }, [isOpen, projectName, bodies, unit]);

  const openScadCode = useMemo(() => {
    if (!isOpen) return '';
    return exportProjectToOpenSCAD(projectName, bodies, variables, history);
  }, [isOpen, projectName, bodies, variables, history]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('blueprint')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  activeTab === 'blueprint'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>ISO 4-Görünüş Teknik Resim (Blueprint)</span>
              </button>

              <button
                onClick={() => setActiveTab('openscad')}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                  activeTab === 'openscad'
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Canlı OpenSCAD (.scad) Kaynak Kodu</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'blueprint' ? (
              <button
                onClick={() =>
                  triggerBrowserDownload(
                    `${projectName}_Teknik_Resim.svg`,
                    blueprintSvg,
                    'image/svg+xml'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Teknik Resmi İndir (.SVG)</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigator.clipboard.writeText(openScadCode)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Kodu Kopyala</span>
                </button>
                <button
                  onClick={() =>
                    triggerBrowserDownload(
                      `${projectName}.scad`,
                      openScadCode,
                      'text/plain'
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.SCAD Dosyası İndir</span>
                </button>
              </>
            )}

            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 bg-slate-950 flex items-center justify-center">
          {activeTab === 'blueprint' ? (
            <div
              className="w-full h-full bg-white rounded-xl overflow-hidden shadow-inner flex items-center justify-center"
              dangerouslySetInnerHTML={{ __html: blueprintSvg }}
            />
          ) : (
            <textarea
              readOnly
              value={openScadCode}
              className="w-full h-full bg-slate-900 border border-slate-800 rounded-xl p-4 font-mono text-xs text-sky-300 leading-relaxed focus:outline-none resize-none"
            />
          )}
        </div>
      </div>
    </div>
  );
};
