/* markdown.js | v2.0 | 2026-05-24 */
function renderMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let html = '';
  let inTable = false;
  let tableRows = [];

  // Escape HTML and apply inline bold/italic — used for table cells, which are
  // processed separately from the main line loop.
  function inlineFmt(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
  }

  // Split a markdown table row into cells WITHOUT dropping empty ones.
  // We strip only the leading/trailing border pipes, then split on the rest,
  // so "| Management | 3/5 |  |" keeps its empty 3rd cell.
  function splitRow(row) {
    let s = row.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map(c => c.trim());
  }

  function flushTable() {
    if (!tableRows.length) return;
    const dataRows = tableRows.filter(r => !r.match(/^\s*\|?[-| :]+\|?\s*$/));
    if (dataRows.length < 2) { tableRows = []; return; }
    const headers = splitRow(dataRows[0]);
    const cols = headers.length;
    const ths = headers.map(s => '<th>' + inlineFmt(s) + '</th>').join('');
    let trs = '';
    for (let r = 1; r < dataRows.length; r++) {
      const cells = splitRow(dataRows[r]);
      // Pad short rows / trim long rows so every row matches the header width
      while (cells.length < cols) cells.push('');
      if (cells.length > cols) cells.length = cols;
      trs += '<tr>' + cells.map(s => '<td>' + inlineFmt(s) + '</td>').join('') + '</tr>';
    }
    html += '<table><thead><tr>' + ths + '</tr></thead><tbody>' + trs + '</tbody></table>';
    tableRows = [];
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    let line = raw
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

    if (raw.startsWith('|')) {
      if (!inTable) inTable = true;
      tableRows.push(raw);
      continue;
    }

    if (inTable) {
      inTable = false;
      flushTable();
    }

    // Séparateur horizontal
    if (raw.trim() === '---' || raw.trim() === '***') {
      html += '<hr style="border:none;border-top:1px solid var(--border);margin:1rem 0;">';
      continue;
    }

    if (raw.startsWith('## ')) {
      html += '<h2>' + line.slice(3) + '</h2>';
    } else if (raw.startsWith('### ')) {
      html += '<h3>' + line.slice(4) + '</h3>';
    } else if (raw.startsWith('# ')) {
      html += '<h2>' + line.slice(2) + '</h2>';
    } else if (raw.match(/^ÉTAPE \d/)) {
      html += '<h2>' + line + '</h2>';
    } else if (raw.match(/^[-•*] /)) {
      html += '<li>' + line.replace(/^[-•*] /, '') + '</li>';
    } else if (!raw.trim()) {
      html += '<br>';
    } else {
      html += '<p>' + line + '</p>';
    }
  }

  if (inTable) flushTable();

  // Badges colorés
  html = html
    .replace(/\bExcellent\b/g, '<span class="badge-buy">⭐ Excellent</span>')
    .replace(/\bBon\b/g, '<span class="badge-buy">👍 Good</span>')
    .replace(/\bMoyen\b/g, '<span class="badge-wait">⚠️ Average</span>')
    .replace(/\bMauvais\b/g, '<span class="badge-avoid">❌ Poor</span>')
    .replace(/Juste prix/g, '<span class="badge-wait">⚖️ Fair Value</span>')
    .replace(/Sous-évalué/g, '<span class="badge-buy">📈 Undervalued</span>')
    .replace(/Surévalué/g, '<span class="badge-avoid">📉 Overvalued</span>')
    .replace(/Attendre une meilleure entrée/g, '<span class="badge-wait">⏳ Wait</span>')
    .replace(/\bAttendre\b/g, '<span class="badge-wait">⏳ Wait</span>')
    .replace(/\bÉviter\b/g, '<span class="badge-avoid">✗ Avoid</span>')
    .replace(/\bAcheter\b/g, '<span class="badge-buy">✅ Buy</span>');

  return '<div class="ai-body">' + html + '</div>';
}


