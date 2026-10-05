import React from 'react';
import { Sliders, RotateCcw, Calculator } from 'lucide-react';
import { SimulationParams } from '../types/manpower';

interface SimulationPanelProps {
  params: SimulationParams;
  onChange: (newParams: SimulationParams) => void;
  onApplySimulatedManpower: () => void;
  onResetDefault: () => void;
  currentTotalDl: number;
  currentTotalIdl: number;
  currentTotalSpare: number;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({
  params,
  onChange,
  onApplySimulatedManpower,
  onResetDefault,
  currentTotalDl,
  currentTotalIdl,
  currentTotalSpare,
}) => {
  // Base standard output per shift on RF Line A is 200 UPH * 10.5 hrs = 2,100 units/shift
  const baseLineUph = 200;
  const requiredLineUph =
    params.workingHoursPerShift > 0
      ? params.targetOutputPerShift / params.workingHoursPerShift
      : baseLineUph;

  const scaleFactor =
    (requiredLineUph / baseLineUph) * (100 / Math.max(params.efficiencyFactorPercent, 50));

  const projectedDl = Math.round(currentTotalDl * scaleFactor);
  const projectedSpare = Math.ceil((projectedDl * params.absenteeismBufferPercent) / 100);
  const projectedGrandTotal = projectedDl + currentTotalIdl + projectedSpare;
  const currentGrandTotal = currentTotalDl + currentTotalIdl + currentTotalSpare;
  const mpDiff = projectedGrandTotal - currentGrandTotal;

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-slate-100 text-slate-800 mt-0.5">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              จำลองแผนกำลังคนและเป้าหมายการผลิต (What-If Capacity & Manpower Simulator)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ปรับชั่วโมงทำงานต่อกะ เป้าหมายยอดผลิต หรืออัตราเผื่อพนักงานลา (Spare DL) เพื่อคำนวณกำลังคนที่ต้องใช้จริง
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onResetDefault}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            รีเซ็ตค่าเริ่มต้นตามเอกสารแนบ
          </button>
          <button
            type="button"
            onClick={onApplySimulatedManpower}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
          >
            <Calculator className="w-3.5 h-3.5" />
            นำค่า Spare และชั่วโมงกะไปคำนวณในตาราง
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
        {/* Control 1: Working Hours / Shift */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <label htmlFor="sim-hours" className="font-medium text-slate-700">
              ชั่วโมงทำงานต่อกะ (Working Hours/Shift)
            </label>
            <span className="font-mono font-semibold text-sky-700 tabular-nums">
              {params.workingHoursPerShift.toFixed(1)} ชม.
            </span>
          </div>
          <input
            id="sim-hours"
            type="range"
            min={7.5}
            max={12.0}
            step={0.5}
            value={params.workingHoursPerShift}
            onChange={(e) =>
              onChange({ ...params, workingHoursPerShift: parseFloat(e.target.value) })
            }
            className="w-full accent-sky-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-mono tabular-nums mt-1">
            <span>7.5h (ปกติ)</span>
            <span>10.5h (มาตรฐานไฟล์แนบ)</span>
            <span>12.0h</span>
          </div>
        </div>

        {/* Control 2: Target Output / Shift */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <label htmlFor="sim-output" className="font-medium text-slate-700">
              เป้าหมายผลผลิตต่อกะ (Target Output/Shift)
            </label>
            <span className="font-mono font-semibold text-sky-700 tabular-nums">
              {params.targetOutputPerShift.toLocaleString()} ตู้
            </span>
          </div>
          <input
            id="sim-output"
            type="range"
            min={1000}
            max={3500}
            step={50}
            value={params.targetOutputPerShift}
            onChange={(e) =>
              onChange({ ...params, targetOutputPerShift: parseInt(e.target.value, 10) })
            }
            className="w-full accent-sky-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-mono tabular-nums mt-1">
            <span>1,000</span>
            <span>2,100 (UPH 200×10.5h)</span>
            <span>3,500</span>
          </div>
        </div>

        {/* Control 3: Absenteeism / Spare Buffer (%) */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <label htmlFor="sim-spare" className="font-medium text-slate-700">
              เผื่ออัตรางานลา / Spare DL (%)
            </label>
            <span className="font-mono font-semibold text-sky-700 tabular-nums">
              {params.absenteeismBufferPercent}% ({projectedSpare} คน)
            </span>
          </div>
          <input
            id="sim-spare"
            type="range"
            min={0}
            max={15}
            step={1}
            value={params.absenteeismBufferPercent}
            onChange={(e) =>
              onChange({ ...params, absenteeismBufferPercent: parseInt(e.target.value, 10) })
            }
            className="w-full accent-sky-600 cursor-pointer"
          />
          <div className="flex justify-between text-[11px] text-slate-400 font-mono tabular-nums mt-1">
            <span>0% (0 คน)</span>
            <span>5% (~32 คน)</span>
            <span>15%</span>
          </div>
        </div>

        {/* Control 4: Simulated Outcome Summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex flex-col justify-between">
          <div className="text-xs text-slate-500 flex items-center justify-between">
            <span>ประมาณการกำลังคนรวม (Simulated MP)</span>
            <span className="font-mono tabular-nums text-[11px] text-slate-600">
              Req. {Math.round(requiredLineUph)} UPH
            </span>
          </div>
          <div className="my-1 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {projectedGrandTotal.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-500">คน</span>
            </span>
            <span
              className={`text-xs font-mono tabular-nums font-medium ${
                mpDiff === 0
                  ? 'text-slate-500'
                  : mpDiff > 0
                  ? 'text-amber-700'
                  : 'text-emerald-700'
              }`}
            >
              {mpDiff === 0
                ? 'เท่ากับแผนปัจจุบัน'
                : mpDiff > 0
                ? `+${mpDiff} คน จากปัจจุบัน`
                : `${mpDiff} คน จากปัจจุบัน`}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono tabular-nums flex items-center gap-2">
            <span>DL: {projectedDl}</span>
            <span aria-hidden="true">·</span>
            <span>IDL: {currentTotalIdl}</span>
            <span aria-hidden="true">·</span>
            <span>Spare: {projectedSpare}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
