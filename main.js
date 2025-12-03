import { AnalysisPhase } from './types.js';
import { parseFile, sampleSheetData } from './fileService.js';
import { analyzeSheetChunk } from './geminiService.js';
import { renderSchemaEditor } from './uiComponents.js';

const state = {
  phase: AnalysisPhase.UPLOAD,
  sheetAnalyses: [],
  apiKey: ''
};

const el = {
  consoleOutput: document.getElementById('console-output'),
  viewUpload: document.getElementById('view-upload'),
  viewProcessing: document.getElementById('view-processing'),
  viewReview: document.getElementById('view-review'),
  fileInput: document.getElementById('file-input'),
  schemaContainer: document.getElementById('schema-container'),
  btnConfirm: document.getElementById('btn-confirm'),
  stepUpload: document.getElementById('step-upload'),
  stepAnalyze: document.getElementById('step-analyze'),
  stepReview: document.getElementById('step-review'),
  apiKeyModal: document.getElementById('api-key-modal'),
  apiKeyInput: document.getElementById('api-key-input'),
  apiKeySubmit: document.getElementById('api-key-submit'),
  rememberKey: document.getElementById('remember-key'),
  changeApiKey: document.getElementById('change-api-key')
};

function addLog(message, type = 'info', attachment = null) {
  const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const div = document.createElement('div');
  div.className = "animate-in mb-3";
  
  let iconName = 'info', textColor = 'text-slate-300';
  switch(type) {
    case 'success': iconName = 'check-circle-2'; textColor = 'text-green-300'; break;
    case 'error': iconName = 'alert-triangle'; textColor = 'text-red-300'; break;
    case 'warning': iconName = 'alert-triangle'; textColor = 'text-yellow-400'; break;
    case 'ai': iconName = 'terminal'; textColor = 'text-purple-300'; break;
  }

  let attachmentHtml = '';
  if (attachment?.type === 'image') {
    const dataUrl = `data:image/png;base64,${attachment.data}`;
    attachmentHtml = `<div class="mt-2 p-2 bg-slate-900 rounded border border-slate-800 w-full max-w-md">
      <img src="${dataUrl}" class="rounded border border-slate-800 w-full h-auto bg-white" />
    </div>`;
  } else if (attachment?.type === 'json') {
    const jsonStr = JSON.stringify(attachment.data, null, 2);
    const id = `json-${Math.random().toString(36).substr(2, 9)}`;
    attachmentHtml = `<div class="mt-2">
      <button onclick="document.getElementById('${id}').classList.toggle('hidden')" class="text-xs text-blue-400">Toggle JSON</button>
      <div id="${id}" class="hidden bg-slate-900 p-3 rounded border border-slate-800 overflow-x-auto max-h-96 custom-scrollbar">
        <pre class="text-xs text-green-300 font-mono">${jsonStr}</pre>
      </div>
    </div>`;
  }

  div.innerHTML = `<div class="flex gap-3">
    <span class="text-slate-600 text-xs mt-0.5">${timestamp}</span>
    <i data-lucide="${iconName}" class="w-4 h-4 mt-0.5"></i>
    <div class="flex-1"><span class="${textColor}">${message}</span>${attachmentHtml}</div>
  </div>`;

  if (el.consoleOutput.children?.textContent.includes("Waiting")) {
    el.consoleOutput.innerHTML = '';
  }
  el.consoleOutput.appendChild(div);
  el.consoleOutput.scrollTop = el.consoleOutput.scrollHeight;
  if (window.lucide) window.lucide.createIcons();
}

function showApiKeyModal() {
  el.apiKeyModal.classList.remove('hidden');
  el.apiKeyInput.focus();
}

function hideApiKeyModal() {
  el.apiKeyModal.classList.add('hidden');
}

function saveApiKey() {
  const apiKey = el.apiKeyInput.value.trim();
  if (!apiKey) {
    alert('Please enter a valid API key');
    return false;
  }
  state.apiKey = apiKey;
  if (el.rememberKey.checked) {
    localStorage.setItem('gemini_api_key', apiKey);
  }
  hideApiKeyModal();
  addLog('API key configured', 'success');
  return true;
}

