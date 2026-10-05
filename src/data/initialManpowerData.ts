import { ProductionRow } from '../types/manpower';

/**
 * Exact dataset for RF Production Line A (from the attached specification image)
 */
export const LINE_A_INITIAL_DATA: ProductionRow[] = [
  // 1. Roll former
  {
    id: 'dl-1-a',
    productionLine: 'Line-A',
    stationNo: 1,
    detail: 'Roll former (Shift-A)',
    stationGroup: 'Roll former',
    shift: 'Shift-A',
    type: 'DL',
    stdMp: 12,
    uph: 200,
    ct: 15,
    upph: 17,
    outputPerShift: 175,
  },
  {
    id: 'dl-1-b',
    productionLine: 'Line-A',
    stationNo: 1,
    detail: 'Roll former (Shift-B)',
    stationGroup: 'Roll former',
    shift: 'Shift-B',
    type: 'DL',
    stdMp: 12,
    uph: 200,
    ct: 15,
    upph: 17,
    outputPerShift: 175,
  },

  // 2. Inner Box
  {
    id: 'dl-2-1a',
    productionLine: 'Line-A',
    stationNo: 2,
    detail: 'Inner Box line.1 (Shift-A)',
    stationGroup: 'Inner Box',
    shift: 'Shift-A',
    type: 'DL',
    stdMp: 34,
    uph: 100,
    ct: 31,
    upph: 3,
    outputPerShift: 31,
  },
  {
    id: 'dl-2-2a',
    productionLine: 'Line-A',
    stationNo: 2,
    detail: 'Inner Box line.2 (Shift-A)',
    stationGroup: 'Inner Box',
    shift: 'Shift-A',
    type: 'DL',
    stdMp: 37,
    uph: 100,
    ct: 31,
    upph: 3,
    outputPerShift: 28,
  },
  {
    id: 'dl-2-1b',
    productionLine: 'Line-A',
    stationNo: 2,
    detail: 'Inner Box line.1 (Shift-B)',
    stationGroup: 'Inner Box',
    shift: 'Shift-B',
    type: 'DL',
    stdMp: 34,
    uph: 100,
    ct: 31,
    upph: 3,
    outputPerShift: 31,
  },
  {
    id: 'dl-2-2b',
    productionLine: 'Line-A',
    stationNo: 2,
    detail: 'Inner Box line.2 (Shift-B)',
    stationGroup: 'Inner Box',
    shift: 'Shift-B',
    type: 'DL',
    stdMp: 37,
    uph: 100,
    ct: 31,
    upph: 3,
    outputPerShift: 28,
  },

  // 3. Cab pre-assy
  {
    id: 'dl-3-1a',
    productionLine: 'Line-A',
    stationNo: 3,
    detail: 'Cab pre-assy Line.1 (Shift-A)',
    stationGroup: 'Cab pre-assy',
    shift: 'Shift-A',
    type: 'DL',
    stdMp: 30,
    uph: 100,
    ct: 29,
    upph: 3,
    outputPerShift: 35,
  },
  {
    id: 'dl-3-2a',
    productionLine: 'Line-A',
    stationNo: 3,
    detail: 'Cab pre-assy Line.2 (Shift-A)',
    stationGroup: 'Cab pre-assy',
    shift: 'Shift-A',
    type: 'DL',
    stdMp: 26,
    uph: 100,
    ct: 31,
    upph: 4,
    outputPerShift: 40,
  },
  {
    id: 'dl-3-1b',
    productionLine: 'Line-A',
    stationNo: 3,
    detail: 'Cab pre-assy Line.1 (Shift-B)',
    stationGroup: 'Cab pre-assy',
    shift: 'Shift-B',
    type: 'DL',
    stdMp: 30,
    uph: 100,
    ct: 29,
    upph: 3,
    outputPerShift: 35,
  },
  {
    id: 'dl-3-2b',
    productionLine: 'Line-A',
    stationNo: 3,
    detail: 'Cab pre-assy Line.2 (Shift-B)',
    stationGroup: 'Cab pre-assy',
    shift: 'Shift-B',
    type: 'DL',
    stdMp: 26,
    uph: 100,
    ct: 31,
    upph: 4,
    outputPerShift: 40,
  },

  // 4. Cabinet PU Foam
  {
    id: 'dl-4-1a',
    productionLine: 'Line-A',
    stationNo: 4,
    detail: 'Cabinet PU Foam line.1 (Shift-A)',
    stationGroup: 'Cabinet PU Foam',
    shift: 'Shift-A',
    type: 'DL',
    stdMp: 28,
    uph: 100,
    ct: 29,
    upph: 4,
    outputPerShift: 38,
  },
  {
    id: 'dl-4-2a',
    productionLine: 'Line-A',
    stationNo: 4,
    detail: 'Cabinet PU Foam line.2 (Shift-A)',
    stationGroup: 'Cabinet PU Foam',
    shift: 'Shift-A',
    type: 'DL',
    stdMp: 16,
    uph: 100,
    ct: 31,
    upph: 6,
    outputPerShift: 66,
  },
  {
    id: 'dl-4-1b',
    productionLine: 'Line-A',
    stationNo: 4,
    detail: 'Cabinet PU Foam line.1 (Shift-B)',
    stationGroup: 'Cabinet PU Foam',
    shift: 'Shift-B',
    type: 'DL',
    stdMp: 28,
    uph: 100,
    ct: 31,
    upph: 4,
    outputPerShift: 38,
  },
  {
    id: 'dl-4-2b',
    productionLine: 'Line-A',
    stationNo: 4,
    detail: 'Cabinet PU Foam line.2 (Shift-B)',
    stationGroup: 'Cabinet PU Foam',
    shift: 'Shift-B',
    type: 'DL',
    stdMp: 16,
    uph: 100,
    ct: 29,
    upph: 6,
    outputPerShift: 66,
  },

  // 5. System ass'y
  {
    id: 'dl-5-a',
    productionLine: 'Line-A',
    stationNo: 5,
    detail: "System ass'y (Shift-A)",
    stationGroup: "System ass'y",
    shift: 'Shift-A',
    type: 'DL',
    stdMp: 34,
    uph: 200,
    ct: 15,
    upph: 6,
    outputPerShift: 62,
  },
  {
    id: 'dl-5-b',
    productionLine: 'Line-A',
    stationNo: 5,
    detail: "System ass'y (Shift-B)",
    stationGroup: "System ass'y",
    shift: 'Shift-B',
    type: 'DL',
    stdMp: 34,
    uph: 200,
    ct: 15,
    upph: 6,
    outputPerShift: 62,
  },

  // 6. Vacuum & Assembly Door Maching
  {
    id: 'dl-6-a',
    productionLine: 'Line-A',
    stationNo: 6,
    detail: 'Vacuum & Assembly Door Maching (Shift-A)',
    stationGroup: 'Vacuum & Assembly Door',
    shift: 'Shift-A',
    type: 'DL',
    stdMp: 52,
    uph: 200,
    ct: 15,
    upph: 4,
    outputPerShift: 40,
  },
  {
    id: 'dl-6-b',
    productionLine: 'Line-A',
    stationNo: 6,
    detail: 'Vacuum & Assembly Door Maching (Shift-B)',
    stationGroup: 'Vacuum & Assembly Door',
    shift: 'Shift-B',
    type: 'DL',
    stdMp: 52,
    uph: 200,
    ct: 15,
    upph: 4,
    outputPerShift: 40,
  },

  // 7. Cooling Test
  {
    id: 'dl-7-a',
    productionLine: 'Line-A',
    stationNo: 7,
    detail: 'Cooling Test (Shift-A)',
    stationGroup: 'Cooling Test',
    shift: 'Shift-A',
    type: 'DL',
    stdMp: 10,
    uph: 200,
    ct: 15,
    upph: 20,
    outputPerShift: 210,
  },
  {
    id: 'dl-7-b',
    productionLine: 'Line-A',
    stationNo: 7,
    detail: 'Cooling Test (Shift-B)',
    stationGroup: 'Cooling Test',
    shift: 'Shift-B',
    type: 'DL',
    stdMp: 10,
    uph: 200,
    ct: 15,
    upph: 20,
    outputPerShift: 210,
  },

  // 8. Fina&Packing I
  {
    id: 'dl-8-a',
    productionLine: 'Line-A',
    stationNo: 8,
    detail: 'Fina&Packing I (Shift-A)',
    stationGroup: 'Fina&Packing I',
    shift: 'Shift-A',
    type: 'DL',
    stdMp: 39,
    uph: 200,
    ct: 15,
    upph: 5,
    outputPerShift: 54,
  },
  {
    id: 'dl-8-b',
    productionLine: 'Line-A',
    stationNo: 8,
    detail: 'Fina&Packing I (Shift-B)',
    stationGroup: 'Fina&Packing I',
    shift: 'Shift-B',
    type: 'DL',
    stdMp: 39,
    uph: 200,
    ct: 15,
    upph: 5,
    outputPerShift: 54,
  },

  // IDL Rows (Line A)
  {
    id: 'idl-leader-a',
    productionLine: 'Line-A',
    stationNo: null,
    detail: 'Leader',
    stationGroup: 'Indirect Labor (IDL)',
    shift: 'Common',
    type: 'IDL',
    stdMp: 8,
    uph: null,
    ct: null,
    upph: null,
    outputPerShift: null,
  },
  {
    id: 'idl-supleader-a',
    productionLine: 'Line-A',
    stationNo: null,
    detail: 'Sup Leader',
    stationGroup: 'Indirect Labor (IDL)',
    shift: 'Common',
    type: 'IDL',
    stdMp: 27,
    uph: null,
    ct: null,
    upph: null,
    outputPerShift: null,
  },
  {
    id: 'idl-qi-a',
    productionLine: 'Line-A',
    stationNo: null,
    detail: 'QI + Supervisor QI',
    stationGroup: 'Indirect Labor (IDL)',
    shift: 'Common',
    type: 'IDL',
    stdMp: 2,
    uph: null,
    ct: null,
    upph: null,
    outputPerShift: null,
  },
  {
    id: 'idl-sup-pd-a',
    productionLine: 'Line-A',
    stationNo: null,
    detail: 'Supervisor PD',
    stationGroup: 'Indirect Labor (IDL)',
    shift: 'Common',
    type: 'IDL',
    stdMp: 1,
    uph: null,
    ct: null,
    upph: null,
    outputPerShift: null,
  },
  {
    id: 'idl-mgr-pd-a',
    productionLine: 'Line-A',
    stationNo: null,
    detail: 'Manager PD',
    stationGroup: 'Indirect Labor (IDL)',
    shift: 'Common',
    type: 'IDL',
    stdMp: 2,
    uph: null,
    ct: null,
    upph: null,
    outputPerShift: null,
  },

  // Spare Rows (Line A)
  {
    id: 'spare-a-shift-a',
    productionLine: 'Line-A',
    stationNo: null,
    detail: 'Spare - A ( Shift A)',
    stationGroup: 'Spare Manpower',
    shift: 'Shift-A',
    type: 'DL',
    isSpare: true,
    stdMp: 0,
    uph: null,
    ct: null,
    upph: null,
    outputPerShift: null,
  },
  {
    id: 'spare-a-shift-b',
    productionLine: 'Line-A',
    stationNo: null,
    detail: 'Spare - A ( Shift B)',
    stationGroup: 'Spare Manpower',
    shift: 'Shift-B',
    type: 'DL',
    isSpare: true,
    stdMp: 0,
    uph: null,
    ct: null,
    upph: null,
    outputPerShift: null,
  },
];

