import * as XLSX from 'xlsx';
import { ProductionRow, ProductionLineId } from '../types/manpower';
import { recalculateRowMetrics } from '../data/initialManpowerData';

function extractShiftFromDetail(detail: string): 'Shift-A' | 'Shift-B' | 'Common' {
  const upper = detail.toUpperCase();
  if (upper.includes('SHIFT-A') || upper.includes('SHIFT A')) return 'Shift-A';
  if (upper.includes('SHIFT-B') || upper.includes('SHIFT B')) return 'Shift-B';
  return 'Common';
}

function extractStationGroup(detail: string, type: 'DL' | 'IDL', isSpare: boolean): string {
  if (isSpare) return 'Spare Manpower';
  if (type === 'IDL') return 'Indirect Labor (IDL)';
  return detail
    .replace(/\(\s*Shift[- ]?[AB]\s*\)/gi, '')
    .replace(/line\s*\.\s*\d+/gi, '')
    .replace(/\[B-Line\]/gi, '')
    .replace(/\(B-Line\)/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function toNumberOrNull(val: unknown): number | null {
  if (val === undefined || val === null || val === '') return null;
  const num = Number(String(val).replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : null;
}

/**
 * Parses an uploaded Excel (.xlsx, .xls, .csv) file matching either the raw screenshot layout
 * or our exported multi-sheet template back into ProductionRow[].
 */
export async function parseManpowerExcel(
  file: File,
  workingHoursPerShift: number = 10.5
): Promise<{ rows: ProductionRow[]; warnings: string[] }> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });

  const parsedRows: ProductionRow[] = [];
  const warnings: string[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    // Skip the aggregated Summary All Line sheet during import if individual Line sheets exist
    if (
      workbook.SheetNames.length > 1 &&
      sheetName.toUpperCase().includes('SUMMARY ALL')
    ) {
      return;
    }

    const worksheet = workbook.Sheets[sheetName];
    const rawGrid = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: '',
    });

    let currentLine: ProductionLineId =
      sheetName.toUpperCase().includes('LINE B') || sheetName.toUpperCase().includes('B-LINE')
        ? 'Line-B'
        : 'Line-A';

    let currentStationNo: number | null = null;
    let headerRowIndex = -1;
    let hasExplicitLineColumn = false;

    for (let i = 0; i < Math.min(rawGrid.length, 15); i++) {
      const rowStr = (rawGrid[i] || []).map((c) => String(c).toUpperCase()).join(' | ');
      if (rowStr.includes('DETAIL') || rowStr.includes('STD MP') || rowStr.includes('UPH')) {
        headerRowIndex = i;
        if (String(rawGrid[i][0] ?? '').toUpperCase().includes('LINE')) {
          hasExplicitLineColumn = true;
        }
        break;
      }
    }

    const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 1;

    for (let r = startRow; r < rawGrid.length; r++) {
      const row = rawGrid[r];
      if (!row || row.length === 0) continue;

      const offset = hasExplicitLineColumn ? 1 : 0;
      const explicitLineVal = hasExplicitLineColumn ? String(row[0] ?? '').toUpperCase() : '';
      if (explicitLineVal.includes('B')) {
        currentLine = 'Line-B';
      } else if (explicitLineVal.includes('A')) {
        currentLine = 'Line-A';
      }

      const rawNo = toNumberOrNull(row[0 + offset]);
      const rawDetail = String(row[1 + offset] ?? '').trim();
      const rawType = String(row[2 + offset] ?? '').trim().toUpperCase();
      const rawStdMp = toNumberOrNull(row[3 + offset]);
      const rawUph = toNumberOrNull(row[4 + offset]);
      const rawCt = toNumberOrNull(row[5 + offset]);
      const rawUpph = toNumberOrNull(row[6 + offset]);
      const rawOutput = toNumberOrNull(row[7 + offset]);

      const combinedText = `${String(row[0] ?? '')} ${rawDetail}`.toUpperCase();

      if (
        combinedText.includes('TOTAL RF PRODUCTION LINE B') ||
        combinedText.includes('SECTION: LINE B')
      ) {
        currentLine = 'Line-B';
        continue;
      }
      if (
        combinedText.includes('TOTAL RF PRODUCTION') ||
        combinedText.includes('SUM TOTAL') ||
        combinedText.includes('GRAND TOTAL') ||
        (rawDetail === '' && rawType === '' && rawStdMp !== null && rawStdMp > 300)
      ) {
        continue;
      }

      if (!rawDetail) continue;

      if (
        rawDetail.toUpperCase().includes('B-LINE') ||
        rawDetail.toUpperCase().includes('LINE B') ||
        rawDetail.toUpperCase().includes('SPARE - B')
      ) {
        currentLine = 'Line-B';
      }

      if (rawNo !== null && rawNo > 0) {
        currentStationNo = rawNo;
      }

      const isSpare = rawDetail.toUpperCase().includes('SPARE');
      let laborType: 'DL' | 'IDL' = 'DL';

      if (rawType === 'IDL') {
        laborType = 'IDL';
      } else if (rawType === 'DL') {
        laborType = 'DL';
      } else {
        const upperDetail = rawDetail.toUpperCase();
        if (
          upperDetail.includes('LEADER') ||
          upperDetail.includes('SUPERVISOR') ||
          upperDetail.includes('MANAGER') ||
          upperDetail.includes('QI')
        ) {
          laborType = 'IDL';
        } else {
          laborType = 'DL';
        }
      }

      const shift = extractShiftFromDetail(rawDetail);
      const stationNo = laborType === 'IDL' || isSpare ? null : currentStationNo;
      const stdMp = rawStdMp ?? 0;

      const baseRow: ProductionRow = {
        id: `row-${sheetName}-${r}-${Date.now()}`,
        productionLine: currentLine,
        stationNo,
        detail: rawDetail,
        stationGroup: extractStationGroup(rawDetail, laborType, isSpare),
        shift,
        type: laborType,
        isSpare,
        stdMp,
        uph: laborType === 'DL' && !isSpare ? (rawUph ?? 100) : null,
        ct: laborType === 'DL' && !isSpare ? (rawCt ?? 30) : null,
        upph: rawUpph,
        outputPerShift: rawOutput,
      };

      if (
        baseRow.type === 'DL' &&
        !baseRow.isSpare &&
        (baseRow.upph === null || baseRow.outputPerShift === null)
      ) {
        parsedRows.push(recalculateRowMetrics(baseRow, workingHoursPerShift));
      } else {
        parsedRows.push(baseRow);
      }
    }
  });

  if (parsedRows.length === 0) {
    warnings.push('ไม่พบแถวข้อมูลที่ตรงรูปแบบในไฟล์ Excel กรุณาตรวจสอบคอลัมน์ Detail และ STD MP / Shift');
  }

  return { rows: parsedRows, warnings };
}