function setPhase(newPhase) {
  state.phase = newPhase;
  el.viewUpload.classList.add('hidden');
  el.viewProcessing.classList.add('hidden');
  el.viewReview.classList.add('hidden');

  [el.stepUpload, el.stepAnalyze, el.stepReview].forEach(step => {
    step.querySelector('div').className = 'w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center';
    step.className = 'flex items-center gap-2 text-slate-500 font-medium';
  });

  switch(newPhase) {
    case AnalysisPhase.UPLOAD:
      el.viewUpload.classList.remove('hidden');
      el.stepUpload.className = 'flex items-center gap-2 text-blue-400 font-medium';
      el.stepUpload.querySelector('div').className = 'w-8 h-8 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center';
      break;
    case AnalysisPhase.ANALYZING:
      el.viewProcessing.classList.remove('hidden');
      el.stepAnalyze.className = 'flex items-center gap-2 text-purple-400 font-medium';
      el.stepAnalyze.querySelector('div').className = 'w-8 h-8 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center';
      break;
    case AnalysisPhase.REVIEW:
      el.viewReview.classList.remove('hidden');
      el.stepReview.className = 'flex items-center gap-2 text-green-400 font-medium';
      el.stepReview.querySelector('div').className = 'w-8 h-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center';
      break;
  }
}

async function handleFileUpload(file) {
  try {
    if (!state.apiKey) {
      showApiKeyModal();
      state.pendingFile = file;
      return;
    }

    setPhase(AnalysisPhase.ANALYZING);
    addLog(`Processing file: ${file.name}`, 'info');

    const sheetsData = await parseFile(file, addLog);
    const sheetNames = Object.keys(sheetsData);
    addLog(`Detected ${sheetNames.length} visible sheet(s)`, 'success');

    state.sheetAnalyses = [];
    for (const sheetName of sheetNames) {
      const rawGrid = sheetsData[sheetName];
      const sampledGrid = sampleSheetData(rawGrid, 50, 40);
      const tables = await analyzeSheetChunk(sheetName, sampledGrid, addLog, state.apiKey);
      state.sheetAnalyses.push({ sheetName, tables, rawGrid: sampledGrid });
    }

    addLog('Analysis complete!', 'success');
    setPhase(AnalysisPhase.REVIEW);
    renderSchemaEditor(state.sheetAnalyses, el.schemaContainer, handleColumnUpdate);
  } catch (error) {
    addLog(`Error: ${error.message}`, 'error');
    setPhase(AnalysisPhase.UPLOAD);
  }
}

function handleColumnUpdate(sheetIdx, tableIdx, colId, updates) {
  const col = state.sheetAnalyses[sheetIdx].tables[tableIdx].columns.find(c => c.id === colId);
  if (col) Object.assign(col, updates);
}

function handleExport() {
  const exportData = {
    timestamp: new Date().toISOString(),
    sheets: state.sheetAnalyses.map(sheet => ({
      sheetName: sheet.sheetName,
      tables: sheet.tables.map(table => ({
        name: table.name,
        rowRange: [table.startRow, table.endRow],
        description: table.description,
        confidence: table.confidence,
        columns: table.columns
      }))
    }))
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `schema-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  addLog('Schema exported successfully', 'success');
}

el.fileInput.addEventListener('change', (e) => {
  if (e.target.files) handleFileUpload(e.target.files);
});

el.btnConfirm.addEventListener('click', handleExport);

el.apiKeySubmit.addEventListener('click', () => {
  if (saveApiKey() && state.pendingFile) {
    const file = state.pendingFile;
    state.pendingFile = null;
    handleFileUpload(file);
  }
});

el.changeApiKey.addEventListener('click', showApiKeyModal);

setPhase(AnalysisPhase.UPLOAD);
addLog('Application initialized. Upload an Excel file to begin.', 'info');

const savedKey = localStorage.getItem('gemini_api_key');
if (savedKey) {
  state.apiKey = savedKey;
  addLog('Loaded saved API key', 'info');
}
