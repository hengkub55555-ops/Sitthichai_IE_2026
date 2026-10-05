import React, { useState } from 'react';
import {
  Layers,
  CopyPlus,
  Plus,
  Trash2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { ProductionRow } from '../types/manpower';
import { recalculateRowMetrics } from '../data/initialManpowerData';

interface BLineProcessBuilderProps {
  rows: ProductionRow[];
  workingHoursPerShift: number;
  onGenerateBLineFromLineA: () => void;
  onAddBLineProcessPair: (newRows: ProductionRow[]) => void;
  onClearBLine: () => void;
  onFocusBLineTable: () => void;
}

const STANDARD_PROCESS_PRESETS = [
  { stationNo: 1, name: 'Roll former', uph: 200, ct: 15, stdMp: 12 },
  { stationNo: 2, name: 'Inner Box line.1', uph: 100, ct: 31, stdMp: 34 },
  { stationNo: 2, name: 'Inner Box line.2', uph: 100, ct: 31, stdMp: 37 },
  { stationNo: 3, name: 'Cab pre-assy Line.1', uph: 100, ct: 29, stdMp: 30 },
  { stationNo: 3, name: 'Cab pre-assy Line.2', uph: 100, ct: 31, stdMp: 26 },
  { stationNo: 4, name: 'Cabinet PU Foam line.1', uph: 100, ct: 29, stdMp: 28 },
  { stationNo: 4, name: 'Cabinet PU Foam line.2', uph: 100, ct: 31, stdMp: 16 },
  { stationNo: 5, name: "System ass'y", uph: 200, ct: 15, stdMp: 34 },
  { stationNo: 6, name: 'Vacuum & Assembly Door Maching', uph: 200, ct: 15, stdMp: 52 },
  { stationNo: 7, name: 'Cooling Test', uph: 200, ct: 15, stdMp: 10 },
  { stationNo: 8, name: 'Fina&Packing I', uph: 200, ct: 15, stdMp: 39 },
];

export const BLineProcessBuilder: React.FC<BLineProcessBuilderProps> = ({
  rows,
  workingHoursPerShift,
  onGenerateBLineFromLineA,
  onAddBLineProcessPair,
  onClearBLine,
  onFocusBLineTable,
}) => {
  const bLineRows = rows.filter((r) => r.productionLine === 'Line-B');
  const bLineDlRows = bLineRows.filter((r) => r.type === 'DL' && !r.isSpare);
  const bLineIdlRows = bLineRows.filter((r) => r.type === 'IDL');
  const bLineSpareRows = bLineRows.filter((r) => r.isSpare);

  const totalBLineDl = bLineDlRows.reduce((s, r) => s + r.stdMp, 0);
  const totalBLineIdl = bLineIdlRows.reduce((s, r) => s + r.stdMp, 0);
  const totalBLineSpare = bLineSpareRows.reduce((s, r) => s + r.stdMp, 0);
  const totalBLineGrand = totalBLineDl + totalBLineIdl + totalBLineSpare;

  const [stationNo, setStationNo] = useState<string>('1');
  const [processName, setProcessName] = useState<string>('');
  const [laborType, setLaborType] = useState<'DL' | 'IDL'>('DL');
  const [shiftMode, setShiftMode] = useState<'Both' | 'Shift-A' | 'Shift-B'>('Both');
  const [stdMpA, setStdMpA] = useState<string>('15');
  const [stdMpB, setStdMpB] = useState<string>('15');
  const [uph, setUph] = useState<string>('200');
  const [ct, setCt] = useState<string>('15');

  const handleSelectPreset = (presetIndex: string) => {
    const idx = parseInt(presetIndex, 10);
    if (isNaN(idx) || idx < 0 || idx >= STANDARD_PROCESS_PRESETS.length) return;
    const p = STANDARD_PROCESS_PRESETS[idx];
    setStationNo(String(p.stationNo));
    setProcessName(p.name);
    setLaborType('DL');
    setStdMpA(String(p.stdMp));
    setStdMpB(String(p.stdMp));
    setUph(String(p.uph));
    setCt(String(p.ct));
  };

  const handleAddProcessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = processName.trim();
    if (!cleanName) return;

    const stNo = laborType === 'DL' ? Math.max(1, parseInt(stationNo, 10) || 1) : null;
    const mpA = Math.max(0, parseInt(stdMpA, 10) || 0);
    const mpB = Math.max(0, parseInt(stdMpB, 10) || 0);
    const uphVal = laborType === 'DL' ? Math.max(1, parseInt(uph, 10) || 100) : null;
    const ctVal = laborType === 'DL' ? Math.max(1, parseInt(ct, 10) || 15) : null;

    const createdRows: ProductionRow[] = [];
    const now = Date.now();

    if (laborType === 'IDL') {
      createdRows.push({
        id: `bline-idl-${now}`,
        productionLine: 'Line-B',
        stationNo: null,
        detail: cleanName,
        stationGroup: 'Indirect Labor (IDL)',
        shift: 'Common',
        type: 'IDL',
        stdMp: mpA,
        uph: null,
        ct: null,
        upph: null,
        outputPerShift: null,
      });
    } else {
      const groupName = cleanName
        .replace(/line\s*\.\s*\d+/gi, '')
        .trim();

      if (shiftMode === 'Both' || shiftMode === 'Shift-A') {
        createdRows.push(
          recalculateRowMetrics(
            {
              id: `bline-dl-a-${now}`,
              productionLine: 'Line-B',
              stationNo: stNo,
              detail: cleanName.toUpperCase().includes('SHIFT')
                ? cleanName
                : `${cleanName} (Shift-A)`,
              stationGroup: groupName,
              shift: 'Shift-A',
              type: 'DL',
              stdMp: mpA,
              uph: uphVal,
              ct: ctVal,
              upph: null,
              outputPerShift: null,
            },
            workingHoursPerShift
          )
        );
      }

      if (shiftMode === 'Both' || shiftMode === 'Shift-B') {
        createdRows.push(
          recalculateRowMetrics(
            {
              id: `bline-dl-b-${now + 1}`,
              productionLine: 'Line-B',
              stationNo: stNo,
              detail: cleanName.toUpperCase().includes('SHIFT')
                ? cleanName
                : `${cleanName} (Shift-B)`,
              stationGroup: groupName,
              shift: 'Shift-B',
              type: 'DL',
              stdMp: shiftMode === 'Both' ? mpB : mpA,
              uph: uphVal,
              ct: ctVal,
              upph: null,
              outputPerShift: null,
            },
            workingHoursPerShift
          )
        );
      }
    }

    onAddBLineProcessPair(createdRows);
    setProcessName('');
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-indigo-50 text-indigo-700 mt-0.5">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                จัดการและเพิ่ม Process สายการผลิต B-Line (RF Production Line B Builder)
              </h2>
              {bLineRows.length > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  เปิดใช้งาน B-Line แล้ว ({bLineRows.length} รายการ · รวม {totalBLineGrand.toLocaleString()} คน)
                </span>
              ) : (
                <span className="text-xs text-slate-500">
                  · ยังไม่มีรายการ Process ใน B-Line (คลิกปุ่มด้านขวาเพื่อสร้างชุดมาตรฐาน หรือเพิ่มทีละ Process ด้านล่าง)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              เพิ่ม Process ของสายการผลิต B-Line ได้ทั้งแบบคัดลอกโครงสร้างมาตรฐาน 8 สถานีจาก Line A ในคลิกเดียว หรือกำหนดชื่อสถานี, STD MP (กะ A/B), UPH และ CT เองโดยตรงบนเว็บ
            </p>
          </div>
        </div>

        {/* Quick Actions for B-Line */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onGenerateBLineFromLineA}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <CopyPlus className="w-3.5 h-3.5" />
            {bLineRows.length === 0
              ? 'สร้าง Process B-Line มาตรฐานทั้งหมด (Clone จาก Line A)'
              : 'รีเซ็ต B-Line ตามโครงสร้าง Line A'}
          </button>

          {bLineRows.length > 0 && (
            <>
              <button
                type="button"
                onClick={onFocusBLineTable}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors whitespace-nowrap cursor-pointer"
              >
                ดูตาราง B-Line
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClearBLine}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors whitespace-nowrap cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                ล้างข้อมูล B-Line
              </button>
            </>
          )}
        </div>
      </div>

      {/* Custom B-Line Process Form */}
      <form onSubmit={handleAddProcessSubmit} className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          {/* Preset Quick Picker */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              เลือกแม่แบบ Process (หรือพิมพ์เอง)
            </label>
            <select
              defaultValue=""
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:border-indigo-600"
            >
              <option value="">-- เลือกสถานีมาตรฐาน --</option>
              {STANDARD_PROCESS_PRESETS.map((p, idx) => (
                <option key={p.name} value={idx}>
                  {p.stationNo}. {p.name} (MP:{p.stdMp}, UPH:{p.uph})
                </option>
              ))}
            </select>
          </div>

          {/* Type & Station No */}
          <div className="md:col-span-2 flex gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-slate-600 mb-1">ประเภท</label>
              <select
                value={laborType}
                onChange={(e) => setLaborType(e.target.value as 'DL' | 'IDL')}
                className="w-full text-xs bg-white border border-slate-300 rounded-md px-2 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
              >
                <option value="DL">DL</option>
                <option value="IDL">IDL</option>
              </select>
            </div>
            {laborType === 'DL' && (
              <div className="w-16">
                <label className="block text-[11px] font-medium text-slate-600 mb-1">No.</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={stationNo}
                  onChange={(e) => setStationNo(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-md px-2 py-2 focus:outline-none focus:border-indigo-600"
                />
              </div>
            )}
          </div>

          {/* Process Name */}
          <div className="md:col-span-3">
            <label className="block text-[11px] font-medium text-slate-600 mb-1">
              ชื่อ Process / สถานีใน B-Line
            </label>
            <input
              type="text"
              required
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              placeholder="เช่น Roll former B-Line, Sub-Assy..."
              className="w-full text-xs bg-white border border-slate-300 rounded-md px-3 py-2 focus:outline-none focus:border-indigo-600"
            />
          </div>

          {/* Shift Option & STD MP */}
          {laborType === 'DL' ? (
            <div className="md:col-span-4 grid grid-cols-4 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">กะทำงาน</label>
                <select
                  value={shiftMode}
                  onChange={(e) =>
                    setShiftMode(e.target.value as 'Both' | 'Shift-A' | 'Shift-B')
                  }
                  className="w-full text-xs bg-white border border-slate-300 rounded-md px-1.5 py-2 text-slate-800 focus:outline-none focus:border-indigo-600"
                >
                  <option value="Both">A + B (คู่)</option>
                  <option value="Shift-A">เฉพาะ A</option>
                  <option value="Shift-B">เฉพาะ B</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  {shiftMode === 'Both' ? 'MP (กะ A)' : 'STD MP'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={stdMpA}
                  onChange={(e) => {
                    setStdMpA(e.target.value);
                    setStdMpB(e.target.value);
                  }}
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-md px-2 py-2 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">UPH</label>
                <input
                  type="number"
                  min={1}
                  value={uph}
                  onChange={(e) => setUph(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-md px-2 py-2 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">CT (s)</label>
                <input
                  type="number"
                  min={1}
                  value={ct}
                  onChange={(e) => setCt(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-md px-2 py-2 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          ) : (
            <div className="md:col-span-4 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  จำนวนคน IDL (STD MP)
                </label>
                <input
                  type="number"
                  min={1}
                  value={stdMpA}
                  onChange={(e) => setStdMpA(e.target.value)}
                  className="w-full text-xs font-mono bg-white border border-slate-300 rounded-md px-2.5 py-2 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom Submit Row & B-Line Status Summary */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-mono tabular-nums">
            <span className="font-sans font-semibold text-indigo-900">
              สรุปยอด B-Line ปัจจุบัน:
            </span>
            <span>DL: <strong className="text-slate-900">{totalBLineDl}</strong> คน</span>
            <span aria-hidden="true">·</span>
            <span>IDL: <strong className="text-slate-900">{totalBLineIdl}</strong> คน</span>
            <span aria-hidden="true">·</span>
            <span>Spare: <strong className="text-slate-900">{totalBLineSpare}</strong> คน</span>
            <span aria-hidden="true">·</span>
            <span>รวม B-Line: <strong className="text-indigo-700">{totalBLineGrand}</strong> คน</span>
          </div>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่ม Process เข้าสู่สายการผลิต B-Line
          </button>
        </div>
      </form>
    </section>
  );
};