function buildSummaryAllLinesSheetData(
  rows: ProductionRow[],
  workingHoursPerShift: number
): (string | number | null)[][] {
  const dlRows = rows.filter((r) => r.type === 'DL' && !r.isSpare && r.stationNo !== null);
  const stationNos = Array.from(new Set(dlRows.map((r) => r.stationNo!))).sort((a, b) => a - b);

  const sheet: (string | number | null)[][] = [
    [
      'No.',
      'Process / Station Group',
      'Line A (Shift-A)',
      'Line A (Shift-B)',
      'Line A Total MP',
      'Line A Output',
      'B-Line (Shift-A)',
      'B-Line (Shift-B)',
      'B-Line Total MP',
      'B-Line Output',
      'All Lines Shift-A',
      'All Lines Shift-B',
      'All Lines Total MP',
      'All Lines Sum UPPH',
      'All Lines Total Output',
    ],
  ];

  let sumA_ShiftA = 0;
  let sumA_ShiftB = 0;
  let sumA_Total = 0;
  let sumA_Output = 0;

  let sumB_ShiftA = 0;
  let sumB_ShiftB = 0;
  let sumB_Total = 0;
  let sumB_Output = 0;

  let sumAll_UPPH = 0;

  stationNos.forEach((no) => {
    const stRows = dlRows.filter((r) => r.stationNo === no);
    const groupName = stRows[0]?.stationGroup || `Station ${no}`;

    const aRows = stRows.filter((r) => (r.productionLine || 'Line-A') === 'Line-A');
    const bRows = stRows.filter((r) => r.productionLine === 'Line-B');

    const aSA = aRows.filter((r) => r.shift === 'Shift-A').reduce((s, r) => s + r.stdMp, 0);
    const aSB = aRows.filter((r) => r.shift === 'Shift-B').reduce((s, r) => s + r.stdMp, 0);
    const aTot = aSA + aSB;
    const aOut = aRows.reduce((s, r) => s + (r.outputPerShift ?? 0), 0);

    const bSA = bRows.filter((r) => r.shift === 'Shift-A').reduce((s, r) => s + r.stdMp, 0);
    const bSB = bRows.filter((r) => r.shift === 'Shift-B').reduce((s, r) => s + r.stdMp, 0);
    const bTot = bSA + bSB;
    const bOut = bRows.reduce((s, r) => s + (r.outputPerShift ?? 0), 0);

    const stUpph = stRows.reduce((s, r) => s + (r.upph ?? 0), 0);

    sumA_ShiftA += aSA;
    sumA_ShiftB += aSB;
    sumA_Total += aTot;
    sumA_Output += aOut;

    sumB_ShiftA += bSA;
    sumB_ShiftB += bSB;
    sumB_Total += bTot;
    sumB_Output += bOut;

    sumAll_UPPH += stUpph;

    sheet.push([
      no,
      groupName,
      aSA,
      aSB,
      aTot,
      aOut,
      bSA,
      bSB,
      bTot,
      bOut,
      aSA + bSA,
      aSB + bSB,
      aTot + bTot,
      stUpph,
      aOut + bOut,
    ]);
  });

  // Total DL Row
  sheet.push([
    '',
    'Total Direct Labor (DL)',
    sumA_ShiftA,
    sumA_ShiftB,
    sumA_Total,
    sumA_Output,
    sumB_ShiftA,
    sumB_ShiftB,
    sumB_Total,
    sumB_Output,
    sumA_ShiftA + sumB_ShiftA,
    sumA_ShiftB + sumB_ShiftB,
    sumA_Total + sumB_Total,
    sumAll_UPPH,
    sumA_Output + sumB_Output,
  ]);

  // IDL Rows
  const idlRows = rows.filter((r) => r.type === 'IDL');
  const roles = Array.from(new Set(idlRows.map((r) => r.detail)));
  let sumIdlA = 0;
  let sumIdlB = 0;

  roles.forEach((role) => {
    const rRows = idlRows.filter((r) => r.detail === role);
    const idlA = rRows
      .filter((r) => (r.productionLine || 'Line-A') === 'Line-A')
      .reduce((s, r) => s + r.stdMp, 0);
    const idlB = rRows
      .filter((r) => r.productionLine === 'Line-B')
      .reduce((s, r) => s + r.stdMp, 0);
    sumIdlA += idlA;
    sumIdlB += idlB;

    sheet.push([
      'IDL',
      role,
      '',
      '',
      idlA,
      '',
      '',
      '',
      idlB,
      '',
      '',
      '',
      idlA + idlB,
      '',
      '',
    ]);
  });

  sheet.push([
    '',
    'SUM Total IDL',
    '',
    '',
    sumIdlA,
    '',
    '',
    '',
    sumIdlB,
    '',
    '',
    '',
    sumIdlA + sumIdlB,
    '',
    '',
  ]);

  // Spare Rows
  const spareRows = rows.filter((r) => r.isSpare);
  const spA = spareRows
    .filter((r) => (r.productionLine || 'Line-A') === 'Line-A')
    .reduce((s, r) => s + r.stdMp, 0);
  const spB = spareRows
    .filter((r) => r.productionLine === 'Line-B')
    .reduce((s, r) => s + r.stdMp, 0);

  sheet.push([
    'Spare',
    'Spare Manpower (Shift A + B)',
    '',
    '',
    spA,
    '',
    '',
    '',
    spB,
    '',
    '',
    '',
    spA + spB,
    '',
    '',
  ]);

  const grandA = sumA_Total + sumIdlA + spA;
  const grandB = sumB_Total + sumIdlB + spB;
  const grandAll = grandA + grandB;
  const totalPlantUph = ((grandA > 0 ? 1 : 0) + (grandB > 0 ? 1 : 0)) * 400;
  const netUpphAll = grandAll > 0 ? Number((totalPlantUph / grandAll).toFixed(2)) : 0;
  const netOutputAll =
    grandAll > 0 ? Number(((totalPlantUph * workingHoursPerShift) / grandAll).toFixed(2)) : 0;

  sheet.push([
    '',
    'GRAND TOTAL ALL LINES (DL + IDL + Spare)',
    '',
    '',
    grandA,
    '',
    '',
    '',
    grandB,
    '',
    '',
    '',
    grandAll,
    netUpphAll,
    netOutputAll,
  ]);

  return sheet;
}

