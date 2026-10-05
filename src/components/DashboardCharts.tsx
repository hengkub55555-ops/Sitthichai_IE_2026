import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  Cell,
} from 'recharts';
import { CopyPlus } from 'lucide-react';
import { ProductionRow, ProductionLineId } from '../types/manpower';

interface DashboardChartsProps {
  rows: ProductionRow[];
  workingHoursPerShift: number;
  onQuickCreateBLine?: () => void;
}

interface StationMetric {
  stationNo: number;
  stationName: string;
  stdMp: number;
  shiftAMp: number;
  shiftBMp: number;
  uph: number;
  ct: number;
  upph: number;
  outputPerShift: number;
}

function buildLineStationMetrics(
  rows: ProductionRow[],
  targetLine: ProductionLineId
): StationMetric[] {
  const lineRows = rows.filter(
    (r) =>
      (r.productionLine || 'Line-A') === targetLine &&
      r.type === 'DL' &&
      !r.isSpare &&
      r.stationNo !== null
  );

  const map = new Map<number, StationMetric>();

  lineRows.forEach((r) => {
    const no = r.stationNo!;
    const existing = map.get(no) || {
      stationNo: no,
      stationName: `${no}. ${r.stationGroup}`,
      stdMp: 0,
      shiftAMp: 0,
      shiftBMp: 0,
      uph: 0,
      ct: 0,
      upph: 0,
      outputPerShift: 0,
    };

    existing.stdMp += r.stdMp;
    if (r.shift === 'Shift-A') {
      existing.shiftAMp += r.stdMp;
    } else if (r.shift === 'Shift-B') {
      existing.shiftBMp += r.stdMp;
    } else {
      existing.shiftAMp += r.stdMp;
    }

    existing.uph += r.uph ?? 0;
    existing.upph += r.upph ?? 0;
    existing.outputPerShift += r.outputPerShift ?? 0;
    map.set(no, existing);
  });

  Array.from(map.keys()).forEach((no) => {
    const group = lineRows.filter((r) => r.stationNo === no);
    const item = map.get(no)!;
    const sumCt = group.reduce((s, r) => s + (r.ct ?? 0), 0);
    item.ct = group.length > 0 ? Number((sumCt / group.length).toFixed(1)) : 0;
  });

  return Array.from(map.values()).sort((a, b) => a.stationNo - b.stationNo);
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  rows,
  workingHoursPerShift,
  onQuickCreateBLine,
}) => {
  const [chartMetricMode, setChartMetricMode] = useState<'line_compare' | 'shift_compare' | 'output'>('line_compare');

  const lineAData = useMemo(() => buildLineStationMetrics(rows, 'Line-A'), [rows]);
  const lineBData = useMemo(() => buildLineStationMetrics(rows, 'Line-B'), [rows]);

  const hasBLine = lineBData.length > 0;

  // Combined Station Comparison Data (Line A vs B-Line & Shift A vs Shift B)
  const combinedComparison = useMemo(() => {
    const stationNumbers = Array.from(
      new Set([
        ...lineAData.map((d) => d.stationNo),
        ...lineBData.map((d) => d.stationNo),
      ])
    ).sort((a, b) => a - b);

    return stationNumbers.map((no) => {
      const a = lineAData.find((d) => d.stationNo === no);
      const b = lineBData.find((d) => d.stationNo === no);
      const name = a?.stationName || b?.stationName || `Station ${no}`;
      return {
        stationNo: no,
        name,
        lineA_MP: a?.stdMp ?? 0,
        lineB_MP: b?.stdMp ?? 0,
        lineA_Output: a?.outputPerShift ?? 0,
        lineB_Output: b?.outputPerShift ?? 0,
        lineA_ShiftA: a?.shiftAMp ?? 0,
        lineA_ShiftB: a?.shiftBMp ?? 0,
        lineB_ShiftA: b?.shiftAMp ?? 0,
        lineB_ShiftB: b?.shiftBMp ?? 0,
      };
    });
  }, [lineAData, lineBData]);

  // Summary KPIs for Line A vs Line B
  const lineSummary = useMemo(() => {
    const rowsA = rows.filter((r) => (r.productionLine || 'Line-A') === 'Line-A');
    const rowsB = rows.filter((r) => r.productionLine === 'Line-B');

    const calcSummary = (subset: ProductionRow[]) => {
      const dl = subset.filter((r) => r.type === 'DL' && !r.isSpare);
      const idl = subset.filter((r) => r.type === 'IDL');
      const spare = subset.filter((r) => r.isSpare);

      const dlMp = dl.reduce((s, r) => s + r.stdMp, 0);
      const idlMp = idl.reduce((s, r) => s + r.stdMp, 0);
      const spareMp = spare.reduce((s, r) => s + r.stdMp, 0);
      const grand = dlMp + idlMp + spareMp;

      const sumUpph = dl.reduce((s, r) => s + (r.upph ?? 0), 0);
      const sumOutput = dl.reduce((s, r) => s + (r.outputPerShift ?? 0), 0);

      return {
        dlMp,
        idlMp,
        spareMp,
        grand,
        sumUpph,
        sumOutput,
        netUpph: grand > 0 ? (400 / grand).toFixed(2) : '0.00',
      };
    };

    return {
      lineA: calcSummary(rowsA),
      lineB: calcSummary(rowsB),
    };
  }, [rows]);

  const idlBreakdown = useMemo(() => {
    const map = new Map<string, { role: string; lineA: number; lineB: number }>();
    rows
      .filter((r) => r.type === 'IDL')
      .forEach((r) => {
        const key = r.detail;
        const existing = map.get(key) || { role: key, lineA: 0, lineB: 0 };
        if ((r.productionLine || 'Line-A') === 'Line-A') {
          existing.lineA += r.stdMp;
        } else {
          existing.lineB += r.stdMp;
        }
        map.set(key, existing);
      });
    return Array.from(map.values());
  }, [rows]);

  if (combinedComparison.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Row 1: Dedicated Side-by-Side Graphs for RF Production Line A vs B-Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Graph: RF Production Line A */}
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-xs bg-sky-600 inline-block" />
                <h3 className="text-base font-bold text-slate-900">
                  กราฟสายการผลิต A-Line (RF Production Line A)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                จำนวนคนแยกตามกะ (Shift-A / Shift-B) และผลรวม UPPH ของแต่ละ Process ใน Line A
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono tabular-nums bg-sky-50 text-sky-900 px-3 py-1.5 rounded-md border border-sky-200">
              <span>DL: <strong>{lineSummary.lineA.dlMp}</strong></span>
              <span aria-hidden="true">·</span>
              <span>IDL: <strong>{lineSummary.lineA.idlMp}</strong></span>
              <span aria-hidden="true">·</span>
              <span>รวม: <strong>{lineSummary.lineA.grand}</strong> คน</span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={lineAData}
                margin={{ top: 8, right: 12, left: -12, bottom: 25 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis
                  dataKey="stationName"
                  tick={{ fontSize: 11, fill: '#334155' }}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#0284C7', fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#0D9488', fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#F8FAFC',
                    fontSize: '12px',
                    fontFamily: 'JetBrains Mono',
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="shiftAMp"
                  name="Line A (Shift-A MP)"
                  fill="#0284C7"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                />
                <Bar
                  yAxisId="left"
                  dataKey="shiftBMp"
                  name="Line A (Shift-B MP)"
                  fill="#38BDF8"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={24}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="upph"
                  name="Sum UPPH"
                  stroke="#0D9488"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0D9488' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-mono tabular-nums">
            <span>Line A ({workingHoursPerShift} ชม./กะ)</span>
            <div className="flex items-center gap-3">
              <span>Sum UPPH: <strong className="text-slate-900">{lineSummary.lineA.sumUpph}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Sum Output: <strong className="text-slate-900">{lineSummary.lineA.sumOutput.toLocaleString()}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Net UPPH: <strong className="text-sky-700">{lineSummary.lineA.netUpph}</strong></span>
            </div>
          </div>
        </div>

        {/* Right Graph: RF Production Line B (B-Line) */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" />
                  <h3 className="text-base font-bold text-slate-900">
                    กราฟสายการผลิต B-Line (RF Production Line B)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  จำนวนคนแยกตามกะ (Shift-A / Shift-B) และผลรวม UPPH ของแต่ละ Process ใน B-Line
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono tabular-nums bg-indigo-50 text-indigo-950 px-3 py-1.5 rounded-md border border-indigo-200">
                <span>DL: <strong>{lineSummary.lineB.dlMp}</strong></span>
                <span aria-hidden="true">·</span>
                <span>IDL: <strong>{lineSummary.lineB.idlMp}</strong></span>
                <span aria-hidden="true">·</span>
                <span>รวม: <strong>{lineSummary.lineB.grand}</strong> คน</span>
              </div>
            </div>

            {hasBLine ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={lineBData}
                    margin={{ top: 8, right: 12, left: -12, bottom: 25 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="stationName"
                      tick={{ fontSize: 11, fill: '#334155' }}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      height={56}
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11, fill: '#4F46E5', fontFamily: 'JetBrains Mono' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11, fill: '#D97706', fontFamily: 'JetBrains Mono' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                        fontFamily: 'JetBrains Mono',
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="shiftAMp"
                      name="B-Line (Shift-A MP)"
                      fill="#4F46E5"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={24}
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="shiftBMp"
                      name="B-Line (Shift-B MP)"
                      fill="#818CF8"
                      radius={[3, 3, 0, 0]}
                      maxBarSize={24}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="upph"
                      name="Sum UPPH"
                      stroke="#D97706"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#D97706' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 w-full bg-slate-50 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center p-6 text-center">
                <p className="text-sm font-semibold text-slate-800">
                  ยังไม่มีรายการ Process ในสายการผลิต B-Line
                </p>
                <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
                  คลิกปุ่มด้านล่างเพื่อสร้าง Process มาตรฐาน 8 สถานีสำหรับ B-Line ทันที หรือเพิ่มทีละ Process จากกล่องเครื่องมือด้านบน
                </p>
                {onQuickCreateBLine && (
                  <button
                    type="button"
                    onClick={onQuickCreateBLine}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors cursor-pointer"
                  >
                    <CopyPlus className="w-4 h-4" />
                    สร้าง Process B-Line มาตรฐานทันที
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 font-mono tabular-nums">
            <span>B-Line ({workingHoursPerShift} ชม./กะ)</span>
            <div className="flex items-center gap-3">
              <span>Sum UPPH: <strong className="text-slate-900">{lineSummary.lineB.sumUpph}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Sum Output: <strong className="text-slate-900">{lineSummary.lineB.sumOutput.toLocaleString()}</strong></span>
              <span aria-hidden="true">·</span>
              <span>Net UPPH: <strong className="text-indigo-700">{lineSummary.lineB.netUpph}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Comparative Multi-Mode Chart (Line A vs B-Line) and IDL Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                เปรียบเทียบกำลังคนและผลผลิตระหว่าง Line A และ B-Line แยกตามสถานี
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เปรียบเทียบจำนวนคนรวมของแต่ละสถานีระหว่าง Line A กับ B-Line หรือแยกตามกะทำงาน Shift-A / Shift-B
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setChartMetricMode('line_compare')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  chartMetricMode === 'line_compare'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Line A vs B-Line (MP)
              </button>
              <button
                type="button"
                onClick={() => setChartMetricMode('output')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  chartMetricMode === 'output'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                เทียบ Output/กะ
              </button>
              <button
                type="button"
                onClick={() => setChartMetricMode('shift_compare')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  chartMetricMode === 'shift_compare'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                แยกกะ A/B ทั้ง 2 Line
              </button>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMetricMode === 'line_compare' ? (
                <BarChart
                  data={combinedComparison}
                  margin={{ top: 8, right: 16, left: -12, bottom: 22 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
                  />
                  <Bar
                    dataKey="lineA_MP"
                    name="RF Line A (รวม 2 กะ)"
                    fill="#0284C7"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="lineB_MP"
                    name="RF B-Line (รวม 2 กะ)"
                    fill="#4F46E5"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              ) : chartMetricMode === 'output' ? (
                <BarChart
                  data={combinedComparison}
                  margin={{ top: 8, right: 16, left: -12, bottom: 22 }}
                  barGap={4}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
                  />
                  <Bar
                    dataKey="lineA_Output"
                    name="Line A Sum Output"
                    fill="#0D9488"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    dataKey="lineB_Output"
                    name="B-Line Sum Output"
                    fill="#D97706"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              ) : (
                <BarChart
                  data={combinedComparison}
                  margin={{ top: 8, right: 16, left: -12, bottom: 22 }}
                  barGap={2}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }}
                  />
                  <Bar
                    dataKey="lineA_ShiftA"
                    stackId="a"
                    name="Line A (Shift-A)"
                    fill="#0284C7"
                    maxBarSize={26}
                  />
                  <Bar
                    dataKey="lineA_ShiftB"
                    stackId="a"
                    name="Line A (Shift-B)"
                    fill="#38BDF8"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={26}
                  />
                  <Bar
                    dataKey="lineB_ShiftA"
                    stackId="b"
                    name="B-Line (Shift-A)"
                    fill="#4F46E5"
                    maxBarSize={26}
                  />
                  <Bar
                    dataKey="lineB_ShiftB"
                    stackId="b"
                    name="B-Line (Shift-B)"
                    fill="#818CF8"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={26}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right 4 Cols: IDL Breakdown for Line A & B-Line */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                สัดส่วนทีมสนับสนุน Indirect Labor (IDL)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                กำลังคน IDL ของ Line A ({lineSummary.lineA.idlMp} คน) และ B-Line ({lineSummary.lineB.idlMp} คน)
              </p>
            </div>

            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={idlBreakdown}
                  layout="vertical"
                  margin={{ top: 4, right: 20, left: 20, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#475569', fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="role"
                    width={110}
                    tick={{ fontSize: 11, fill: '#1E293B', fontWeight: 500 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#F8FAFC',
                      fontSize: '12px',
                      fontFamily: 'JetBrains Mono',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="lineA"
                    name="Line A IDL"
                    stackId="idl"
                    fill="#0284C7"
                    maxBarSize={20}
                  />
                  <Bar
                    dataKey="lineB"
                    name="B-Line IDL"
                    stackId="idl"
                    fill="#4F46E5"
                    radius={[0, 4, 4, 0]}
                    maxBarSize={20}
                  >
                    {idlBreakdown.map((_, idx) => (
                      <Cell key={`cell-${idx}`} fill="#4F46E5" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex items-center justify-between text-slate-600">
              <span>กำลังคนรวม (Line A : B-Line)</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {lineSummary.lineA.grand.toLocaleString()} :{' '}
                {lineSummary.lineB.grand.toLocaleString()} คน
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>ผลรวมทั้งหมด (Line A + B-Line)</span>
              <span className="font-mono font-bold text-emerald-700 tabular-nums">
                {(lineSummary.lineA.grand + lineSummary.lineB.grand).toLocaleString()} คน
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
