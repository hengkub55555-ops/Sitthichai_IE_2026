export type LaborCategory = 'DL' | 'IDL';
export type ProductionLineId = 'Line-A' | 'Line-B';
export type ShiftType = 'Shift-A' | 'Shift-B' | 'All';

export interface ProductionRow {
  id: string;
  productionLine: ProductionLineId; // 'Line-A' (Total RF Production Line A) or 'Line-B' (Total RF Production Line B)
  stationNo: number | null; // 1 to 8+ for DL stations, null for IDL / Spare
  detail: string;
  stationGroup: string; // e.g., "Roll former", "Inner Box", "Cab pre-assy", "Cabinet PU Foam", "System ass'y", "Vacuum & Assembly Door", "Cooling Test", "Fina&Packing I", "Indirect Labor (IDL)", "Spare Manpower"
  subLine?: 'Line 1' | 'Line 2' | 'Main Line';
  shift: 'Shift-A' | 'Shift-B' | 'Common';
  type: LaborCategory;
  isSpare?: boolean;
  stdMp: number;
  uph: number | null;
  ct: number | null;
  upph: number | null;
  outputPerShift: number | null;
}

export interface SimulationParams {
  targetOutputPerShift: number; // Default 2100
  workingHoursPerShift: number; // Default 10.5 hours
  absenteeismBufferPercent: number; // Default 0%
  efficiencyFactorPercent: number; // Default 100%
}

export interface SavedScenario {
  id: string;
  name: string;
  note: string;
  updatedAt: string;
  rows: ProductionRow[];
  simParams: SimulationParams;
}