function buildLineSheetData(
  lineRows: ProductionRow[],
  lineLabel: string,
  workingHoursPerShift: number
): (string | number | null)[][] {
  const dlRows = lineRows.filter((r) => r.type === 'DL' && !r.isSpare);
  const idlRows = lineRows.filter((r) => r.type === 'IDL');
  const spareRows = lineRows.filter((r) => r.isSpare);

  const totalDlMp = dlRows.reduce((sum, r) => sum + r.stdMp, 0);
  const totalDlUpph = dlRows.reduce((sum, r) => sum + (r.upph ?? 0), 0);
  const totalDlOutput = dlRows.reduce((sum, r) => sum + (r.outputPerShift ?? 0), 0);
  const totalIdlMp = idlRows.reduce((sum, r) => sum + r.stdMp, 0);
  const totalSpareMp = spareRows.reduce((sum, r) => sum + r.stdMp, 0);
  const grandTotalMp = totalDlMp + totalIdlMp + totalSpareMp;

  const lineUph = 200;
  const overallUpph = grandTotalMp > 0 ? Number(((lineUph * 2) / grandTotalMp).toFixed(2)) : 0;
  const overallOutputPerCapita =
    grandTotalMp > 0 ? Number(((lineUph * 2 * workingHoursPerShift) / grandTotalMp).toFixed(2)) : 0;

  const sheetData: (string | number | null)[][] = [
    ['No.', 'Detail', 'Type', 'STD MP / Shift', 'UPH', 'CT', 'UPPH', 'Output/shift'],
  ];

  dlRows.forEach((r) => {
    sheetData.push([
      r.stationNo,
      r.detail,
      r.type,
      r.stdMp,
      r.uph,
      r.ct,
      r.upph,
      r.outputPerShift,
    ]);
  });

  sheetData.push([
    '',
    `Total ${lineLabel}`,
    '',
    totalDlMp,
    200,
    15,
    totalDlUpph,
    totalDlOutput,
  ]);

  idlRows.forEach((r) => {
    sheetData.push(['', r.detail, r.type, r.stdMp, '', '', '', '']);
  });

  if (idlRows.length > 0) {
    sheetData.push(['', 'SUM Total', '', totalIdlMp, '', '', '', '']);
  }

  spareRows.forEach((r) => {
    sheetData.push(['', r.detail, r.type, r.stdMp || '', '', '', '', '']);
  });

  sheetData.push([
    '',
    `Grand Total ${lineLabel} (DL + IDL + Spare)`,
    '',
    grandTotalMp,
    '',
    '',
    overallUpph,
    overallOutputPerCapita,
  ]);

  return sheetData;
}

