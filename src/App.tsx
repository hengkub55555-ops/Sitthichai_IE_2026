import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Upload,
  Download,
  Search,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
} from 'lucide-react';
import { ProductionRow, SimulationParams, SavedScenario, ProductionLineId } from './types/manpower';
import {
  INITIAL_PRODUCTION_DATA,
  LINE_A_INITIAL_DATA,
  recalculateRowMetrics,
  createStandardBLineRows,
  normalizeRowsWithLine,
} from './data/initialManpowerData';
import { parseManpowerExcel, exportManpowerToExcel } from './utils/excelParser';
import { DashboardCharts } from './components/DashboardCharts';
import { SimulationPanel } from './components/SimulationPanel';
import { ManpowerSpreadsheet } from './components/ManpowerSpreadsheet';
import { SavedPlansPanel } from './components/SavedPlansPanel';
import { BLineProcessBuilder } from './components/BLineProcessBuilder';
import { SummaryAllLinesSheet } from './components/SummaryAllLinesSheet';

const STORAGE_KEYS = {
  ACTIVE_ROWS: 'rf_manpower_active_rows_v3',
  ACTIVE_SIM: 'rf_manpower_active_sim_v3',
  SAVED_SCENARIOS: 'rf_manpower_saved_scenarios_v3',
  ACTIVE_SCENARIO_ID: 'rf_manpower_active_scenario_id_v3',
};