/**
 * Generates a full set of B-Line (RF Production Line B) processes cloned from Line A
 * or standard industrial presets.
 */
export function createStandardBLineRows(
  sourceRows: ProductionRow[] = LINE_A_INITIAL_DATA,
  workingHoursPerShift: number = 10.5
): ProductionRow[] {
  const lineARows = sourceRows.filter((r) => (r.productionLine || 'Line-A') === 'Line-A');
  const baseToClone = lineARows.length > 0 ? lineARows : LINE_A_INITIAL_DATA;

  return baseToClone.map((r, idx) => {
    const newDetail = r.isSpare
      ? r.detail.replace(/Spare\s*-\s*A/i, 'Spare - B')
      : r.detail;

    const cloned: ProductionRow = {
      ...r,
      id: `bline-init-${idx}`,
      productionLine: 'Line-B',
      detail: newDetail,
    };
    return recalculateRowMetrics(cloned, workingHoursPerShift);
  });
}

/**
 * Combined initial dataset containing BOTH RF Production Line A AND RF Production Line B (B-Line)
 * pre-populated out of the box so Summary All Line is immediately rich and complete.
 */
export const INITIAL_PRODUCTION_DATA: ProductionRow[] = [
  ...LINE_A_INITIAL_DATA,
  ...createStandardBLineRows(LINE_A_INITIAL_DATA, 10.5),
];

export function normalizeRowsWithLine(rows: ProductionRow[]): ProductionRow[] {
  return rows.map((r) => ({
    ...r,
    productionLine: r.productionLine || 'Line-A',
  }));
}

export function recalculateRowMetrics(
  row: ProductionRow,
  workingHoursPerShift: number = 10.5
): ProductionRow {
  if (row.type === 'IDL' || row.isSpare || !row.uph || row.stdMp <= 0) {
    return {
      ...row,
      upph: row.type === 'IDL' || row.isSpare ? null : 0,
      outputPerShift: row.type === 'IDL' || row.isSpare ? null : 0,
    };
  }
  const exactUpph = row.uph / row.stdMp;
  const roundedUpph = Math.round(exactUpph);
  const roundedOutputPerShift = Math.round(exactUpph * workingHoursPerShift);

  return {
    ...row,
    upph: roundedUpph,
    outputPerShift: roundedOutputPerShift,
  };
}