function extractVerdict(text) {
  // Créer ou récupérer le bandeau unique
  let banner = document.getElementById('verdictBanner');
  if (!banner) {
    const cardHeader = document.querySelector('.card-header');
    if (!cardHeader) return;
    banner = document.createElement('div');
    banner.id = 'verdictBanner';
    banner.style.cssText = 'border-top:0.5px solid var(--border);';
    banner.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;border-bottom:0.5px solid var(--border);">
        <div style="padding:14px 16px;text-align:center;border-right:0.5px solid var(--border);">
          <div class="vc-label">Valuation</div>
          <div id="vValuation" class="vc-value">—</div>
        </div>
        <div style="padding:14px 16px;text-align:center;">
          <div class="vc-label">Decision</div>
          <div id="vDecision" class="vc-value">—</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:0.5px solid var(--border);">
        <div style="padding:14px 16px;text-align:center;border-right:0.5px solid var(--border);">
          <div class="vc-label">Intrinsic Value</div>
          <div id="vIV" class="vc-value" style="font-size:15px;">—</div>
        </div>
        <div style="padding:14px 16px;text-align:center;border-right:0.5px solid var(--border);">
          <div class="vc-label">Entry Target (×0.70)</div>
          <div id="vETP" class="vc-value" style="font-size:15px;color:var(--green);">—</div>
        </div>
        <div style="padding:14px 16px;text-align:center;">
          <div class="vc-label">Margin of Safety</div>
          <div id="vMOS" class="vc-value" style="font-size:15px;">—</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(5,1fr);border-bottom:0.5px solid var(--border);">
        <div style="padding:10px 8px;text-align:center;border-right:0.5px solid var(--border);">
          <div class="vc-label">Business</div><div id="sBusiness" class="vc-value" style="font-size:11px;">—</div>
        </div>
        <div style="padding:10px 8px;text-align:center;border-right:0.5px solid var(--border);">
          <div class="vc-label">Moat</div><div id="sMoat" class="vc-value" style="font-size:11px;">—</div>
        </div>
        <div style="padding:10px 8px;text-align:center;border-right:0.5px solid var(--border);">
          <div class="vc-label">Financials</div><div id="sFinance" class="vc-value" style="font-size:11px;">—</div>
        </div>
        <div style="padding:10px 8px;text-align:center;border-right:0.5px solid var(--border);">
          <div class="vc-label">Management</div><div id="sManagement" class="vc-value" style="font-size:11px;">—</div>
        </div>
        <div style="padding:10px 8px;text-align:center;">
          <div class="vc-label">Valuation</div><div id="sValuation" class="vc-value" style="font-size:11px;">—</div>
        </div>
      </div>

    `;
    cardHeader.insertAdjacentElement('afterend', banner);
  }



  // Valuation
  const valEl = document.getElementById('vValuation');
  if (valEl) {
    if (/Undervalued/i.test(text) || /Sous-évalué/i.test(text)) {
      valEl.innerHTML = '<span class="badge-buy">📈 Undervalued</span>';
    } else if (/Fair Value/i.test(text) || /Juste prix/i.test(text)) {
      valEl.innerHTML = '<span class="badge-wait">⚖️ Fair Value</span>';
    } else if (/Overvalued/i.test(text) || /Surévalué/i.test(text)) {
      valEl.innerHTML = '<span class="badge-avoid">📉 Overvalued</span>';
    }
  }

  // Decision
  const decEl = document.getElementById('vDecision');
  if (decEl) {
    if (/\bPASS\b/.test(text) || /Éviter/i.test(text)) {
      decEl.innerHTML = '<span class="badge-avoid">✗ Pass</span>';
    } else if (/\bHOLD\b/.test(text) || /Attendre/i.test(text)) {
      decEl.innerHTML = '<span class="badge-wait">⏳ Hold</span>';
    } else if (/\bBUY\b/.test(text) || /Acheter/i.test(text)) {
      decEl.innerHTML = '<span class="badge-buy">✅ Buy</span>';
    }
  }

  // Currency-symbol class covering USD/EUR/GBP/JPY/KRW/INR plus textual CHF/CAD/etc.
  const CUR = '(?:[€$£¥₩₹]|CHF|CA\\$|S\\$|[A-Z]{3}\\s?)';
  const VAL = '(' + CUR + '?\\s*[\\d,.]+(?:\\s*[-–]\\s*' + CUR + '?\\s*[\\d,.]+)?)';

  // Intrinsic Value
  const ivMatch = text.match(new RegExp('Intrinsic Value.*?\\|.*?' + VAL, 'i'));
  if (ivMatch) { const el = document.getElementById('vIV'); if (el) el.textContent = ivMatch[1].trim(); }

  // Entry Target
  const etpMatch = text.match(new RegExp('Entry Target.*?\\|.*?' + VAL, 'i'));
  if (etpMatch) { const el = document.getElementById('vETP'); if (el) el.textContent = etpMatch[1].trim(); }

  // Margin of Safety
  const mosMatch = text.match(/Margin of Safety.*?\|.*?(-?[\d.]+%)/i);
  if (mosMatch) {
    const el = document.getElementById('vMOS');
    if (el) {
      const val = parseFloat(mosMatch[1]);
      el.textContent = mosMatch[1].trim();
      el.style.color = val >= 30 ? 'var(--green)' : val >= 0 ? 'var(--muted)' : 'var(--red)';
    }
  }

  const target = etpMatch ? etpMatch[1].trim() : '—';

  // Scorecard /5
  const scoreMap = [
    ['Business Quality', 'sBusiness'],
    ['Moat', 'sMoat'],
    ['Financials', 'sFinance'],
    ['Management', 'sManagement'],
    ['Valuation', 'sValuation'],
  ];
  for (const [key, id] of scoreMap) {
    // Tolerate bold markers (**Valuation**), extra spaces, and "4 / 5" spacing.
    const re = new RegExp('\\**\\s*' + key + '\\s*\\**\\s*\\|\\s*\\**\\s*(\\d(?:\\.\\d)?)\\s*\\/\\s*5', 'i');
    const m = text.match(re);
    if (m) {
      const el = document.getElementById(id);
      if (el) {
        const score = parseFloat(m[1]);
        const full = Math.round(score);
        const stars = '★'.repeat(full) + '☆'.repeat(5 - full);
        el.innerHTML = '<span style="color:#f5c842;font-size:13px;">' + stars + '</span><br><span style="font-size:11px;">' + m[1] + '/5</span>';
      }
    }
  }

  banner.style.display = 'block';

  return {
    quality: '—',
    valuation: document.getElementById('vValuation')?.textContent?.trim() || '—',
    decision: document.getElementById('vDecision')?.textContent?.trim() || '—',
    target: target,
  };
}

function updateScorecard(text) {
  if (document.getElementById('verdictBanner')) extractVerdict(text);
}
