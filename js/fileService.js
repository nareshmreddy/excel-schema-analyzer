import { DataType, SemanticRole } from './types.js';

/**
 * Fills merged cells with their top-left value
 */
function unmergeAndFillCells(sheet) {
  if (!sheet['!merges']) return 0;
  const merges = sheet['!merges'];
  let count = 0;
  
  merges.forEach((merge) => {
    const startCellRef = XLSX.utils.encode_cell(merge.s);
    const startCell = sheet[startCellRef];
    const val = startCell ? startCell.v : null;

    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        const cellRef = XLSX.utils.encode_cell({ r, c });
        if (!sheet[cellRef]) {
          sheet[cellRef] = { t: 's', v: val };
        } else {
          sheet[cellRef].v = val;
        }
      }
    }
    count++;
  });

  delete sheet['!merges'];
  return count;
}

/**
 * Parses Excel file and returns normalized sheet data
 */
export async function parseFile(file, onLog) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        onLog("Reading binary data stream...", 'info');
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetsData = {};
        const sheetsVisibility = (workbook.Workbook && workbook.Workbook.Sheets) || [];

        workbook.SheetNames.forEach((sheetName, idx) => {
          const sheetMeta = sheetsVisibility[idx];
          if (sheetMeta && sheetMeta.Hidden !== 0) {
            onLog(`Skipping hidden sheet: "${sheetName}"`, 'warning');
            return;
          }

          const sheet = workbook.Sheets[sheetName];
          const mergedCount = unmergeAndFillCells(sheet);
          if (mergedCount > 0) {
            onLog(`[Stage 1] Normalized ${mergedCount} merged regions in "${sheetName}"`, 'success');
          }

          const hiddenColIndices = new Set();
          if (sheet['!cols']) {
            sheet['!cols'].forEach((col, colIdx) => {
              if (col && col.hidden) hiddenColIndices.add(colIdx);
            });
          }

          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
          let finalData = jsonData;
          
          if (hiddenColIndices.size > 0) {
            onLog(`[Stage 1] Dropped ${hiddenColIndices.size} hidden columns in "${sheetName}"`, 'info');
            finalData = jsonData.map(row => 
              row.filter((_, colIdx) => !hiddenColIndices.has(colIdx))
            );
          }

          while (finalData.length > 0 && finalData[finalData.length - 1].every(c => c === null || c === "")) {
            finalData.pop();
          }

          sheetsData[sheetName] = finalData;
        });

        resolve(sheetsData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Samples sheet data
 */
export function sampleSheetData(grid, rowLimit = 50, colLimit = 40) {
  return grid.slice(0, rowLimit).map(row => row.slice(0, colLimit));
}
