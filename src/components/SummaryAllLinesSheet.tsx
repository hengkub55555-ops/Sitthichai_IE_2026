import React, { useMemo } from 'react';
import {
  FileSpreadsheet,
  ArrowRight,
  Layers,
  Users,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { ProductionRow, ProductionLineId } from '../types/manpower';

interface SummaryAllLinesSheetProps {
  rows: ProductionRow[];
  workingHoursPerShift: number;
  onSelectLineDetail: (line: ProductionLineId) => void;
}

interface StationComparisonRow {
  stationNo: number;
  stationGroup: string;
  lineA_ShiftA: number;
  lineA_ShiftB: number;
  lineA_Total: number;
  lineA_UPPH: number;
  lineA_Output: number;
  lineB_ShiftA: number;
  lineB_ShiftB: number;
  lineB_Total: number;
  lineB_UPPH: number;
  lineB_Output: number;
  all_ShiftA: number;
  all_ShiftB: number;
  all_Total: number;
  all_UPPH: number;
  all_Output: number;
}

export const SummaryAllLinesSheet: React.FC<SummaryAllLinesSheetProps> = ({
  rows,
  workingHoursPerShift,
  onSelectLineDetail,
}) => {
  // 1. Build Station-by-Station (1..8+) Summary across Line A, B-Line, and Combined All Lines
  const stationSummaryRows = useMemo<StationComparisonRow[]>(() => {
    const dlRows = rows.filter((r) => r.type === 'DL' && !r.isSpare && r.stationNo !== null);
    const stationNos = Array.from(new Set(dlRows.map((r) => r.stationNo!))).sort((a, b) => a - b);

    return stationNos.map((no) => {
      const stRows = dlRows.filter((r) => r.stationNo === no);
      const groupName = stRows[0]?.stationGroup || `Station ${no}`;

      const aRows = stRows.filter((r) => (r.productionLine || 'Line-A') === 'Line-A');
      const bRows = stRows.filter((r) => r.productionLine === 'Line-B');

      const lineA_ShiftA = aRows
        .filter((r) => r.shift === 'Shift-A')
        .reduce((s, r) => s + r.stdMp, 0);
      const lineA_ShiftB = aRows
        .filter((r) => r.shift === 'Shift-B')
        .reduce((s, r) => s + r.stdMp, 0);
      const lineA_Total = lineA_ShiftA + lineA_ShiftB;
      const lineA_UPPH = aRows.reduce((s, r) => s + (r.upph ?? 0), 0);
      const lineA_Output = aRows.reduce((s, r) => s + (r.outputPerShift ?? 0), 0);

      const lineB_ShiftA = bRows
        .filter((r) => r.shift === 'Shift-A')
        .reduce((s, r) => s + r.stdMp, 0);
      const lineB_ShiftB = bRows
        .filter((r) => r.shift === 'Shift-B')
        .reduce((s, r) => s + r.stdMp, 0);
      const lineB_Total = lineB_ShiftA + lineB_ShiftB;
      const lineB_UPPH = bRows.reduce((s, r) => s + (r.upph ?? 0), 0);
      const lineB_Output = bRows.reduce((s, r) => s + (r.outputPerShift ?? 0), 0);

      const all_ShiftA = lineA_ShiftA + lineB_ShiftA;
      const all_ShiftB = lineA_ShiftB + lineB_ShiftB;
      const all_Total = lineA_Total + lineB_Total;
      const all_UPPH = lineA_UPPH + lineB_UPPH;
      const all_Output = lineA_Output + lineB_Output;

      return {
        stationNo: no,
        stationGroup: groupName,
        lineA_ShiftA,
        lineA_ShiftB,
        lineA_Total,
        lineA_UPPH,
        lineA_Output,
        lineB_ShiftA,
        lineB_ShiftB,
        lineB_Total,
        lineB_UPPH,
        lineB_Output,
        all_ShiftA,
        all_ShiftB,
        all_Total,
        all_UPPH,
        all_Output,
      };
    });
  }, [rows]);

  // 2. Build IDL Role-by-Role Summary across Line A, B-Line, and Combined All Lines
  const idlSummaryRows = useMemo(() => {
    const idlRows = rows.filter((r) => r.type === 'IDL');
    const roles = Array.from(new Set(idlRows.map((r) => r.detail)));

    return roles.map((role) => {
      const roleRows = idlRows.filter((r) => r.detail === role);
      const lineA = roleRows
        .filter((r) => (r.productionLine || 'Line-A') === 'Line-A')
        .reduce((s, r) => s + r.stdMp, 0);
      const lineB = roleRows
        .filter((r) => r.productionLine === 'Line-B')
        .reduce((s, r) => s + r.stdMp, 0);
      return {
        role,
        lineA,
        lineB,
        total: lineA + lineB,
      };
    });
  }, [rows]);

  // 3. Build Spare Manpower Summary
  const spareSummary = useMemo(() => {
    const spareRows = rows.filter((r) => r.isSpare);
    const lineA_ShiftA = spareRows
      .filter((r) => (r.productionLine || 'Line-A') === 'Line-A' && r.shift === 'Shift-A')
      .reduce((s, r) => s + r.stdMp, 0);
    const lineA_ShiftB = spareRows
      .filter((r) => (r.productionLine || 'Line-A') === 'Line-A' && r.shift === 'Shift-B')
      .reduce((s, r) => s + r.stdMp, 0);

    const lineB_ShiftA = spareRows
      .filter((r) => r.productionLine === 'Line-B' && r.shift === 'Shift-A')
      .reduce((s, r) => s + r.stdMp, 0);
    const lineB_ShiftB = spareRows
      .filter((r) => r.productionLine === 'Line-B' && r.shift === 'Shift-B')
      .reduce((s, r) => s + r.stdMp, 0);

    return {
      lineA_ShiftA,
      lineA_ShiftB,
      lineA_Total: lineA_ShiftA + lineA_ShiftB,
      lineB_ShiftA,
      lineB_ShiftB,
      lineB_Total: lineB_ShiftA + lineB_ShiftB,
      all_ShiftA: lineA_ShiftA + lineB_ShiftA,
      all_ShiftB: lineA_ShiftB + lineB_ShiftB,
      all_Total: lineA_ShiftA + lineA_ShiftB + lineB_ShiftA + lineB_ShiftB,
    };
  }, [rows]);

  // 4. Grand Totals Calculation
  const totals = useMemo(() => {
    const dl = stationSummaryRows.reduce(
      (acc, r) => ({
        lineA_ShiftA: acc.lineA_ShiftA + r.lineA_ShiftA,
        lineA_ShiftB: acc.lineA_ShiftB + r.lineA_ShiftB,
        lineA_Total: acc.lineA_Total + r.lineA_Total,
        lineA_UPPH: acc.lineA_UPPH + r.lineA_UPPH,
        lineA_Output: acc.lineA_Output + r.lineA_Output,
        lineB_ShiftA: acc.lineB_ShiftA + r.lineB_ShiftA,
        lineB_ShiftB: acc.lineB_ShiftB + r.lineB_ShiftB,
        lineB_Total: acc.lineB_Total + r.lineB_Total,
        lineB_UPPH: acc.lineB_UPPH + r.lineB_UPPH,
        lineB_Output: acc.lineB_Output + r.lineB_Output,
        all_ShiftA: acc.all_ShiftA + r.all_ShiftA,
        all_ShiftB: acc.all_ShiftB + r.all_ShiftB,
        all_Total: acc.all_Total + r.all_Total,
        all_UPPH: acc.all_UPPH + r.all_UPPH,
        all_Output: acc.all_Output + r.all_Output,
      }),
      {
        lineA_ShiftA: 0,
        lineA_ShiftB: 0,
        lineA_Total: 0,
        lineA_UPPH: 0,
        lineA_Output: 0,
        lineB_ShiftA: 0,
        lineB_ShiftB: 0,
        lineB_Total: 0,
        lineB_UPPH: 0,
        lineB_Output: 0,
        all_ShiftA: 0,
        all_ShiftB: 0,
        all_Total: 0,
        all_UPPH: 0,
        all_Output: 0,
      }
    );

    const idl = idlSummaryRows.reduce(
      (acc, r) => ({
        lineA: acc.lineA + r.lineA,
        lineB: acc.lineB + r.lineB,
        total: acc.total + r.total,
      }),
      { lineA: 0, lineB: 0, total: 0 }
    );

    const grandA = dl.lineA_Total + idl.lineA + spareSummary.lineA_Total;
    const grandB = dl.lineB_Total + idl.lineB + spareSummary.lineB_Total;
    const grandAll = grandA + grandB;

    // Net Line UPPH (Each line has 2 shifts * 200 UPH = 400 UPH; Both lines combined = 800 UPH)
    const activeLinesCount = (grandA > 0 ? 1 : 0) + (grandB > 0 ? 1 : 0);
    const totalPlantUph = activeLinesCount * 400;

    const netUpphA = grandA > 0 ? (400 / grandA).toFixed(2) : '0.00';
    const netOutputA = grandA > 0 ? ((400 * workingHoursPerShift) / grandA).toFixed(2) : '0.00';

    const netUpphB = grandB > 0 ? (400 / grandB).toFixed(2) : '0.00';
    const netOutputB = grandB > 0 ? ((400 * workingHoursPerShift) / grandB).toFixed(2) : '0.00';

    const netUpphAll = grandAll > 0 ? (totalPlantUph / grandAll).toFixed(2) : '0.00';
    const netOutputAll =
      grandAll > 0 ? ((totalPlantUph * workingHoursPerShift) / grandAll).toFixed(2) : '0.00';

    return {
      dl,
      idl,
      grandA,
      grandB,
      grandAll,
      totalPlantUph,
      netUpphA,
      netOutputA,
      netUpphB,
      netOutputB,
      netUpphAll,
      netOutputAll,
    };
  }, [stationSummaryRows, idlSummaryRows, spareSummary, workingHoursPerShift]);

  return (
    <section className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      {/* Header Banner of Sheet: Summary All Line */}
      <div className="px-5 py-4 bg-slate-900 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-emerald-500/20 text-emerald-300 mt-0.5">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Sheet: Summary All Line — ตารางสรุปรวมกำลังคนและผลผลิตทุกสายการผลิต (Line A + B-Line)
              </h2>
              <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                อัปเดตข้อมูลแบบ Real-time จากทั้ง 2 สายการผลิต
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              สรุปเปรียบเทียบจำนวนคน (STD MP) แยกตามสถานี 1–8, กะทำงาน (Shift-A / Shift-B), ทีมสนับสนุน (IDL), Spare และประสิทธิภาพรวมทั้งโรงงาน
            </p>
          </div>
        </div>

        {/* Quick Jump Buttons to Line A or B-Line Sheet */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onSelectLineDetail('Line-A')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-200 bg-sky-950/80 hover:bg-sky-900 border border-sky-700 rounded-md transition-colors cursor-pointer"
          >
            แก้ไข Sheet Line A ({totals.grandA} คน)
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectLineDetail('Line-B')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-200 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700 rounded-md transition-colors cursor-pointer"
          >
            แก้ไข Sheet B-Line ({totals.grandB} คน)
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Executive Summary Strip inside Summary All Line */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-slate-50 border-b border-slate-200">
        {/* Column 1: Line A Overview */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
              <Layers className="w-3.5 h-3.5" />
              1. RF Production Line A (A-Line)
            </div>
            <div className="mt-1 text-xs text-slate-600 font-mono tabular-nums">
              DL: <strong>{totals.dl.lineA_Total}</strong> (กะ A: {totals.dl.lineA_ShiftA} / กะ B:{' '}
              {totals.dl.lineA_ShiftB}) · IDL: <strong>{totals.idl.lineA}</strong> · Spare:{' '}
              <strong>{spareSummary.lineA_Total}</strong>
            </div>
          </div>
          <div className="text-right font-mono tabular-nums">
            <div className="text-xl font-bold text-sky-700">{totals.grandA.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500">คน (Line A)</div>
          </div>
        </div>

        {/* Column 2: B-Line Overview */}
        <div className="p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800">
              <Layers className="w-3.5 h-3.5" />
              2. RF Production Line B (B-Line)
            </div>
            <div className="mt-1 text-xs text-slate-600 font-mono tabular-nums">
              DL: <strong>{totals.dl.lineB_Total}</strong> (กะ A: {totals.dl.lineB_ShiftA} / กะ B:{' '}
              {totals.dl.lineB_ShiftB}) · IDL: <strong>{totals.idl.lineB}</strong> · Spare:{' '}
              <strong>{spareSummary.lineB_Total}</strong>
            </div>
          </div>
          <div className="text-right font-mono tabular-nums">
            <div className="text-xl font-bold text-indigo-700">{totals.grandB.toLocaleString()}</div>
            <div className="text-[11px] text-slate-500">คน (B-Line)</div>
          </div>
        </div>

        {/* Column 3: Combined All Lines Total */}
        <div className="p-4 flex items-center justify-between bg-emerald-50/40">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
              <Users className="w-3.5 h-3.5" />
              3. Summary All Lines (รวม A + B-Line)
            </div>
            <div className="mt-1 text-xs text-slate-700 font-mono tabular-nums">
              Total DL: <strong>{totals.dl.all_Total}</strong> · Total IDL:{' '}
              <strong>{totals.idl.total}</strong> · Total Spare:{' '}
              <strong>{spareSummary.all_Total}</strong>
            </div>
          </div>
          <div className="text-right font-mono tabular-nums">
            <div className="text-2xl font-bold text-emerald-700">
              {totals.grandAll.toLocaleString()}
            </div>
            <div className="text-[11px] font-semibold text-emerald-800">Grand Total MP</div>
          </div>
        </div>
      </div>

      {/* Master Summary All Line Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            {/* Group Header Row */}
            <tr className="bg-slate-900 text-white font-semibold border-b border-slate-700">
              <th
                rowSpan={2}
                className="py-2.5 px-3 border-r border-slate-700 w-12 text-center"
              >
                No.
              </th>
              <th
                rowSpan={2}
                className="py-2.5 px-4 border-r border-slate-700 min-w-[200px]"
              >
                Process / Station Group
              </th>
              <th
                colSpan={4}
                className="py-2 px-3 border-r border-slate-700 text-center bg-sky-950 text-sky-200"
              >
                RF Production Line A (A-Line)
              </th>
              <th
                colSpan={4}
                className="py-2 px-3 border-r border-slate-700 text-center bg-indigo-950 text-indigo-200"
              >
                RF Production Line B (B-Line)
              </th>
              <th
                colSpan={5}
                className="py-2 px-3 text-center bg-emerald-950 text-emerald-200"
              >
                Summary All Lines (รวม A-Line + B-Line)
              </th>
            </tr>

            {/* Sub-column Header Row */}
            <tr className="bg-slate-800 text-slate-200 text-[11px] font-semibold">
              {/* Line A Sub-columns */}
              <th className="py-2 px-2.5 border-r border-slate-700 text-right">Shift-A</th>
              <th className="py-2 px-2.5 border-r border-slate-700 text-right">Shift-B</th>
              <th className="py-2 px-2.5 border-r border-slate-700 text-right text-sky-300">
                รวม MP (A)
              </th>
              <th className="py-2 px-2.5 border-r border-slate-700 text-right">Output (A)</th>

              {/* Line B Sub-columns */}
              <th className="py-2 px-2.5 border-r border-slate-700 text-right">Shift-A</th>
              <th className="py-2 px-2.5 border-r border-slate-700 text-right">Shift-B</th>
              <th className="py-2 px-2.5 border-r border-slate-700 text-right text-indigo-300">
                รวม MP (B)
              </th>
              <th className="py-2 px-2.5 border-r border-slate-700 text-right">Output (B)</th>

              {/* All Lines Combined Sub-columns */}
              <th className="py-2 px-2.5 border-r border-slate-700 text-right">รวมกะ A</th>
              <th className="py-2 px-2.5 border-r border-slate-700 text-right">รวมกะ B</th>
              <th className="py-2 px-3 border-r border-slate-700 text-right text-emerald-300 font-bold">
                Total MP
              </th>
              <th className="py-2 px-2.5 border-r border-slate-700 text-right">Sum UPPH</th>
              <th className="py-2 px-3 text-right text-emerald-300 font-bold">Total Output</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
            {/* 1. Direct Labor (DL) Station Summary Rows */}
            {stationSummaryRows.map((st) => (
              <tr key={st.stationNo} className="hover:bg-slate-50 transition-colors">
                <td className="py-2 px-3 border-r border-slate-200 text-center font-semibold text-slate-700 bg-slate-50/70">
                  {st.stationNo}
                </td>
                <td className="py-2 px-4 border-r border-slate-200 font-sans font-semibold text-slate-900">
                  {st.stationGroup}
                </td>

                {/* Line A */}
                <td className="py-2 px-2.5 border-r border-slate-200 text-right text-slate-600">
                  {st.lineA_ShiftA}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-200 text-right text-slate-600">
                  {st.lineA_ShiftB}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-200 text-right font-bold text-sky-800 bg-sky-50/40">
                  {st.lineA_Total}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-200 text-right text-slate-700">
                  {st.lineA_Output.toLocaleString()}
                </td>

                {/* Line B */}
                <td className="py-2 px-2.5 border-r border-slate-200 text-right text-slate-600">
                  {st.lineB_ShiftA}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-200 text-right text-slate-600">
                  {st.lineB_ShiftB}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-200 text-right font-bold text-indigo-800 bg-indigo-50/40">
                  {st.lineB_Total}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-200 text-right text-slate-700">
                  {st.lineB_Output.toLocaleString()}
                </td>

                {/* All Lines Combined */}
                <td className="py-2 px-2.5 border-r border-slate-200 text-right text-slate-700">
                  {st.all_ShiftA}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-200 text-right text-slate-700">
                  {st.all_ShiftB}
                </td>
                <td className="py-2 px-3 border-r border-slate-200 text-right font-bold text-emerald-900 bg-emerald-50/50">
                  {st.all_Total}
                </td>
                <td className="py-2 px-2.5 border-r border-slate-200 text-right text-slate-700">
                  {st.all_UPPH}
                </td>
                <td className="py-2 px-3 text-right font-bold text-slate-900 bg-emerald-50/30">
                  {st.all_Output.toLocaleString()}
                </td>
              </tr>
            ))}

            {/* Subtotal Row: Total Direct Labor (DL) */}
            <tr className="bg-slate-100 border-t-2 border-b-2 border-slate-800 font-bold text-slate-900">
              <td colSpan={2} className="py-2.5 px-4 border-r border-slate-300 font-sans text-center">
                Total Direct Labor (DL) — 8 สถานีหลัก
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right">
                {totals.dl.lineA_ShiftA}
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right">
                {totals.dl.lineA_ShiftB}
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right text-sky-800 bg-sky-100/60">
                {totals.dl.lineA_Total.toLocaleString()}
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right">
                {totals.dl.lineA_Output.toLocaleString()}
              </td>

              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right">
                {totals.dl.lineB_ShiftA}
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right">
                {totals.dl.lineB_ShiftB}
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right text-indigo-800 bg-indigo-100/60">
                {totals.dl.lineB_Total.toLocaleString()}
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right">
                {totals.dl.lineB_Output.toLocaleString()}
              </td>

              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right">
                {totals.dl.all_ShiftA.toLocaleString()}
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right">
                {totals.dl.all_ShiftB.toLocaleString()}
              </td>
              <td className="py-2.5 px-3 border-r border-slate-300 text-right text-sm text-emerald-950 bg-emerald-100/70">
                {totals.dl.all_Total.toLocaleString()}
              </td>
              <td className="py-2.5 px-2.5 border-r border-slate-300 text-right">
                {totals.dl.all_UPPH.toLocaleString()}
              </td>
              <td className="py-2.5 px-3 text-right text-emerald-950 bg-emerald-100/40">
                {totals.dl.all_Output.toLocaleString()}
              </td>
            </tr>

            {/* 2. Indirect Labor (IDL) Breakdown Rows */}
            {idlSummaryRows.map((idl) => (
              <tr key={idl.role} className="hover:bg-amber-50/30 transition-colors">
                <td className="py-1.5 px-3 border-r border-slate-200 text-center text-slate-400 bg-slate-50/50">
                  IDL
                </td>
                <td className="py-1.5 px-4 border-r border-slate-200 font-sans font-medium text-slate-800 text-center">
                  {idl.role}
                </td>

                {/* Line A IDL */}
                <td colSpan={2} className="py-1.5 px-2.5 border-r border-slate-200 text-center text-slate-400">
                  Common
                </td>
                <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-semibold text-slate-800 bg-sky-50/20">
                  {idl.lineA}
                </td>
                <td className="py-1.5 px-2.5 border-r border-slate-200"></td>

                {/* Line B IDL */}
                <td colSpan={2} className="py-1.5 px-2.5 border-r border-slate-200 text-center text-slate-400">
                  Common
                </td>
                <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-semibold text-slate-800 bg-indigo-50/20">
                  {idl.lineB}
                </td>
                <td className="py-1.5 px-2.5 border-r border-slate-200"></td>

                {/* Combined IDL */}
                <td colSpan={2} className="py-1.5 px-2.5 border-r border-slate-200 text-center text-slate-400">
                  All Lines IDL
                </td>
                <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-900 bg-emerald-50/30">
                  {idl.total}
                </td>
                <td colSpan={2} className="py-1.5 px-2.5"></td>
              </tr>
            ))}

            {/* Subtotal Row: SUM Total IDL */}
            <tr className="bg-slate-100 border-t border-b border-slate-400 font-bold text-slate-900">
              <td colSpan={2} className="py-2 px-4 border-r border-slate-300 font-sans text-center">
                SUM Total Indirect Labor (IDL)
              </td>
              <td colSpan={2} className="py-2 px-2.5 border-r border-slate-300"></td>
              <td className="py-2 px-2.5 border-r border-slate-300 text-right text-sky-900">
                {totals.idl.lineA}
              </td>
              <td className="py-2 px-2.5 border-r border-slate-300"></td>

              <td colSpan={2} className="py-2 px-2.5 border-r border-slate-300"></td>
              <td className="py-2 px-2.5 border-r border-slate-300 text-right text-indigo-900">
                {totals.idl.lineB}
              </td>
              <td className="py-2 px-2.5 border-r border-slate-300"></td>

              <td colSpan={2} className="py-2 px-2.5 border-r border-slate-300"></td>
              <td className="py-2 px-3 border-r border-slate-300 text-right text-emerald-950 bg-emerald-100/50">
                {totals.idl.total}
              </td>
              <td colSpan={2} className="py-2 px-2.5"></td>
            </tr>

            {/* 3. Spare Row */}
            <tr className="hover:bg-slate-50">
              <td className="py-2 px-3 border-r border-slate-200 text-center text-slate-400">
                Spare
              </td>
              <td className="py-2 px-4 border-r border-slate-200 font-sans font-medium text-slate-800">
                Spare Manpower (Shift A + Shift B)
              </td>
              <td className="py-2 px-2.5 border-r border-slate-200 text-right">
                {spareSummary.lineA_ShiftA}
              </td>
              <td className="py-2 px-2.5 border-r border-slate-200 text-right">
                {spareSummary.lineA_ShiftB}
              </td>
              <td className="py-2 px-2.5 border-r border-slate-200 text-right font-semibold">
                {spareSummary.lineA_Total}
              </td>
              <td className="py-2 px-2.5 border-r border-slate-200"></td>

              <td className="py-2 px-2.5 border-r border-slate-200 text-right">
                {spareSummary.lineB_ShiftA}
              </td>
              <td className="py-2 px-2.5 border-r border-slate-200 text-right">
                {spareSummary.lineB_ShiftB}
              </td>
              <td className="py-2 px-2.5 border-r border-slate-200 text-right font-semibold">
                {spareSummary.lineB_Total}
              </td>
              <td className="py-2 px-2.5 border-r border-slate-200"></td>

              <td className="py-2 px-2.5 border-r border-slate-200 text-right">
                {spareSummary.all_ShiftA}
              </td>
              <td className="py-2 px-2.5 border-r border-slate-200 text-right">
                {spareSummary.all_ShiftB}
              </td>
              <td className="py-2 px-3 border-r border-slate-200 text-right font-bold">
                {spareSummary.all_Total}
              </td>
              <td colSpan={2} className="py-2 px-2.5"></td>
            </tr>

            {/* 4. Final Grand Total All Lines Row (With Yellow Efficiency Highlights) */}
            <tr className="bg-slate-900 text-white font-bold text-sm border-t-2 border-slate-950">
              <td colSpan={2} className="py-3 px-4 border-r border-slate-700 font-sans text-right">
                GRAND TOTAL ALL LINES (DL + IDL + Spare)
              </td>

              {/* Line A Grand Total */}
              <td colSpan={2} className="py-3 px-2.5 border-r border-slate-700 text-right text-xs text-slate-400">
                Line A Total:
              </td>
              <td className="py-3 px-2.5 border-r border-slate-700 text-right text-sky-300">
                {totals.grandA.toLocaleString()}
              </td>
              <td className="py-3 px-2.5 border-r border-slate-700 text-right text-xs bg-amber-300 text-slate-950">
                {totals.netUpphA} UPPH
              </td>

              {/* Line B Grand Total */}
              <td colSpan={2} className="py-3 px-2.5 border-r border-slate-700 text-right text-xs text-slate-400">
                B-Line Total:
              </td>
              <td className="py-3 px-2.5 border-r border-slate-700 text-right text-indigo-300">
                {totals.grandB.toLocaleString()}
              </td>
              <td className="py-3 px-2.5 border-r border-slate-700 text-right text-xs bg-amber-300 text-slate-950">
                {totals.netUpphB} UPPH
              </td>

              {/* Combined All Lines Grand Total */}
              <td colSpan={2} className="py-3 px-2.5 border-r border-slate-700 text-right text-xs text-emerald-300">
                All Lines MP:
              </td>
              <td className="py-3 px-3 border-r border-slate-700 text-right text-base text-emerald-300">
                {totals.grandAll.toLocaleString()}
              </td>
              <td
                title="All Lines Net UPPH"
                className="py-3 px-2.5 border-r border-amber-400 text-right bg-amber-300 text-slate-950"
              >
                {totals.netUpphAll}
              </td>
              <td
                title="All Lines Net Output / Person"
                className="py-3 px-3 text-right bg-amber-300 text-slate-950"
              >
                {totals.netOutputAll}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Note */}
      <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Summary All Line:</strong> รวมกำลังคนทั้งสิ้น{' '}
            <strong className="text-slate-900 font-mono">{totals.grandAll.toLocaleString()} คน</strong>{' '}
            (Line A: {totals.grandA} คน + B-Line: {totals.grandB} คน) · กำลังผลิตรวมทั้งโรงงาน{' '}
            <strong className="text-slate-900 font-mono">{totals.totalPlantUph} UPH</strong>
          </span>
        </div>
        <span className="font-mono text-slate-500">
          เวลาทำงาน {workingHoursPerShift} ชม./กะ · ส่งออกเป็น Sheet แรกในไฟล์ Excel อัตโนมัติ
        </span>
      </div>
    </section>
  );
};
