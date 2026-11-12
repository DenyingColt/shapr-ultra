import React, { useState } from 'react';
import { X, Cog, Wrench, Activity, Link2 } from 'lucide-react';
import { useCADStore } from '../../store/useCADStore';

export const MechanicalMacrosModal: React.FC = () => {
  const isOpen = useCADStore((s) => s.isMacrosModalOpen);
  const setOpen = useCADStore((s) => s.setMacrosModalOpen);

  const addGearMacro = useCADStore((s) => s.addGearMacro);
  const addBoltOrNutMacro = useCADStore((s) => s.addBoltOrNutMacro);
  const addSpringMacro = useCADStore((s) => s.addSpringMacro);
  const addHingeJointMacro = useCADStore((s) => s.addHingeJointMacro);

  const [tab, setTab] = useState<'gear' | 'bolt' | 'spring' | 'hinge'>('gear');

  // Gear State
  const [moduleMm, setModuleMm] = useState(2.5);
  const [teeth, setTeeth] = useState(16);
  const [gearThick, setGearThick] = useState(12);
  const [pressureAngle, setPressureAngle] = useState(20);
  const [boreDia, setBoreDia] = useState(10);

  // Bolt / Nut State
  const [boltDia, setBoltDia] = useState(10);
  const [boltPitch, setBoltPitch] = useState(1.5);
  const [boltLen, setBoltLen] = useState(32);
  const [headH, setHeadH] = useState(7);
  const [isNut, setIsNut] = useState(false);

  // Spring State
  const [springDia, setSpringDia] = useState(24);
  const [wireDia, setWireDia] = useState(3);
  const [coils, setCoils] = useState(6);
  const [springLen, setSpringLen] = useState(40);

  // Articulated Hinge State
  const [hingeW, setHingeW] = useState(42);
  const [hingeL, setHingeL] = useState(34);
  const [hingeH, setHingeH] = useState(32);
  const [pinDia, setPinDia] = useState(10);
  const [clearance, setClearance] = useState(0.3);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cog className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white">
                Parametrik Mekanik Standart Parça Üretici
              </h2>
              <p className="text-[11px] text-slate-400">
                Involute Dişli, ISO Metrik Vida/Somun, Helezon Yay ve Hareketli Mafsal
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="grid grid-cols-4 border-b border-slate-800 bg-slate-950/60 text-xs font-semibold">
          <button
            onClick={() => setTab('gear')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
              tab === 'gear'
                ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Cog className="w-3.5 h-3.5" />
            <span>Dişli Çark</span>
          </button>

          <button
            onClick={() => setTab('bolt')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
              tab === 'bolt'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>ISO Vida/Somun</span>
          </button>

          <button
            onClick={() => setTab('spring')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
              tab === 'spring'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Helezon Yay</span>
          </button>

          <button
            onClick={() => setTab('hinge')}
            className={`py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition ${
              tab === 'hinge'
                ? 'border-purple-400 text-purple-300 bg-purple-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Mafsal Eklem</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {tab === 'gear' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Modül (m - mm): <strong className="text-white">{moduleMm}</strong>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={6}
                    step={0.25}
                    value={moduleMm}
                    onChange={(e) => setModuleMm(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Diş Sayısı (Z): <strong className="text-white">{teeth}</strong>
                  </label>
                  <input
                    type="range"
                    min={8}
                    max={48}
                    step={1}
                    value={teeth}
                    onChange={(e) => setTeeth(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Dişli Kalınlığı (mm):{' '}
                    <strong className="text-white">{gearThick} mm</strong>
                  </label>
                  <input
                    type="range"
                    min={4}
                    max={40}
                    step={1}
                    value={gearThick}
                    onChange={(e) => setGearThick(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Merkez Mil Çapı (mm):{' '}
                    <strong className="text-white">Ø{boreDia} mm</strong>
                  </label>
                  <input
                    type="range"
                    min={4}
                    max={30}
                    step={1}
                    value={boreDia}
                    onChange={(e) => setBoreDia(Number(e.target.value))}
                    className="w-full accent-amber-400"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 flex justify-between">
                <span>Taksimat Çapı (Pitch Ø): {(moduleMm * teeth).toFixed(1)} mm</span>
                <span>Kavrama Açısı: {pressureAngle}°</span>
              </div>

              <button
                onClick={() =>
                  addGearMacro({
                    moduleMm,
                    teeth,
                    thicknessMm: gearThick,
                    pressureAngleDeg: pressureAngle,
                    boreDiameterMm: boreDia,
                  })
                }
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition"
              >
                Involute Dişli Çarkı Sahneye Ekle
              </button>
            </>
          )}

          {tab === 'bolt' && (
            <>
              <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <button
                  onClick={() => setIsNut(false)}
                  className={`flex-1 py-1.5 rounded-lg font-semibold ${
                    !isNut ? 'bg-sky-600 text-white' : 'text-slate-400'
                  }`}
                >
                  ISO Altıgen Cıvata (Vida)
                </button>
                <button
                  onClick={() => setIsNut(true)}
                  className={`flex-1 py-1.5 rounded-lg font-semibold ${
                    isNut ? 'bg-sky-600 text-white' : 'text-slate-400'
                  }`}
                >
                  ISO Altıgen Somun (Nut)
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Anma Çapı: <strong className="text-white">M{boltDia}</strong>
                  </label>
                  <input
                    type="range"
                    min={4}
                    max={20}
                    step={2}
                    value={boltDia}
                    onChange={(e) => setBoltDia(Number(e.target.value))}
                    className="w-full accent-sky-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Diş Adımı (Pitch):{' '}
                    <strong className="text-white">{boltPitch} mm</strong>
                  </label>
                  <input
                    type="range"
                    min={0.75}
                    max={2.5}
                    step={0.25}
                    value={boltPitch}
                    onChange={(e) => setBoltPitch(Number(e.target.value))}
                    className="w-full accent-sky-400"
                  />
                </div>
                {!isNut && (
                  <div>
                    <label className="text-slate-400 block mb-1">
                      Vida Boyu (L):{' '}
                      <strong className="text-white">{boltLen} mm</strong>
                    </label>
                    <input
                      type="range"
                      min={12}
                      max={80}
                      step={2}
                      value={boltLen}
                      onChange={(e) => setBoltLen(Number(e.target.value))}
                      className="w-full accent-sky-400"
                    />
                  </div>
                )}
                <div>
                  <label className="text-slate-400 block mb-1">
                    Kafa / Somun Kalınlığı:{' '}
                    <strong className="text-white">{headH} mm</strong>
                  </label>
                  <input
                    type="range"
                    min={4}
                    max={18}
                    step={1}
                    value={headH}
                    onChange={(e) => setHeadH(Number(e.target.value))}
                    className="w-full accent-sky-400"
                  />
                </div>
              </div>

              <button
                onClick={() =>
                  addBoltOrNutMacro({
                    nominalDiameterMm: boltDia,
                    pitchMm: boltPitch,
                    lengthMm: boltLen,
                    headHeightMm: headH,
                    isNut,
                  })
                }
                className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg transition"
              >
                {isNut ? `ISO M${boltDia} Somun Ekle` : `ISO M${boltDia}x${boltLen} Cıvata Ekle`}
              </button>
            </>
          )}

          {tab === 'spring' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Ortalama Yay Çapı:{' '}
                    <strong className="text-white">{springDia} mm</strong>
                  </label>
                  <input
                    type="range"
                    min={12}
                    max={50}
                    step={2}
                    value={springDia}
                    onChange={(e) => setSpringDia(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Tel Çapı (d):{' '}
                    <strong className="text-white">{wireDia} mm</strong>
                  </label>
                  <input
                    type="range"
                    min={1.5}
                    max={6}
                    step={0.5}
                    value={wireDia}
                    onChange={(e) => setWireDia(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Aktif Sarım Sayısı:{' '}
                    <strong className="text-white">{coils} Tur</strong>
                  </label>
                  <input
                    type="range"
                    min={3}
                    max={14}
                    step={1}
                    value={coils}
                    onChange={(e) => setCoils(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Serbest Boy (L0):{' '}
                    <strong className="text-white">{springLen} mm</strong>
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={90}
                    step={2}
                    value={springLen}
                    onChange={(e) => setSpringLen(Number(e.target.value))}
                    className="w-full accent-emerald-400"
                  />
                </div>
              </div>

              <button
                onClick={() =>
                  addSpringMacro({
                    meanDiameterMm: springDia,
                    wireDiameterMm: wireDia,
                    activeCoils: coils,
                    freeLengthMm: springLen,
                  })
                }
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition"
              >
                Helezon Yayı Sahneye Ekle
              </button>
            </>
          )}

          {tab === 'hinge' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">
                    Çatal Genişliği (W):{' '}
                    <strong className="text-white">{hingeW} mm</strong>
                  </label>
                  <input
                    type="range"
                    min={24}
                    max={80}
                    step={2}
                    value={hingeW}
                    onChange={(e) => setHingeW(Number(e.target.value))}
                    className="w-full accent-purple-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Mafsal Yüksekliği (H):{' '}
                    <strong className="text-white">{hingeH} mm</strong>
                  </label>
                  <input
                    type="range"
                    min={20}
                    max={64}
                    step={2}
                    value={hingeH}
                    onChange={(e) => setHingeH(Number(e.target.value))}
                    className="w-full accent-purple-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Merkez Pim Çapı:{' '}
                    <strong className="text-white">Ø{pinDia} mm</strong>
                  </label>
                  <input
                    type="range"
                    min={6}
                    max={20}
                    step={1}
                    value={pinDia}
                    onChange={(e) => setPinDia(Number(e.target.value))}
                    className="w-full accent-purple-400"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    3D Yazıcı Tolerans Boşluğu:{' '}
                    <strong className="text-emerald-400">
                      {clearance.toFixed(2)} mm
                    </strong>
                  </label>
                  <input
                    type="range"
                    min={0.15}
                    max={0.6}
                    step={0.05}
                    value={clearance}
                    onChange={(e) => setClearance(Number(e.target.value))}
                    className="w-full accent-purple-400"
                  />
                </div>
              </div>

              <button
                onClick={() =>
                  addHingeJointMacro({
                    widthMm: hingeW,
                    lengthMm: hingeL,
                    heightMm: hingeH,
                    pinDiameterMm: pinDia,
                    clearanceMm: clearance,
                  })
                }
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition"
              >
                Mekanik Mafsal Çatalını Sahneye Ekle
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
