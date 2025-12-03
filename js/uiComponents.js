import { DataType, SemanticRole, isValidDataType, isValidSemanticRole } from './types.js';

export function renderSchemaEditor(sheetAnalyses, container, onUpdate) {
  container.innerHTML = '';

  if (sheetAnalyses.length === 0) {
    container.innerHTML = '<div class="text-center text-slate-500 py-10">No schema detected yet.</div>';
    return;
  }

  sheetAnalyses.forEach((sheet, sheetIdx) => {
    const sheetSection = document.createElement('div');
    sheetSection.className = 'bg-slate-900 border border-slate-800 rounded-lg overflow-hidden mb-8';

    // Sheet Header
    const header = document.createElement('div');
    header.className = 'bg-slate-800/50 p-4 border-b border-slate-800 flex items-center justify-between';
    header.innerHTML = `
      <div class="flex items-center gap-3">
        <i data-lucide="sheet" class="w-5 h-5 text-green-400"></i>
        <h3 class="text-lg font-bold text-white">${sheet.sheetName}</h3>
        <span class="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">${sheet.tables.length} Table(s)</span>
      </div>
    `;
    sheetSection.appendChild(header);

    // Tables
    sheet.tables.forEach((table, tableIdx) => {
      const tableDiv = document.createElement('div');
      tableDiv.className = 'p-6 border-b border-slate-800 last:border-0';

      // Table Info
      tableDiv.innerHTML = `
        <div class="mb-6">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="table" class="w-4 h-4 text-blue-400"></i>
            <h4 class="font-medium text-white">${table.name}</h4>
            <span class="text-xs text-slate-500">Confidence: ${(table.confidence * 100).toFixed(0)}%</span>
          </div>
          <p class="text-sm text-slate-400">${table.description}</p>
        </div>
      `;

      // Columns Grid
      const columnsGrid = document.createElement('div');
      columnsGrid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

      table.columns.forEach(col => {
        const colCard = document.createElement('div');
        colCard.className = 'bg-slate-950 border border-slate-800 rounded-lg p-4 hover:border-blue-500/50 transition-colors';

        // Semantic Role Badge Color
        let roleColor = 'bg-slate-800 text-slate-400';
        switch(col.semanticRole) {
          case SemanticRole.METRIC: roleColor = 'bg-purple-900/30 text-purple-300 border border-purple-800/50'; break;
          case SemanticRole.DIMENSION: roleColor = 'bg-blue-900/30 text-blue-300 border border-blue-800/50'; break;
          case SemanticRole.TIMESTAMP: roleColor = 'bg-orange-900/30 text-orange-300 border border-orange-800/50'; break;
          case SemanticRole.HIERARCHY: roleColor = 'bg-green-900/30 text-green-300 border border-green-800/50'; break;
          case SemanticRole.ENTITY: roleColor = 'bg-indigo-900/30 text-indigo-300 border border-indigo-800/50'; break;
        }

        colCard.innerHTML = `
          <div class="flex items-start justify-between mb-3">
            <div class="flex-1">
              <label class="block text-xs text-slate-500 mb-1">Column Name</label>
              <input type="text" value="${col.suggestedName}"
                class="w-full bg-transparent border-b border-slate-800 focus:border-blue-500 outline-none text-sm text-white py-1 transition-colors"
                data-field="suggestedName"
              />
            </div>
            <div class="ml-2">
              <span class="text-[10px] px-2 py-1 rounded-full ${roleColor}">${col.semanticRole}</span>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <label class="block text-xs text-slate-500 mb-1">Data Type</label>
              <select class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-blue-500 outline-none"
                data-field="dataType">
                ${Object.values(DataType).map(t => `<option value="${t}" ${t === col.dataType ? 'selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs text-slate-500 mb-1">Semantic Role</label>
              <select class="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:border-blue-500 outline-none"
                data-field="semanticRole">
                ${Object.values(SemanticRole).map(r => `<option value="${r}" ${r === col.semanticRole ? 'selected' : ''}>${r}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t border-slate-800/50 flex items-center justify-between">
            <span class="text-xs text-slate-500 truncate max-w-[150px]" title="${col.originalName}">Ref: ${col.originalName}</span>
            <span class="text-xs text-slate-600">${(col.confidence * 100).toFixed(0)}% conf.</span>
          </div>
        `;

        // Event Listeners
        const inputs = colCard.querySelectorAll('input, select');
        inputs.forEach(input => {
          input.addEventListener('change', (e) => {
            const field = e.target.dataset.field;
            const value = e.target.value;
            onUpdate(sheetIdx, tableIdx, col.id, { [field]: value });

            // Visual feedback
            if (field === 'semanticRole') {
              // Re-render would be ideal, but for now let's just update the badge class roughly or rely on re-render trigger if parent handles it
              // Since this is a simple implementation, we might leave it or update the badge manually
            }

            colCard.classList.add('border-green-500/50');
            setTimeout(() => colCard.classList.remove('border-green-500/50'), 500);
          });
        });

        columnsGrid.appendChild(colCard);
      });

      tableDiv.appendChild(columnsGrid);
      sheetSection.appendChild(tableDiv);
    });

    container.appendChild(sheetSection);
  });

  if (window.lucide) window.lucide.createIcons();
}
