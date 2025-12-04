import { DataType, SemanticRole } from './types.js';

function serializeGrid(grid) {
  return grid.map((row, idx) => {
    const rowStr = row.map(cell => {
      if (cell === null || cell === undefined) return "";
      const s = String(cell).replace(/\\s+/g, " ").trim();
      return s.length > 40 ? s.substring(0, 37) + "..." : s;
    }).join(" | ");
    return `Row ${idx}: | ${rowStr} |`;
  }).join("\\n");
}

export async function renderSheetToBase64(grid) {
  const CELL_WIDTH = 120, CELL_HEIGHT = 30, HEADER_SIZE = 30;
  if (!grid || grid.length === 0) return "";

  const rows = grid.length;
  const cols = Math.max(...grid.map(r => r.length));
  const width = HEADER_SIZE + (cols * CELL_WIDTH);
  const height = HEADER_SIZE + (rows * CELL_HEIGHT);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return "";

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  const drawText = (text, x, y, color = "#000", font = "11px sans-serif") => {
    ctx.fillStyle = color;
    ctx.font = font;
    ctx.fillText(text, x, y);
  };

  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(HEADER_SIZE, 0, width - HEADER_SIZE, HEADER_SIZE);
  ctx.strokeStyle = "#cbd5e1";
  ctx.beginPath();

  for (let c = 0; c < cols; c++) {
    const x = HEADER_SIZE + (c * CELL_WIDTH);
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    const letter = String.fromCharCode(65 + (c % 26));
    const label = c >= 26 ? `${String.fromCharCode(65 + Math.floor(c/26) - 1)}${letter}` : letter;
    drawText(label, x + 50, 20, "#64748b", "bold 12px sans-serif");
  }

  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, HEADER_SIZE, HEADER_SIZE, height - HEADER_SIZE);

  for (let r = 0; r < rows; r++) {
    const y = HEADER_SIZE + (r * CELL_HEIGHT);
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    drawText(String(r + 1), 5, y + 20, "#64748b", "bold 11px sans-serif");
  }
  ctx.stroke();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < grid[r].length; c++) {
      const cell = grid[r][c];
      if (cell !== null && cell !== undefined && cell !== "") {
        const x = HEADER_SIZE + (c * CELL_WIDTH) + 5;
        const y = HEADER_SIZE + (r * CELL_HEIGHT) + 20;
        let val = String(cell);
        if (val.length > 18) val = val.substring(0, 16) + "..";
        drawText(val, x, y, "#0f172a");
      }
    }
  }

  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(',')[1];
}

export async function analyzeSheetChunk(sheetName, rawRows, onLog, apiKey) {
  onLog(`[Stage 2] Preparing Analysis for "${sheetName}"...`, 'info');
  const textContext = serializeGrid(rawRows);
  const imageBase64 = await renderSheetToBase64(rawRows);

  onLog(`[Stage 2] Snapshot generated (${(imageBase64.length / 1024).toFixed(1)} KB).`, 'ai', {
    type: 'image',
    data: imageBase64,
    label: `Vision Snapshot: ${sheetName}`
  });

  onLog(`[Stage 3] ⚠️ DEMO MODE: Using mock schema detection`, 'warning');
  await new Promise(resolve => setTimeout(resolve, 2000));

  const results = generateMockSchema(sheetName, rawRows);
  onLog(`[Stage 4] Successfully parsed schema for "${sheetName}".`, 'success', {
    type: 'json',
    data: results,
    label: `Parsed Schema: ${sheetName}`
  });

  results.forEach(table => {
    onLog(`Detected Table: "${table.name}" (Confidence: ${(table.confidence * 100).toFixed(0)}%)`, 'ai');
    table.columns.forEach(col => {
      if (col.semanticRole === SemanticRole.HIERARCHY) {
        onLog(`  ↳ 🌳 Detected Hierarchy: "${col.suggestedName}"`, 'success');
      }
      if (col.semanticRole === SemanticRole.TIMESTAMP) {
        onLog(`  ↳ 📅 Detected Time Dimension: "${col.suggestedName}"`, 'success');
      }
    });
  });

  return results;
}

function generateMockSchema(sheetName, rawRows) {
  if (rawRows.length === 0) return [];
  const headerRow = rawRows[0];
  const dataRows = rawRows.slice(1);

  const columns = headerRow.map((header, idx) => {
    const colData = dataRows.map(row => row[idx]).filter(v => v !== null && v !== undefined && v !== '');
    let dataType = DataType.STRING;
    let semanticRole = SemanticRole.DIMENSION;

    if (colData.length > 0) {
      const sample = colData[0];
      if (typeof sample === 'number') {
        dataType = DataType.NUMBER;
        semanticRole = SemanticRole.METRIC;
      } else if (typeof sample === 'boolean') {
        dataType = DataType.BOOLEAN;
      } else if (sample instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(String(sample))) {
        dataType = DataType.DATE;
        semanticRole = SemanticRole.TIMESTAMP;
      }
    }

    if (/id|code|key/i.test(String(header))) semanticRole = SemanticRole.ENTITY;

    return {
      id: `${sheetName}-table-0-col-${idx}`,
      originalName: String(header || `Column${idx + 1}`),
      suggestedName: String(header || `Column${idx + 1}`).replace(/\\s+/g, '_'),
      dataType,
      semanticRole,
      confidence: 0.85,
      reasoning: `Inferred from ${colData.length} sample values`,
      sampleValues: []
    };
  });

  return [{
    id: `${sheetName}-table-0`,
    name: `${sheetName} Data Table`,
    startRow: 0,
    endRow: rawRows.length - 1,
    description: `Primary data table with ${columns.length} columns`,
    confidence: 0.9,
    columns
  }];
}