const DEFAULT_SIM_PARAMS: SimulationParams = {
  targetOutputPerShift: 2100,
  workingHoursPerShift: 10.5,
  absenteeismBufferPercent: 0,
  efficiencyFactorPercent: 100,
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function App() {
  // Load initial rows from localStorage (with both A-Line and B-Line populated by default)
  const [rows, setRows] = useState<ProductionRow[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_ROWS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return normalizeRowsWithLine(parsed);
        }
      }
      // Check if previous v2 storage existed; if it only had Line-A, automatically append B-Line so user has both A & B lines ready
      const prevV2 = localStorage.getItem('rf_manpower_active_rows_v2');
      if (prevV2) {
        const parsedV2: ProductionRow[] = normalizeRowsWithLine(JSON.parse(prevV2));
        const hasBLine = parsedV2.some((r) => r.productionLine === 'Line-B');
        if (!hasBLine && parsedV2.length > 0) {
          return [...parsedV2, ...createStandardBLineRows(parsedV2, 10.5)];
        }
        if (parsedV2.length > 0) return parsedV2;
      }
    } catch {
      // ignore storage errors
    }
    return INITIAL_PRODUCTION_DATA;
  });

  const [simParams, setSimParams] = useState<SimulationParams>(() => {
    try {
      const saved =
        localStorage.getItem(STORAGE_KEYS.ACTIVE_SIM) ||
        localStorage.getItem('rf_manpower_active_sim_v2');
      if (saved) {
        return { ...DEFAULT_SIM_PARAMS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return DEFAULT_SIM_PARAMS;
  });

  const [scenarios, setScenarios] = useState<SavedScenario[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SAVED_SCENARIOS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return [
      {
        id: 'summary-all-line-1352',
        name: 'แผนมาตรฐาน Summary All Line (Line A 676 + B-Line 676 = 1,352 คน)',
        note: 'ครบทั้ง RF Production Line A และ B-Line (DL 1,272 คน + IDL 80 คน)',
        updatedAt: new Date().toLocaleDateString('th-TH') + ' ' + formatTime(new Date()),
        rows: INITIAL_PRODUCTION_DATA,
        simParams: DEFAULT_SIM_PARAMS,
      },
      {
        id: 'baseline-line-a-676',
        name: 'แผนเฉพาะ RF Production Line A (676 คน)',
        note: 'ข้อมูลตั้งต้นเฉพาะ Line A: DL 636 คน + IDL 40 คน',
        updatedAt: new Date().toLocaleDateString('th-TH') + ' ' + formatTime(new Date()),
        rows: LINE_A_INITIAL_DATA,
        simParams: DEFAULT_SIM_PARAMS,
      },
    ];
  });

  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SCENARIO_ID) || 'summary-all-line-1352';
  });

  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string>(() => formatTime(new Date()));
  const [hasUnsavedScenarioChanges, setHasUnsavedScenarioChanges] = useState(false);

  // Active Workbook Sheet Mode: 'summary_all' | 'line_a' | 'line_b' | 'saved'
  const [activeSheet, setActiveSheet] = useState<
    'summary_all' | 'line_a' | 'line_b' | 'saved'
  >('summary_all');

  const [shiftFilter, setShiftFilter] = useState<'All' | 'Shift-A' | 'Shift-B'>('All');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'DL' | 'IDL'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [uploadBanner, setUploadBanner] = useState<{
    type: 'success' | 'warning';
    message: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const spreadsheetRef = useRef<HTMLDivElement | null>(null);

  // Auto-persist rows and simParams to localStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ROWS, JSON.stringify(rows));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SIM, JSON.stringify(simParams));
      setLastAutoSavedTime(formatTime(new Date()));
    } catch {
      // ignore quota error
    }
  }, [rows, simParams]);

  // Persist saved scenarios list
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_SCENARIOS, JSON.stringify(scenarios));
      if (activeScenarioId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_SCENARIO_ID, activeScenarioId);
      }
    } catch {
      // ignore
    }
  }, [scenarios, activeScenarioId]);

  // Compute global KPI summary metrics including Line A vs B-Line breakdown
  const metrics = useMemo(() => {
    const lineARows = rows.filter((r) => (r.productionLine || 'Line-A') === 'Line-A');
    const lineBRows = rows.filter((r) => r.productionLine === 'Line-B');

    const lineADl = lineARows
      .filter((r) => r.type === 'DL' && !r.isSpare)
      .reduce((s, r) => s + r.stdMp, 0);
    const lineAIdl = lineARows
      .filter((r) => r.type === 'IDL')
      .reduce((s, r) => s + r.stdMp, 0);
    const lineASpare = lineARows
      .filter((r) => r.isSpare)
      .reduce((s, r) => s + r.stdMp, 0);
    const lineAGrand = lineADl + lineAIdl + lineASpare;

    const lineBDl = lineBRows
      .filter((r) => r.type === 'DL' && !r.isSpare)
      .reduce((s, r) => s + r.stdMp, 0);
    const lineBIdl = lineBRows
      .filter((r) => r.type === 'IDL')
      .reduce((s, r) => s + r.stdMp, 0);
    const lineBSpare = lineBRows
      .filter((r) => r.isSpare)
      .reduce((s, r) => s + r.stdMp, 0);
    const lineBGrand = lineBDl + lineBIdl + lineBSpare;

    const dlRows = rows.filter((r) => r.type === 'DL' && !r.isSpare);
    const idlRows = rows.filter((r) => r.type === 'IDL');
    const spareRows = rows.filter((r) => r.isSpare);

    const totalDl = dlRows.reduce((sum, r) => sum + r.stdMp, 0);
    const totalIdl = idlRows.reduce((sum, r) => sum + r.stdMp, 0);
    const totalSpare = spareRows.reduce((sum, r) => sum + r.stdMp, 0);
    const grandTotal = totalDl + totalIdl + totalSpare;

    const sumStationUpph = dlRows.reduce((sum, r) => sum + (r.upph ?? 0), 0);
    const sumStationOutput = dlRows.reduce((sum, r) => sum + (r.outputPerShift ?? 0), 0);

    const idlRatio = grandTotal > 0 ? ((totalIdl / grandTotal) * 100).toFixed(1) : '0.0';

    return {
      lineADl,
      lineAIdl,
      lineAGrand,
      lineBDl,
      lineBIdl,
      lineBGrand,
      lineBCount: lineBRows.length,
      totalDl,
      totalIdl,
      totalSpare,
      grandTotal,
      sumStationUpph,
      sumStationOutput,
      idlRatio,
    };
  }, [rows]);

  // Generate or reset B-Line processes cloned from Line A
  const handleGenerateBLineFromLineA = () => {
    setRows((prev) => {
      const onlyLineA = prev.filter((r) => (r.productionLine || 'Line-A') === 'Line-A');
      const newBLine = createStandardBLineRows(onlyLineA, simParams.workingHoursPerShift);
      return [...onlyLineA, ...newBLine];
    });
    setHasUnsavedScenarioChanges(true);
    setUploadBanner({
      type: 'success',
      message:
        'สร้าง/รีเซ็ตข้อมูลสายการผลิต B-Line (RF Production Line B) ครบทั้ง 8 สถานี + IDL + Spare เรียบร้อยแล้ว',
    });
  };

  // Add a custom B-Line process pair (Shift A + Shift B or IDL) from the B-Line Builder
  const handleAddBLineProcessPair = (newRows: ProductionRow[]) => {
    setRows((prev) => [...prev, ...newRows]);
    setHasUnsavedScenarioChanges(true);
    setUploadBanner({
      type: 'success',
      message: `เพิ่ม Process "${newRows[0]?.detail}" เข้าสู่สายการผลิต B-Line และอัปเดตหน้า Summary All Line เรียบร้อยแล้ว`,
    });
  };

  // Clear all B-Line rows
  const handleClearBLine = () => {
    setRows((prev) => prev.filter((r) => (r.productionLine || 'Line-A') !== 'Line-B'));
    setHasUnsavedScenarioChanges(true);
    setUploadBanner({
      type: 'warning',
      message: 'ล้างรายการ Process ของสายการผลิต B-Line ออกทั้งหมดแล้ว',
    });
  };

  // Save current state as new scenario or overwrite active scenario
  const handleSaveScenario = (
    name: string,
    note: string,
    overwriteCurrent: boolean = false
  ) => {
    const timestamp = new Date().toLocaleDateString('th-TH') + ' ' + formatTime(new Date());

    if (overwriteCurrent && activeScenarioId) {
      setScenarios((prev) =>
        prev.map((sc) =>
          sc.id === activeScenarioId
            ? {
                ...sc,
                name,
                note,
                updatedAt: timestamp,
                rows: [...rows],
                simParams: { ...simParams },
              }
            : sc
        )
      );
      setHasUnsavedScenarioChanges(false);
      setUploadBanner({
        type: 'success',
        message: `บันทึกทับข้อมูลแผน "${name}" บนเว็บเรียบร้อยแล้ว (${timestamp})`,
      });
    } else {
      const newId = `plan-${Date.now()}`;
      const newScenario: SavedScenario = {
        id: newId,
        name,
        note,
        updatedAt: timestamp,
        rows: [...rows],
        simParams: { ...simParams },
      };
      setScenarios((prev) => [newScenario, ...prev]);
      setActiveScenarioId(newId);
      setHasUnsavedScenarioChanges(false);
      setUploadBanner({
        type: 'success',
        message: `บันทึกแผนใหม่ "${name}" ลงบนเว็บเรียบร้อยแล้ว`,
      });
    }
  };

  const handleLoadScenario = (scenario: SavedScenario) => {
    setRows(normalizeRowsWithLine(scenario.rows));
    setSimParams(scenario.simParams);
    setActiveScenarioId(scenario.id);
    setHasUnsavedScenarioChanges(false);
    setUploadBanner({
      type: 'success',
      message: `โหลดแผน "${scenario.name}" มาแสดงผลบน Dashboard เรียบร้อยแล้ว`,
    });
  };

  const handleDeleteScenario = (id: string) => {
    setScenarios((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (activeScenarioId === id && remaining.length > 0) {
        setActiveScenarioId(remaining[0].id);
      }
      return remaining;
    });
  };

  const handleRenameScenario = (id: string, newName: string) => {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
    );
  };

  // Handle Excel file upload
  const handleFileUpload = async (file: File) => {
    try {
      const { rows: parsed, warnings } = await parseManpowerExcel(
        file,
        simParams.workingHoursPerShift
      );
      if (parsed.length > 0) {
        setRows(normalizeRowsWithLine(parsed));
        setHasUnsavedScenarioChanges(true);
        setUploadBanner({
          type: warnings.length > 0 ? 'warning' : 'success',
          message:
            warnings.length > 0
              ? `อัปโหลดไฟล์ "${file.name}" สำเร็จ (${parsed.length} รายการ) พร้อมคำเตือน: ${warnings.join(', ')}`
              : `อัปโหลดและคำนวณข้อมูลจากไฟล์ "${file.name}" เข้าสู่ Summary All Line สำเร็จ (${parsed.length} รายการ)`,
        });
      } else {
        setUploadBanner({
          type: 'warning',
          message:
            warnings[0] ||
            `ไม่พบตารางข้อมูลที่รองรับในไฟล์ "${file.name}" กรุณาใช้เทมเพลตมาตรฐาน`,
        });
      }
    } catch {
      setUploadBanner({
        type: 'warning',
        message: `เกิดข้อผิดพลาดในการอ่านไฟล์ Excel กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx, .xls หรือ .csv ที่ถูกต้อง`,
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Update individual row
  const handleUpdateRow = (updated: ProductionRow) => {
    setRows((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setHasUnsavedScenarioChanges(true);
  };

  // Add new row
  const handleAddRow = (newRow: ProductionRow) => {
    setRows((prev) => [...prev, newRow]);
    setHasUnsavedScenarioChanges(true);
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    setHasUnsavedScenarioChanges(true);
  };

  // Apply simulation parameters to actual table rows
  const handleApplySimulation = () => {
    const baseLineUph = 200;
    const requiredLineUph =
      simParams.workingHoursPerShift > 0
        ? simParams.targetOutputPerShift / simParams.workingHoursPerShift
        : baseLineUph;
    const scaleFactor =
      (requiredLineUph / baseLineUph) * (100 / Math.max(simParams.efficiencyFactorPercent, 50));

    setRows((prev) => {
      const updatedDl = prev.map((row) => {
        if (row.type === 'DL' && !row.isSpare) {
          const scaledMp = Math.max(1, Math.round(row.stdMp * scaleFactor));
          return recalculateRowMetrics(
            { ...row, stdMp: scaledMp },
            simParams.workingHoursPerShift
          );
        }
        return row;
      });

      return updatedDl.map((row) => {
        if (row.isSpare) {
          const parentLine = row.productionLine || 'Line-A';
          const shiftDlSum = updatedDl
            .filter(
              (r) =>
                (r.productionLine || 'Line-A') === parentLine &&
                r.type === 'DL' &&
                !r.isSpare &&
                r.shift === row.shift
            )
            .reduce((s, r) => s + r.stdMp, 0);
          const spareVal = Math.ceil((shiftDlSum * simParams.absenteeismBufferPercent) / 100);
          return { ...row, stdMp: spareVal };
        }
        return row;
      });
    });

    setHasUnsavedScenarioChanges(true);
    setUploadBanner({
      type: 'success',
      message: `อัปเดตตารางคำนวณทั้ง Line A และ B-Line ตามค่าจำลองแล้ว (ชั่วโมงกะ ${simParams.workingHoursPerShift} ชม. · เป้าหมาย ${simParams.targetOutputPerShift.toLocaleString()} ตู้/กะ · Spare ${simParams.absenteeismBufferPercent}%)`,
    });
  };

  // Reset to full A+B baseline
  const handleResetBaseline = () => {
    setRows(INITIAL_PRODUCTION_DATA);
    setSimParams(DEFAULT_SIM_PARAMS);
    setShiftFilter('All');
    setCategoryFilter('All');
    setSearchQuery('');
    setHasUnsavedScenarioChanges(true);
    setUploadBanner({
      type: 'success',
      message:
        'รีเซ็ตข้อมูลกลับสู่ค่ามาตรฐานครบทั้ง Line A (676 คน) และ B-Line (676 คน) รวมทั้งสิ้น 1,352 คน เรียบร้อยแล้ว',
    });
  };

  // Determine which lineFilter to pass into ManpowerSpreadsheet based on activeSheet
  const activeLineFilter: 'All' | 'Line-A' | 'Line-B' =
    activeSheet === 'line_a'
      ? 'Line-A'
      : activeSheet === 'line_b'
      ? 'Line-B'
      : 'All';

  const handleSelectLineDetail = (line: ProductionLineId) => {
    setActiveSheet(line === 'Line-A' ? 'line_a' : 'line_b');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: Zone 1 (Single brand wordmark) — Zone 2 (4 Sheet Tabs) — Zone 3 (2 primary actions) */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
          {/* Zone 1: Brand Title */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              setActiveSheet('summary_all');
            }}
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            RF Line Manpower
          </a>

          {/* Zone 2: Workbook Sheet Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveSheet('summary_all')}
              className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                activeSheet === 'summary_all'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2 decoration-emerald-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Sheet: Summary All Line
            </button>
            <button
              type="button"
              onClick={() => setActiveSheet('line_a')}
              className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                activeSheet === 'line_a'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2 decoration-sky-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Sheet: A-Line ({metrics.lineAGrand})
            </button>
            <button
              type="button"
              onClick={() => setActiveSheet('line_b')}
              className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                activeSheet === 'line_b'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2 decoration-indigo-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Sheet: B-Line ({metrics.lineBGrand})
            </button>
            <button
              type="button"
              onClick={() => setActiveSheet('saved')}
              className={`py-1 transition-colors whitespace-nowrap cursor-pointer ${
                activeSheet === 'saved'
                  ? 'text-slate-900 font-bold underline underline-offset-8 decoration-2 decoration-sky-600'
                  : 'hover:text-slate-900'
              }`}
            >
              แผนที่บันทึกไว้ ({scenarios.length})
            </button>
          </nav>

          {/* Zone 3: 2 Primary Actions (Save Plan & Export Excel) */}
          <div className="flex items-center gap-2.5 shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => {
                const active = scenarios.find((s) => s.id === activeScenarioId);
                if (active) {
                  handleSaveScenario(active.name, active.note, true);
                } else {
                  handleSaveScenario(
                    `แผนกำลังคน Summary All Line (${new Date().toLocaleDateString('th-TH')})`,
                    'บันทึกจากหน้า Dashboard',
                    false
                  );
                }
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              บันทึกข้อมูลบนเว็บ
            </button>
            <button
              type="button"
              onClick={() => exportManpowerToExcel(rows, simParams.workingHoursPerShift)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              ส่งออก Excel (3 Sheets)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container (1440px desktop width baseline) */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-6 space-y-6">
        {/* Upload / Save Notification Banner */}
        {uploadBanner && (
          <div
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-xs ${
              uploadBanner.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {uploadBanner.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="font-medium">{uploadBanner.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setUploadBanner(null)}
              className="p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Executive Header & Excel Dropzone Bar */}
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white border border-slate-200 rounded-lg p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
              <span>Summary All Line Dashboard</span>
              <span aria-hidden="true">·</span>
              <span>A-Line ({metrics.lineAGrand} คน) + B-Line ({metrics.lineBGrand} คน)</span>
              <span aria-hidden="true">·</span>
              <span>บันทึกอัตโนมัติบนเว็บล่าสุด {lastAutoSavedTime}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard สรุปรวมกำลังคนทุกสายการผลิต (Summary All Line: A-Line & B-Line)
            </h1>

            {/* Interactive Workbook Sheet Switcher Pills */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setActiveSheet('summary_all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeSheet === 'summary_all'
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                1. Sheet: Summary All Line (รวม {metrics.grandTotal.toLocaleString()} คน)
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet('line_a')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeSheet === 'line_a'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                2. Sheet: RF Line A ({metrics.lineAGrand.toLocaleString()} คน)
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet('line_b')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeSheet === 'line_b'
                    ? 'bg-indigo-700 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                3. Sheet: RF B-Line ({metrics.lineBGrand.toLocaleString()} คน)
              </button>
              <button
                type="button"
                onClick={() => setActiveSheet('saved')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  activeSheet === 'saved'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900'
                }`}
              >
                โปรไฟล์ที่บันทึกไว้ ({scenarios.length})
              </button>
            </div>
          </div>

          {/* Interactive Drag & Drop Excel Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border border-dashed transition-colors cursor-pointer ${
              isDragging
                ? 'border-sky-600 bg-sky-50'
                : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100/80 hover:border-slate-400'
            }`}
          >
            <FileSpreadsheet className="w-6 h-6 text-emerald-700 shrink-0" />
            <div className="text-xs">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-sky-600" />
                อัปโหลดไฟล์ Excel (.xlsx / .csv) หรือลากไฟล์มาวางที่นี่
              </div>
              <div className="text-slate-500">
                ส่งออก Excel ได้ครบทั้ง 3 Sheets: Summary All Line, RF Line A, RF Line B
              </div>
            </div>
          </div>
        </section>

        {/* Primary KPI Summary Strip (5 Cards) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Grand Total Manpower (Summary All Lines) */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-emerald-800">
              Summary All Line (รวม A + B-Line)
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono tabular-nums text-emerald-700">
                {metrics.grandTotal.toLocaleString()}
              </span>
              <span className="text-xs text-slate-600 font-mono tabular-nums">
                คน (All Lines)
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
              <span>DL {metrics.totalDl.toLocaleString()}</span>
              <span aria-hidden="true">·</span>
              <span>IDL {metrics.totalIdl}</span>
              <span aria-hidden="true">·</span>
              <span>Spare {metrics.totalSpare}</span>
            </div>
          </div>

          {/* Card 2: Dedicated RF Production Line A Summary */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-sky-800">
              สายการผลิต A-Line (RF Line A)
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono tabular-nums text-sky-700">
                {metrics.lineAGrand.toLocaleString()}
              </span>
              <span className="text-xs text-slate-600 font-mono tabular-nums">
                คน (2 กะ)
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
              <span>DL: {metrics.lineADl} คน</span>
              <span aria-hidden="true">·</span>
              <span>IDL: {metrics.lineAIdl} คน</span>
            </div>
          </div>

          {/* Card 3: Dedicated RF Production Line B (B-Line) Summary */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-indigo-800">
              สายการผลิต B-Line (RF Line B)
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono tabular-nums text-indigo-700">
                {metrics.lineBGrand.toLocaleString()}
              </span>
              <span className="text-xs text-slate-600 font-mono tabular-nums">
                คน (2 กะ)
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-xs text-slate-500 font-mono tabular-nums">
              <span>DL: {metrics.lineBDl} คน</span>
              <span aria-hidden="true">·</span>
              <span>IDL: {metrics.lineBIdl} คน</span>
            </div>
          </div>

          {/* Card 4: Total Indirect Labor (IDL) */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs font-medium text-slate-500">
              ทีมสนับสนุนรวมทุกสาย (All IDL)
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {metrics.totalIdl.toLocaleString()}
              </span>
              <span className="text-xs text-slate-600 font-mono tabular-nums">
                คน ({metrics.idlRatio}%)
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums truncate">
              <span>Line A IDL: {metrics.lineAIdl}</span>
              <span aria-hidden="true">·</span>
              <span>B-Line IDL: {metrics.lineBIdl}</span>
            </div>
          </div>

          {/* Card 5: Combined Line Output & UPPH */}
          <div className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs font-medium text-slate-500">
              ผลรวม Output/Shift (Line A + B)
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {metrics.sumStationOutput.toLocaleString()}
              </span>
              <span className="text-xs text-slate-600 font-mono tabular-nums">
                Sum Output
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
              <span>Sum UPPH: {metrics.sumStationUpph}</span>
              <span aria-hidden="true">·</span>
              <span>Plant UPH: 400/กะ</span>
            </div>
          </div>
        </section>

        {/* SHEET 1: SUMMARY ALL LINE DASHBOARD VIEW */}
        {activeSheet === 'summary_all' && (
          <>
            {/* Master Summary All Line Matrix Table */}
            <SummaryAllLinesSheet
              rows={rows}
              workingHoursPerShift={simParams.workingHoursPerShift}
              onSelectLineDetail={handleSelectLineDetail}
            />

            {/* Side-by-Side Line A & B-Line Analytics Charts */}
            <DashboardCharts
              rows={rows}
              workingHoursPerShift={simParams.workingHoursPerShift}
              onQuickCreateBLine={handleGenerateBLineFromLineA}
            />

            {/* What-If Capacity & Manpower Simulator */}
            <SimulationPanel
              params={simParams}
              onChange={(newParams) => {
                if (newParams.workingHoursPerShift !== simParams.workingHoursPerShift) {
                  setRows((prev) =>
                    prev.map((r) => recalculateRowMetrics(r, newParams.workingHoursPerShift))
                  );
                }
                setSimParams(newParams);
                setHasUnsavedScenarioChanges(true);
              }}
              onApplySimulatedManpower={handleApplySimulation}
              onResetDefault={handleResetBaseline}
              currentTotalDl={metrics.totalDl}
              currentTotalIdl={metrics.totalIdl}
              currentTotalSpare={metrics.totalSpare}
            />
          </>
        )}

        {/* B-Line Process Builder (Shown when on B-Line Sheet or Summary All Line) */}
        {(activeSheet === 'line_b' || activeSheet === 'summary_all') && (
          <BLineProcessBuilder
            rows={rows}
            workingHoursPerShift={simParams.workingHoursPerShift}
            onGenerateBLineFromLineA={handleGenerateBLineFromLineA}
            onAddBLineProcessPair={handleAddBLineProcessPair}
            onClearBLine={handleClearBLine}
            onFocusBLineTable={() => {
              setActiveSheet('line_b');
              spreadsheetRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
        )}

        {/* Saved Plans Manager */}
        {(activeSheet === 'saved' || activeSheet === 'summary_all') && (
          <SavedPlansPanel
            scenarios={scenarios}
            activeScenarioId={activeScenarioId}
            hasUnsavedChanges={hasUnsavedScenarioChanges}
            lastAutoSavedTime={lastAutoSavedTime}
            onSaveCurrent={handleSaveScenario}
            onLoadScenario={handleLoadScenario}
            onDeleteScenario={handleDeleteScenario}
            onRenameScenario={handleRenameScenario}
          />
        )}

        {/* Editable Detailed Spreadsheet for Line A, B-Line, or All Lines */}
        {(activeSheet === 'summary_all' ||
          activeSheet === 'line_a' ||
          activeSheet === 'line_b') && (
          <section ref={spreadsheetRef} className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Sheet / Line Quick Switcher */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveSheet('summary_all')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      activeSheet === 'summary_all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    แสดงทั้ง Line A + B-Line
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSheet('line_a')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      activeSheet === 'line_a'
                        ? 'bg-white text-sky-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    เฉพาะ Sheet: Line A
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSheet('line_b')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      activeSheet === 'line_b'
                        ? 'bg-white text-indigo-800 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    เฉพาะ Sheet: B-Line
                  </button>
                </div>

                {/* Shift Segmented Control */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {(['All', 'Shift-A', 'Shift-B'] as const).map((shift) => (
                    <button
                      key={shift}
                      type="button"
                      onClick={() => setShiftFilter(shift)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        shiftFilter === shift
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {shift === 'All' ? 'ทุกกะ (Shift A+B)' : shift}
                    </button>
                  ))}
                </div>

                {/* Labor Type Segmented Control */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
                  {(['All', 'DL', 'IDL'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        categoryFilter === cat
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {cat === 'All' ? 'DL + IDL' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Input */}
              <div className="relative w-full lg:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อ Process เช่น Roll former..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>

            {/* Interactive Spreadsheet Component */}
            <ManpowerSpreadsheet
              rows={rows}
              workingHoursPerShift={simParams.workingHoursPerShift}
              lineFilter={activeLineFilter}
              shiftFilter={shiftFilter}
              categoryFilter={categoryFilter}
              searchQuery={searchQuery}
              onUpdateRow={handleUpdateRow}
              onAddRow={handleAddRow}
              onDeleteRow={handleDeleteRow}
              onGenerateBLineFromLineA={handleGenerateBLineFromLineA}
            />
          </section>
        )}
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12 py-4 px-6">
        <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            RF Production Line A & B-Line — Summary All Line Dashboard & Web Manpower Calculator
          </span>
          <div className="flex items-center gap-2 font-mono tabular-nums">
            <span>Line A: {metrics.lineAGrand} MP</span>
            <span aria-hidden="true">·</span>
            <span>B-Line: {metrics.lineBGrand} MP</span>
            <span aria-hidden="true">·</span>
            <span>Summary All Line: {metrics.grandTotal.toLocaleString()} MP</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
