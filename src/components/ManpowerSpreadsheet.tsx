import React, { useState } from 'react';
import { Plus, Trash2, Info, Check, CopyPlus } from 'lucide-react';
import { ProductionRow, ProductionLineId } from '../types/manpower';
import { recalculateRowMetrics } from '../data/initialManpowerData';

interface ManpowerSpreadsheetProps {
  rows: ProductionRow[];
  workingHoursPerShift: number;
  lineFilter: 'All' | 'Line-A' | 'Line-B';
  shiftFilter: 'All' | 'Shift-A' | 'Shift-B';
  categoryFilter: 'All' | 'DL' | 'IDL';
  searchQuery: string;
  onUpdateRow: (updatedRow: ProductionRow) => void;
  onAddRow: (newRow: ProductionRow) => void;
  onDeleteRow: (id: string) => void;
  onGenerateBLineFromLineA: () => void;
}

export const ManpowerSpreadsheet: React.FC<ManpowerSpreadsheetProps> = ({
  rows,
  workingHoursPerShift,
  lineFilter,
  shiftFilter,
  categoryFilter,
  searchQuery,
  onUpdateRow,
  onAddRow,
  onDeleteRow,
  onGenerateBLineFromLineA,
}) => {
  const [newLine, setNewLine] = useState<ProductionLineId>(
    lineFilter === 'Line-B' ? 'Line-B' : 'Line-A'
  );
  const [newDetail, setNewDetail] = useState('');
  const [newStationNo, setNewStationNo] = useState<string>('1');
  const [newType, setNewType] = useState<'DL' | 'IDL'>('DL');
  const [newShift, setNewShift] = useState<'Shift-A' | 'Shift-B' | 'Common'>('Shift-A');
  const [newStdMp, setNewStdMp] = useState<string>('12');
  const [newUph, setNewUph] = useState<string>('200');
  const [newCt, setNewCt] = useState<string>('15');
  const [savedIndicator, setSavedIndicator] = useState(false);

  const triggerSavedBadge = () => {
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 1800);
  };

  // Filter rows for display
  const filteredRows = rows.filter((r) => {
    const rLine = r.productionLine || 'Line-A';
    if (lineFilter !== 'All' && rLine !== lineFilter) {
      return false;
    }
    if (shiftFilter !== 'All' && r.shift !== shiftFilter && r.shift !== 'Common') {
      return false;
    }
    if (categoryFilter !== 'All' && r.type !== categoryFilter) {
      return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (
        r.detail.toLowerCase().includes(q) ||
        r.stationGroup.toLowerCase().includes(q) ||
        String(r.stationNo ?? '').includes(q)
      );
    }
    return true;
  });

  const handleNumberChange = (
    row: ProductionRow,
    field: 'stdMp' | 'uph' | 'ct',
    rawValue: string
  ) => {
    const num = Math.max(0, parseInt(rawValue || '0', 10) || 0);
    const updated: ProductionRow = {
      ...row,
      [field]: num,
    };
    onUpdateRow(recalculateRowMetrics(updated, workingHoursPerShift));
    triggerSavedBadge();
  };

  const handleCreateRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDetail.trim()) return;

    const stdMpNum = Math.max(0, parseInt(newStdMp, 10) || 0);
    const uphNum = newType === 'DL' ? Math.max(1, parseInt(newUph, 10) || 100) : null;
    const ctNum = newType === 'DL' ? Math.max(1, parseInt(newCt, 10) || 15) : null;
    const stNo = newType === 'DL' ? parseInt(newStationNo, 10) || 1 : null;

    const formattedDetail =
      newType === 'DL' && !newDetail.toUpperCase().includes('SHIFT')
        ? `${newDetail.trim()} (${newShift})`
        : newDetail.trim();

    const baseRow: ProductionRow = {
      id: `custom-${Date.now()}`,
      productionLine: newLine,
      stationNo: stNo,
      detail: formattedDetail,
      stationGroup:
        newType === 'IDL'
          ? 'Indirect Labor (IDL)'
          : newDetail
              .replace(/\(\s*Shift[- ]?[AB]\s*\)/gi, '')
              .replace(/line\s*\.\s*\d+/gi, '')
              .trim(),
      shift: newType === 'IDL' ? 'Common' : newShift,
      type: newType,
      stdMp: stdMpNum,
      uph: uphNum,
      ct: ctNum,
      upph: null,
      outputPerShift: null,
    };

    onAddRow(recalculateRowMetrics(baseRow, workingHoursPerShift));
    setNewDetail('');
    triggerSavedBadge();
  };

  // Helper to render a complete Line block (DL -> Total RF Production Line X -> IDL -> SUM Total -> Spare -> Grand Total)
  const renderLineSection = (targetLine: ProductionLineId, sectionTitle: string) => {
    const lineRows = filteredRows.filter((r) => (r.productionLine || 'Line-A') === targetLine);

    if (lineRows.length === 0) {
      if (targetLine === 'Line-B' && lineFilter !== 'Line-A') {
        return (
          <tbody key={targetLine} className="divide-y divide-slate-200 text-xs">
            <tr className="bg-indigo-50/60">
              <td colSpan={11} className="py-6 px-4 text-center">
                <div className="max-w-lg mx-auto space-y-2">
                  <p className="text-sm font-bold text-indigo-950">
                    ยังไม่มีรายการ Process ในสายการผลิต B-Line (RF Production Line B)
                  </p>
                  <p className="text-xs text-slate-600">
                    คุณสามารถกดปุ่มด้านล่างเพื่อคัดลอกโครงสร้างมาตรฐาน 8 สถานีจาก Line A มาเป็นตั้งต้นของ B-Line หรือเพิ่ม Process ใหม่จากแถบด้านล่างตารางได้ทันที
                  </p>
                  <button
                    type="button"
                    onClick={onGenerateBLineFromLineA}
                    className="mt-1 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer"
                  >
                    <CopyPlus className="w-3.5 h-3.5" />
                    เพิ่มชุด Process มาตรฐานเข้าสู่ B-Line ทันที
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        );
      }
      return null;
    }

    const dlRows = lineRows.filter((r) => r.type === 'DL' && !r.isSpare);
    const idlRows = lineRows.filter((r) => r.type === 'IDL');
    const spareRows = lineRows.filter((r) => r.isSpare);

    const totalDlMp = dlRows.reduce((sum, r) => sum + r.stdMp, 0);
    const totalDlUpph = dlRows.reduce((sum, r) => sum + (r.upph ?? 0), 0);
    const totalDlOutput = dlRows.reduce((sum, r) => sum + (r.outputPerShift ?? 0), 0);

    const totalIdlMp = idlRows.reduce((sum, r) => sum + r.stdMp, 0);
    const totalSpareMp = spareRows.reduce((sum, r) => sum + r.stdMp, 0);
    const grandTotalMp = totalDlMp + totalIdlMp + totalSpareMp;

    const activeShiftCount = shiftFilter === 'All' ? 2 : 1;
    const effectiveLineUph = 200 * activeShiftCount;
    const netLineUpph = grandTotalMp > 0 ? (effectiveLineUph / grandTotalMp).toFixed(2) : '0.00';
    const netLineOutputPerMp =
      grandTotalMp > 0
        ? ((effectiveLineUph * workingHoursPerShift) / grandTotalMp).toFixed(2)
        : '0.00';

    const isLineB = targetLine === 'Line-B';

    return (
      <tbody key={targetLine} className="divide-y divide-slate-200 text-xs">
        {/* Section Banner Header */}
        <tr className={isLineB ? 'bg-indigo-900 text-white' : 'bg-slate-800 text-white'}>
          <td colSpan={11} className="py-2 px-4 font-bold text-xs tracking-wide">
            {sectionTitle} — รวมทั้งสิ้น {grandTotalMp.toLocaleString()} คน (DL: {totalDlMp} · IDL:{' '}
            {totalIdlMp} · Spare: {totalSpareMp})
          </td>
        </tr>

        {/* Direct Labor (DL) Rows */}
        {dlRows.map((row, index) => {
          const prevRow = index > 0 ? dlRows[index - 1] : null;
          const isNewStationGroup = !prevRow || prevRow.stationNo !== row.stationNo;

          return (
            <tr
              key={row.id}
              className={`hover:bg-sky-50/50 transition-colors ${
                isNewStationGroup && index !== 0 ? 'border-t-2 border-slate-300' : ''
              }`}
            >
              <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                <select
                  value={row.productionLine || 'Line-A'}
                  onChange={(e) => {
                    onUpdateRow({
                      ...row,
                      productionLine: e.target.value as ProductionLineId,
                    });
                    triggerSavedBadge();
                  }}
                  className={`text-[11px] font-mono font-bold rounded px-1.5 py-0.5 cursor-pointer ${
                    (row.productionLine || 'Line-A') === 'Line-A'
                      ? 'text-sky-800 bg-sky-100/70'
                      : 'text-indigo-800 bg-indigo-100/70'
                  }`}
                >
                  <option value="Line-A">Line A</option>
                  <option value="Line-B">B-Line</option>
                </select>
              </td>
              <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono tabular-nums font-semibold text-slate-700 bg-slate-50/60">
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={row.stationNo ?? ''}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onUpdateRow({
                      ...row,
                      stationNo: Number.isFinite(val) ? val : 1,
                    });
                    triggerSavedBadge();
                  }}
                  className="w-10 text-center bg-transparent hover:bg-white focus:bg-white rounded border border-transparent hover:border-slate-300 focus:border-sky-600 py-0.5 focus:outline-none"
                />
              </td>
              <td className="py-1.5 px-4 border-r border-slate-200 font-medium text-slate-900">
                <input
                  type="text"
                  value={row.detail}
                  onChange={(e) => {
                    onUpdateRow({ ...row, detail: e.target.value });
                    triggerSavedBadge();
                  }}
                  className="w-full bg-transparent hover:bg-white focus:bg-white focus:outline-none border border-transparent hover:border-slate-300 focus:border-sky-500 rounded px-1.5 -mx-1.5 py-1"
                />
              </td>
              <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                <select
                  value={row.shift}
                  onChange={(e) => {
                    onUpdateRow({
                      ...row,
                      shift: e.target.value as 'Shift-A' | 'Shift-B',
                    });
                    triggerSavedBadge();
                  }}
                  className={`text-[11px] font-mono font-semibold rounded px-1.5 py-1 border border-transparent hover:border-slate-300 focus:outline-none cursor-pointer ${
                    row.shift === 'Shift-A'
                      ? 'text-sky-800 bg-sky-50'
                      : 'text-indigo-800 bg-indigo-50'
                  }`}
                >
                  <option value="Shift-A">Shift-A</option>
                  <option value="Shift-B">Shift-B</option>
                </select>
              </td>
              <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono text-slate-600">
                {row.type}
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-sky-50/30">
                <input
                  type="number"
                  min={0}
                  value={row.stdMp}
                  onChange={(e) => handleNumberChange(row, 'stdMp', e.target.value)}
                  className="w-20 text-right font-mono tabular-nums font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
                />
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right">
                <input
                  type="number"
                  min={0}
                  value={row.uph ?? 0}
                  onChange={(e) => handleNumberChange(row, 'uph', e.target.value)}
                  className="w-16 text-right font-mono tabular-nums text-slate-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-sky-600 rounded px-1.5 py-1 focus:outline-none"
                />
              </td>
              <td className="py-1.5 px-3 border-r border-slate-200 text-right">
                <input
                  type="number"
                  min={0}
                  value={row.ct ?? 0}
                  onChange={(e) => handleNumberChange(row, 'ct', e.target.value)}
                  className="w-14 text-right font-mono tabular-nums text-slate-700 bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-sky-600 rounded px-1.5 py-1 focus:outline-none"
                />
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right font-mono tabular-nums font-medium text-slate-800 bg-slate-50/40">
                {row.upph ?? '-'}
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right font-mono tabular-nums font-medium text-slate-800 bg-slate-50/40">
                {row.outputPerShift?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    onDeleteRow(row.id);
                    triggerSavedBadge();
                  }}
                  title="ลบแถวนี้"
                  className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </td>
            </tr>
          );
        })}

        {/* Subtotal Row: Total RF Production Line A / B */}
        <tr className="bg-slate-100 border-t-2 border-b-2 border-slate-800 font-semibold text-slate-900">
          <td colSpan={4} className="py-2.5 px-4 border-r border-slate-300 text-center">
            Total {targetLine === 'Line-A' ? 'RF Production Line A' : 'RF Production Line B (B-Line)'}
          </td>
          <td className="py-2.5 px-2.5 border-r border-slate-300 text-center font-mono">DL</td>
          <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono tabular-nums text-sm font-bold text-slate-950">
            {totalDlMp.toLocaleString()}
          </td>
          <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono tabular-nums">
            200
          </td>
          <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono tabular-nums">
            15
          </td>
          <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono tabular-nums font-bold">
            {totalDlUpph.toLocaleString()}
          </td>
          <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono tabular-nums font-bold">
            {totalDlOutput.toLocaleString()}
          </td>
          <td className="py-2.5 px-2"></td>
        </tr>

        {/* Indirect Labor (IDL) Rows */}
        {idlRows.map((row) => (
          <tr key={row.id} className="hover:bg-amber-50/30 transition-colors">
            <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono text-[11px] text-slate-500">
              {targetLine === 'Line-A' ? 'Line A' : 'B-Line'}
            </td>
            <td className="py-2 px-2.5 border-r border-slate-200 bg-slate-50/60"></td>
            <td className="py-1.5 px-4 border-r border-slate-200 font-semibold text-slate-800 text-center">
              <input
                type="text"
                value={row.detail}
                onChange={(e) => {
                  onUpdateRow({ ...row, detail: e.target.value });
                  triggerSavedBadge();
                }}
                className="w-full text-center font-semibold bg-transparent hover:bg-white focus:bg-white focus:outline-none border border-transparent hover:border-slate-300 focus:border-sky-500 rounded px-1 py-0.5"
              />
            </td>
            <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono text-[11px] text-slate-500">
              Common
            </td>
            <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono font-semibold text-slate-700">
              {row.type}
            </td>
            <td className="py-1.5 px-3 border-r border-slate-200 text-right bg-amber-50/20">
              <input
                type="number"
                min={0}
                value={row.stdMp}
                onChange={(e) => handleNumberChange(row, 'stdMp', e.target.value)}
                className="w-20 text-right font-mono tabular-nums font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 focus:outline-none focus:border-sky-600"
              />
            </td>
            <td className="py-2 px-3 border-r border-slate-200"></td>
            <td className="py-2 px-3 border-r border-slate-200"></td>
            <td className="py-2 px-3 border-r border-slate-200"></td>
            <td className="py-2 px-3 border-r border-slate-200"></td>
            <td className="py-2 px-2 text-center">
              <button
                type="button"
                onClick={() => {
                  onDeleteRow(row.id);
                  triggerSavedBadge();
                }}
                title="ลบแถวนี้"
                className="text-slate-400 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </td>
          </tr>
        ))}

        {/* Subtotal Row: SUM Total (IDL) */}
        {idlRows.length > 0 && (
          <tr className="bg-slate-100 border-t border-b border-slate-400 font-semibold text-slate-900">
            <td colSpan={2} className="py-2 px-2.5 border-r border-slate-300"></td>
            <td colSpan={2} className="py-2 px-4 border-r border-slate-300 text-center font-bold">
              SUM Total ({targetLine === 'Line-A' ? 'Line A' : 'B-Line'} IDL)
            </td>
            <td className="py-2 px-2.5 border-r border-slate-300 text-center font-mono">IDL</td>
            <td className="py-2 px-3 border-r border-slate-300 text-right font-mono tabular-nums text-sm font-bold">
              {totalIdlMp.toLocaleString()}
            </td>
            <td colSpan={5} className="py-2 px-3"></td>
          </tr>
        )}

        {/* Spare Rows */}
        {spareRows.map((row) => (
          <tr key={row.id} className="hover:bg-slate-50 transition-colors">
            <td className="py-2 px-2 border-r border-slate-200 text-center font-mono text-[11px] text-slate-500">
              {targetLine === 'Line-A' ? 'Line A' : 'B-Line'}
            </td>
            <td className="py-2 px-2.5 border-r border-slate-200 bg-slate-50/60"></td>
            <td className="py-2 px-4 border-r border-slate-200 text-slate-800">
              <input
                type="text"
                value={row.detail}
                onChange={(e) => {
                  onUpdateRow({ ...row, detail: e.target.value });
                  triggerSavedBadge();
                }}
                className="w-full bg-transparent hover:bg-white focus:bg-white border border-transparent hover:border-slate-300 focus:border-sky-500 rounded px-1.5 -mx-1.5 py-0.5 focus:outline-none"
              />
            </td>
            <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono text-[11px] text-slate-600">
              {row.shift}
            </td>
            <td className="py-2 px-2.5 border-r border-slate-200 text-center font-mono text-slate-600">
              {row.type}
            </td>
            <td className="py-1.5 px-3 border-r border-slate-200 text-right">
              <input
                type="number"
                min={0}
                placeholder="0"
                value={row.stdMp || ''}
                onChange={(e) => handleNumberChange(row, 'stdMp', e.target.value)}
                className="w-20 text-right font-mono tabular-nums font-semibold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 focus:outline-none focus:border-sky-600"
              />
            </td>
            <td className="py-2 px-3 border-r border-slate-200"></td>
            <td className="py-2 px-3 border-r border-slate-200"></td>
            <td className="py-2 px-3 border-r border-slate-200"></td>
            <td className="py-2 px-3 border-r border-slate-200"></td>
            <td className="py-2 px-2"></td>
          </tr>
        ))}

        {/* Final Grand Total Row for this Line */}
        <tr className="bg-slate-900 text-white font-bold text-sm border-t-2 border-slate-950">
          <td colSpan={5} className="py-3 px-4 border-r border-slate-700 text-right">
            Grand Total {targetLine === 'Line-A' ? 'RF Production Line A' : 'RF Production Line B'} (DL + IDL + Spare)
          </td>
          <td className="py-3 px-3 border-r border-slate-700 text-right font-mono tabular-nums text-base text-sky-300">
            {grandTotalMp.toLocaleString()}
          </td>
          <td className="py-3 px-3 border-r border-slate-700 text-right font-mono tabular-nums text-xs text-slate-400">
            {effectiveLineUph} UPH
          </td>
          <td className="py-3 px-3 border-r border-slate-700 text-right font-mono tabular-nums text-xs text-slate-400">
            15s
          </td>
          <td
            title="Net Line UPPH = Effective Line UPH ÷ Grand Total MP"
            className="py-3 px-3 border-r border-amber-400 text-right font-mono tabular-nums bg-amber-300 text-slate-950"
          >
            {netLineUpph}
          </td>
          <td
            title="Net Line Output per Person = (Effective Line UPH × Working Hours) ÷ Grand Total MP"
            className="py-3 px-3 border-r border-amber-400 text-right font-mono tabular-nums bg-amber-300 text-slate-950"
          >
            {netLineOutputPerMp}
          </td>
          <td className="py-3 px-2 bg-slate-900"></td>
        </tr>
      </tbody>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Table Top Info Bar */}
      <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">
            ตารางคำนวณและแก้ไขกำลังคนบนเว็บ (Line A & B-Line Editable Sheet)
          </h3>
          <span className="text-xs text-slate-500">
            · คลิกแก้ไข Line, ลำดับสถานี, ชื่อ Process, กะ, STD MP, UPH, CT ได้ทุกช่อง
          </span>
        </div>
        <div className="flex items-center gap-3">
          {savedIndicator && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
              <Check className="w-3.5 h-3.5" />
              บันทึกการแก้ไขบนเว็บแล้ว
            </span>
          )}
          <span className="text-xs text-slate-600 font-mono tabular-nums">
            UPPH = UPH ÷ STD MP · Output = UPPH × {workingHoursPerShift} ชม.
          </span>
        </div>
      </div>

      {/* Main Industrial Spreadsheet Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-900 text-white text-xs font-semibold">
              <th className="py-3 px-2 border-r border-slate-700 w-20 text-center">Line</th>
              <th className="py-3 px-2 border-r border-slate-700 w-14 text-center">No.</th>
              <th className="py-3 px-4 border-r border-slate-700 min-w-[240px]">
                Detail / Process
              </th>
              <th className="py-3 px-2 border-r border-slate-700 w-24 text-center">Shift</th>
              <th className="py-3 px-2 border-r border-slate-700 w-16 text-center">Type</th>
              <th className="py-3 px-3 border-r border-slate-700 w-28 text-right">
                STD MP / Shift
              </th>
              <th className="py-3 px-3 border-r border-slate-700 w-24 text-right">UPH</th>
              <th className="py-3 px-3 border-r border-slate-700 w-20 text-right">CT (s)</th>
              <th className="py-3 px-3 border-r border-slate-700 w-20 text-right">UPPH</th>
              <th className="py-3 px-3 border-r border-slate-700 w-28 text-right">
                Output/shift
              </th>
              <th className="py-3 px-2 w-12 text-center">ลบ</th>
            </tr>
          </thead>

          {(lineFilter === 'All' || lineFilter === 'Line-A') &&
            renderLineSection('Line-A', 'RF Production Line A (A-Line)')}

          {(lineFilter === 'All' || lineFilter === 'Line-B') &&
            renderLineSection('Line-B', 'RF Production Line B (B-Line)')}
        </table>
      </div>

      {/* Quick Add Process Form at Footer of Table */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-2 text-xs text-slate-600">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="text-slate-900">เพิ่ม Process ด่วนท้ายตาราง:</strong> เลือกสายการผลิต{' '}
            <span className="font-semibold text-sky-700">Line A</span> หรือ{' '}
            <span className="font-semibold text-indigo-700">B-Line</span> แล้วระบุชื่อ Process และจำนวนคนเพื่อเพิ่มเข้าตารางทันที
          </div>
        </div>

        <form onSubmit={handleCreateRow} className="flex flex-wrap items-center gap-2">
          <select
            value={newLine}
            onChange={(e) => setNewLine(e.target.value as ProductionLineId)}
            className="text-xs font-semibold bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-900 focus:outline-none focus:border-indigo-600"
          >
            <option value="Line-A">เพิ่มใน Line A</option>
            <option value="Line-B">เพิ่มใน B-Line</option>
          </select>

          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value as 'DL' | 'IDL')}
            className="text-xs bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-800 focus:outline-none focus:border-indigo-600"
          >
            <option value="DL">DL</option>
            <option value="IDL">IDL</option>
          </select>

          {newType === 'DL' && (
            <>
              <input
                type="number"
                min={1}
                max={99}
                value={newStationNo}
                onChange={(e) => setNewStationNo(e.target.value)}
                placeholder="No."
                title="ลำดับสถานี (Station No.)"
                className="w-14 text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1.5"
              />
              <select
                value={newShift}
                onChange={(e) => setNewShift(e.target.value as 'Shift-A' | 'Shift-B')}
                className="text-xs bg-white border border-slate-300 rounded px-2 py-1.5 text-slate-800"
              >
                <option value="Shift-A">Shift-A</option>
                <option value="Shift-B">Shift-B</option>
              </select>
            </>
          )}

          <input
            type="text"
            value={newDetail}
            onChange={(e) => setNewDetail(e.target.value)}
            placeholder="ชื่อ Process / สถานี..."
            className="w-44 text-xs bg-white border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-600"
          />

          <input
            type="number"
            min={1}
            value={newStdMp}
            onChange={(e) => setNewStdMp(e.target.value)}
            placeholder="STD MP"
            title="จำนวนคน (STD MP)"
            className="w-20 text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1.5"
          />

          {newType === 'DL' && (
            <input
              type="number"
              min={1}
              value={newUph}
              onChange={(e) => setNewUph(e.target.value)}
              placeholder="UPH"
              title="UPH"
              className="w-20 text-xs font-mono bg-white border border-slate-300 rounded px-2 py-1.5"
            />
          )}

          <button
            type="submit"
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            เพิ่มรายการ
          </button>
        </form>
      </div>
    </div>
  );
};