/**
 * Exports 3 Sheets into Excel:
 * 1. "Summary All Line"
 * 2. "RF Line A"
 * 3. "RF Line B (B-Line)"
 */
export function exportManpowerToExcel(
  rows: ProductionRow[],
  workingHoursPerShift: number = 10.5,
  filename: string = 'RF_Production_Summary_All_Lines.xlsx'
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary All Line
  const wsSummary = XLSX.utils.aoa_to_sheet(
    buildSummaryAllLinesSheetData(rows, workingHoursPerShift)
  );
  wsSummary['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 15 },
    { wch: 14 },
    { wch: 15 },
    { wch: 15 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary All Line');

  // Sheet 2: RF Line A
  const lineARows = rows.filter((r) => (r.productionLine || 'Line-A') === 'Line-A');
  const wsA = XLSX.utils.aoa_to_sheet(
    buildLineSheetData(lineARows, 'RF Production Line A', workingHoursPerShift)
  );
  wsA['!cols'] = [
    { wch: 6 },
    { wch: 38 },
    { wch: 8 },
    { wch: 15 },
    { wch: 10 },
    { wch: 8 },
    { wch: 10 },
    { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, wsA, 'RF Line A');

  // Sheet 3: RF Line B (B-Line)
  const lineBRows = rows.filter((r) => r.productionLine === 'Line-B');
  if (lineBRows.length > 0) {
    const wsB = XLSX.utils.aoa_to_sheet(
      buildLineSheetData(lineBRows, 'RF Production Line B', workingHoursPerShift)
    );
    wsB['!cols'] = [
      { wch: 6 },
      { wch: 38 },
      { wch: 8 },
      { wch: 15 },
      { wch: 10 },
      { wch: 8 },
      { wch: 10 },
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(wb, wsB, 'RF Line B (B-Line)');
  }

  XLSX.writeFile(wb, filename);
}
