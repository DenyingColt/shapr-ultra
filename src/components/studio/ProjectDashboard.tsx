import React, { useEffect, useState } from 'react';
import {
  Box,
  Check,
  Cog,
  Copy,
  Cpu,
  Download,
  Edit3,
  FolderOpen,
  HardDrive,
  Layers,
  Plus,
  Scissors,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';
import { getProjectFromIDB } from '../../services/projectStorage';
import { shareOrDownloadCADFile } from '../../services/nativeBridge';

export const ProjectDashboard: React.FC = () => {
  const {
    isProjectHubOpen,
    setProjectHubOpen,
    savedProjects,
    activeProjectId,
    autoSaveStatus,
    syncProjectsFromIndexedDB,
    saveCurrentProjectToDevice,
    openSavedProjectById,
    duplicateSavedProjectById,
    renameSavedProjectById,
    deleteSavedProjectById,
    createNewEmptyProject,
    loadStarterMechanicalBracket,
    loadParametricEnclosureBox,
    loadPlanetaryGearAssembly,
    loadMedicalDispenserMechanism,
    loadArticulatedRobotJointAssembly,
  } = useCADStore();

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState<string>('');
  const [newProjectTitle, setNewProjectTitle] = useState<string>('Yeni Mekanik Tasarım');

  useEffect(() => {
    if (isProjectHubOpen) {
      syncProjectsFromIndexedDB();
    }
  }, [isProjectHubOpen, syncProjectsFromIndexedDB]);

  if (!isProjectHubOpen) return null;

  const handleExportProjectSHAPRX = async (id: string, name: string) => {
    const rec = await getProjectFromIDB(id);
    if (rec && rec.serializedPayload) {
      await shareOrDownloadCADFile(
        `${name.replace(/\s+/g, '_')}.shaprx`,
        rec.serializedPayload,
        'application/json',
        true
      );
    }
  };

  const formatDate = (val: string | number) => {
    const d = typeof val === 'number' ? new Date(val) : new Date(val);
    return d.toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-4 select-none">
      <div className="w-full max-w-6xl max-h-[92vh] bg-[#0B0D11] border border-slate-800/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Top Studio Banner */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-[#11151E] to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 flex items-center justify-center shadow-lg shadow-sky-500/25">
              <Box className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  SHAPR-PRO STUDIO • PROJE MERKEZİ
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <HardDrive className="w-3 h-3" /> IndexedDB Offline Ready
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Cihaz İçi Kalıcı Veritabanı, WebGL Önizleme Kartları & Endüstriyel Başlangıç Şablonları
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => saveCurrentProjectToDevice()}
              className="px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              Aktif Projeyi Şimdi Yedekle ({autoSaveStatus === 'saving' ? 'Kaydediliyor...' : 'Senkron'})
            </button>
            <button
              onClick={() => setProjectHubOpen(false)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition"
              title="3D Çalışma Alanına Dön"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-7">
          {/* 1. Industrial Starter Templates (4 Commercial Templates + Kinematic Robot Joint) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Endüstriyel Mühendislik Başlangıç Şablonları (Tek Tıkla Aç & Düzenle)
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newProjectTitle}
                  onChange={(e) => setNewProjectTitle(e.target.value)}
                  placeholder="Yeni Proje Adı..."
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
                />
                <button
                  onClick={() => createNewEmptyProject(newProjectTitle)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" /> Boş 3D Çalışma Alanı Aç
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
              {/* Template 1 */}
              <button
                onClick={() => loadStarterMechanicalBracket()}
                className="text-left group p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/60 transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 mb-2.5 group-hover:scale-105 transition">
                    <Cog className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-sky-300">
                    1. Rulman Yatağı & Dişli
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    CNC 6061 Alüminyum flanş bloğu, ISO M8 cıvata ve Z=18 pinyon dişli montajı.
                  </p>
                </div>
                <span className="mt-3 inline-block text-[10px] font-mono text-sky-400">
                  3 Gövde • CSG & Dişli →
                </span>
              </button>

              {/* Template 2 */}
              <button
                onClick={() => loadParametricEnclosureBox()}
                className="text-left group p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/60 transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-2.5 group-hover:scale-105 transition">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-indigo-300">
                    2. Elektronik Kutu & Kapak
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Kabuk (Shell 2.5mm) gövde, 4 adet M3 PCB dikmesi ve geçmeli (Snap-Fit) üst kapak.
                  </p>
                </div>
                <span className="mt-3 inline-block text-[10px] font-mono text-indigo-400">
                  3 Gövde • Shell & Snap-Fit →
                </span>
              </button>

              {/* Template 3 */}
              <button
                onClick={() => loadPlanetaryGearAssembly()}
                className="text-left group p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/60 transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2.5 group-hover:scale-105 transition">
                    <Cog className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-amber-300">
                    3. Planet Dişli Redüktör
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Merkez Güneş dişlisi (Z=18), 3 adet Planet pinyon (Z=12) ve taşıyıcı tabla.
                  </p>
                </div>
                <span className="mt-3 inline-block text-[10px] font-mono text-amber-400">
                  5 Gövde • Involüt Dişli →
                </span>
              </button>

              {/* Template 4 */}
              <button
                onClick={() => loadMedicalDispenserMechanism()}
                className="text-left group p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/60 transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2.5 group-hover:scale-105 transition">
                    <Scissors className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                    4. Medikal Bant & Kesici
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Laboratuvar bant tamburu, ergonomik ABS kaset, paslanmaz kesici bıçak ve yay.
                  </p>
                </div>
                <span className="mt-3 inline-block text-[10px] font-mono text-emerald-400">
                  4 Gövde • Medikal Cihaz →
                </span>
              </button>

              {/* Template 5: Articulated Hinge Joint */}
              <button
                onClick={() => loadArticulatedRobotJointAssembly()}
                className="text-left group p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/60 transition flex flex-col justify-between"
              >
                <div>
                  <div className="w-9 h-9 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-2.5 group-hover:scale-105 transition">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div className="text-xs font-bold text-white group-hover:text-rose-300">
                    5. Hareketli Mafsal & Yay
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    Canlı kinematik açı simülasyonlu robotik mafsal, helezon yay ve M10 emniyet cıvatası.
                  </p>
                </div>
                <span className="mt-3 inline-block text-[10px] font-mono text-rose-400">
                  3 Gövde • Canlı Kinematik →
                </span>
              </button>
            </div>
          </div>

          {/* 2. Saved Projects Grid (IndexedDB with WebGL Thumbnails) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-sky-400" />
                Cihazda Kayıtlı Projeler ({savedProjects.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Her 3 saniyede otomatik IndexedDB kaydı aktif
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedProjects.map((proj) => {
                const isCurrent = proj.id === activeProjectId;
                const isRenaming = renamingId === proj.id;

                return (
                  <div
                    key={proj.id}
                    className={`rounded-xl border transition overflow-hidden flex flex-col ${
                      isCurrent
                        ? 'bg-slate-900/95 border-sky-500/70 shadow-lg shadow-sky-500/10'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* WebGL Thumbnail Preview */}
                    <div
                      onClick={() => openSavedProjectById(proj.id)}
                      className="h-36 w-full bg-[#090D14] relative cursor-pointer overflow-hidden border-b border-slate-800/80 group"
                    >
                      {proj.thumbnailDataUrl ? (
                        <img
                          src={proj.thumbnailDataUrl}
                          alt={proj.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-600">
                          <Box className="w-10 h-10" />
                        </div>
                      )}
                      {isCurrent && (
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-sky-500 text-slate-950 font-bold text-[10px] uppercase tracking-wider shadow">
                          Açık Proje
                        </span>
                      )}
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-[10px] font-mono text-slate-300 border border-slate-700">
                        {proj.partCount ?? 1} Katı Gövde • {proj.fileSizeKb ?? 18} KB
                      </span>
                    </div>

                    {/* Metadata & Actions */}
                    <div className="p-3.5 flex-1 flex flex-col justify-between">
                      <div>
                        {isRenaming ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={renameDraft}
                              onChange={(e) => setRenameDraft(e.target.value)}
                              className="flex-1 px-2 py-1 rounded bg-slate-950 border border-sky-500 text-xs text-white"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                renameSavedProjectById(proj.id, renameDraft);
                                setRenamingId(null);
                              }}
                              className="p-1.5 rounded bg-emerald-600 text-white"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-sm font-bold text-white truncate">{proj.name}</div>
                        )}
                        <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                          Son Düzenleme: {formatDate(proj.updatedAt)}
                        </div>
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1.5">
                        <button
                          onClick={() => openSavedProjectById(proj.id)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-semibold transition text-center"
                        >
                          Projeyi Aç
                        </button>
                        <button
                          onClick={() => {
                            setRenamingId(proj.id);
                            setRenameDraft(proj.name);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Yeniden Adlandır"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => duplicateSavedProjectById(proj.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                          title="Kopyasını Oluştur (Duplicate)"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleExportProjectSHAPRX(proj.id, proj.name)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400"
                          title=".SHAPRX Dosyası İndir / Paylaş"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {savedProjects.length > 1 && (
                          <button
                            onClick={() => deleteSavedProjectById(proj.id)}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/40"
                            title="Projeyi Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
