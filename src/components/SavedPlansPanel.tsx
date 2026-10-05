import React, { useState } from 'react';
import {
  Save,
  BookmarkCheck,
  Trash2,
  FolderOpen,
  PlusCircle,
  Check,
  Edit3,
} from 'lucide-react';
import { SavedScenario } from '../types/manpower';

interface SavedPlansPanelProps {
  scenarios: SavedScenario[];
  activeScenarioId: string | null;
  hasUnsavedChanges: boolean;
  lastAutoSavedTime: string;
  onSaveCurrent: (name: string, note: string, overwriteCurrent: boolean) => void;
  onLoadScenario: (scenario: SavedScenario) => void;
  onDeleteScenario: (id: string) => void;
  onRenameScenario: (id: string, newName: string) => void;
}

export const SavedPlansPanel: React.FC<SavedPlansPanelProps> = ({
  scenarios,
  activeScenarioId,
  hasUnsavedChanges,
  lastAutoSavedTime,
  onSaveCurrent,
  onLoadScenario,
  onDeleteScenario,
  onRenameScenario,
}) => {
  const [planName, setPlanName] = useState('');
  const [planNote, setPlanNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const activeScenario = scenarios.find((s) => s.id === activeScenarioId);

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName =
      planName.trim() || `แผนกำลังคน RF Line (${new Date().toLocaleDateString('th-TH')})`;
    onSaveCurrent(trimmedName, planNote.trim(), false);
    setPlanName('');
    setPlanNote('');
  };

  const handleQuickOverwrite = () => {
    if (!activeScenario) return;
    onSaveCurrent(activeScenario.name, activeScenario.note, true);
  };

  return (
    <section className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-emerald-50 text-emerald-700 mt-0.5">
            <BookmarkCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">
                ระบบบันทึกและจัดการเวอร์ชันแผนกำลังคนบนเว็บ (Web Saved Plans & Auto-Save)
              </h2>
              <span className="text-xs text-emerald-700 font-mono tabular-nums">
                · บันทึกอัตโนมัติล่าสุด: {lastAutoSavedTime}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ข้อมูลที่แก้ไขในตารางทุกช่องจะถูกบันทึกบนเว็บอัตโนมัติ และคุณสามารถกดบันทึกเก็บเป็นโปรไฟล์แยกตามรุ่นการผลิตหรือแผนกะ A/B ได้
            </p>
          </div>
        </div>

        {/* Quick Save / Overwrite Active Scenario Button */}
        {activeScenario && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-600">
              กำลังเปิดใช้: <strong className="text-slate-900">{activeScenario.name}</strong>
            </span>
            <button
              type="button"
              onClick={handleQuickOverwrite}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors whitespace-nowrap cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {hasUnsavedChanges ? 'บันทึกทับแผนปัจจุบัน' : 'บันทึกซ้ำเรียบร้อย'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4">
        {/* Form to Save Current State as New Named Plan */}
        <form
          onSubmit={handleSaveNew}
          className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between space-y-3"
        >
          <div>
            <h3 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <PlusCircle className="w-3.5 h-3.5 text-sky-600" />
              บันทึกข้อมูลตารางปัจจุบันเป็นแผนใหม่บนเว็บ
            </h3>
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  ชื่อแผนกำลังคน (Plan Name)
                </label>
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="เช่น แผนมาตรฐาน 676 คน, แผนเพิ่มยอดกะ A..."
                  className="w-full text-xs bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:border-sky-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  หมายเหตุ / รายละเอียดเพิ่มเติม
                </label>
                <input
                  type="text"
                  value={planNote}
                  onChange={(e) => setPlanNote(e.target.value)}
                  placeholder="เช่น ปรับชั่วโมงทำงาน 10.5 ชม. เผื่อ Spare 5%"
                  className="w-full text-xs bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            บันทึกแผนลงบนเว็บ (Save New Snapshot)
          </button>
        </form>

        {/* List of Saved Scenarios */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="text-xs font-bold text-slate-800 mb-2 flex items-center justify-between">
            <span>รายการแผนที่บันทึกไว้บนเว็บ ({scenarios.length} รายการ)</span>
            <span className="text-[11px] font-normal text-slate-500">
              คลิก "โหลดข้อมูล" เพื่อสลับตารางและกราฟทันที
            </span>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-lg max-h-52 overflow-y-auto bg-white">
            {scenarios.map((sc) => {
              const dlCount = sc.rows
                .filter((r) => r.type === 'DL' && !r.isSpare)
                .reduce((s, r) => s + r.stdMp, 0);
              const idlCount = sc.rows
                .filter((r) => r.type === 'IDL')
                .reduce((s, r) => s + r.stdMp, 0);
              const spareCount = sc.rows
                .filter((r) => r.isSpare)
                .reduce((s, r) => s + r.stdMp, 0);
              const totalCount = dlCount + idlCount + spareCount;
              const isActive = sc.id === activeScenarioId;

              return (
                <div
                  key={sc.id}
                  className={`p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                    isActive ? 'bg-sky-50/70' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {editingId === sc.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="text-xs font-semibold bg-white border border-sky-500 rounded px-2 py-0.5 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (editingName.trim()) {
                                onRenameScenario(sc.id, editingName.trim());
                              }
                              setEditingId(null);
                            }}
                            className="p-1 text-emerald-700 hover:bg-emerald-100 rounded cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {sc.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(sc.id);
                              setEditingName(sc.name);
                            }}
                            title="เปลี่ยนชื่อแผน"
                            className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {isActive && (
                        <span className="text-[11px] font-medium text-sky-700">
                          · กำลังใช้งาน
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                      <span>รวม {totalCount} คน (DL {dlCount} · IDL {idlCount} · Spare {spareCount})</span>
                      <span aria-hidden="true">·</span>
                      <span>อัปเดต: {sc.updatedAt}</span>
                    </div>
                    {sc.note && (
                      <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                        หมายเหตุ: {sc.note}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onLoadScenario(sc)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      {isActive ? 'โหลดซ้ำ' : 'โหลดข้อมูล'}
                    </button>
                    {scenarios.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteScenario(sc.id)}
                        title="ลบแผนนี้"
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
