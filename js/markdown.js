/* markdown.js | v1.7 | 2026-05-24 */
function renderMarkdown(text) {
  if (!text) return '';
  const lines = text.split('\n');
  let html = '';
  let inTable = false;
  let tableRows = [];

  function flushTable() {
    if (!tableRows.length) return;
    const dataRows = tableRows.filter(r => !r.match(/^\|[-| :]+\|$/));
    if (dataRows.length < 2) { tableRows = []; return; }
    const headers = dataRows[0].split('|').filter(s => s.trim());
    const ths = headers.map(s => '<th>' + s.trim() + '</th>').join('');
    let trs = '';
    for (let r = 1; r < dataRows.length; r++) {
      const cells = dataRows[r].split('|').filter(s => s.trim());
      trs += '<tr>' + cells.map(s => '<td>' + s.trim() + '</td>').join('') + '</tr>';
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


function extractScorecard(text) {
  const banner = document.getElementById('verdictBanner');
  if (!banner) return;

  // Extraire Intrinsic Value
  const ivMatch = text.match(/Intrinsic Value.*?\|.*?([€$][\d,.-]+(?:\s*[–-]\s*[€$][\d,.-]+)?)/i);
  if (ivMatch) {
    const el = document.getElementById('vIV');
    if (el) el.textContent = ivMatch[1].trim();
  }

  // Extraire Entry Target Price
  const etpMatch = text.match(/Entry Target.*?\|.*?([€$][\d,.-]+(?:\s*[–-]\s*[€$][\d,.-]+)?)/i);
  if (etpMatch) {
    const el = document.getElementById('vETP');
    if (el) el.textContent = etpMatch[1].trim();
  }

  // Extraire Current Price
  const cpMatch = text.match(/Current Price.*?\|.*?([€$][\d,.-]+)/i);
  if (cpMatch) {
    const el = document.getElementById('vCP');
    if (el) el.textContent = cpMatch[1].trim();
  }

  // Extraire scores du scorecard
  const scoreMap = {
    'Business': 'sBusiness',
    'Moat': 'sMoat',
    'Financials?': 'sFinance',
    'Management': 'sManagement',
    'Valuation': 'sValuation',
    'Overall': 'sOverall',
  };

  for (const [key, id] of Object.entries(scoreMap)) {
    const re = new RegExp(key + '.*?\|.*?(\d(?:\.\d)?)\/5', 'i');
    const m = text.match(re);
    if (m) {
      const el = document.getElementById(id);
      if (el) {
        const score = parseFloat(m[1]);
        const stars = '★'.repeat(Math.round(score)) + '☆'.repeat(5 - Math.round(score));
        el.innerHTML = '<span style="color:#f5c842;">' + stars + '</span> <span style="font-weight:600;">' + m[1] + '/5</span>';
      }
    }
  }

  // Afficher la section scorecard si des données trouvées
  const sc = document.getElementById('scorecardBanner');
  if (sc && (ivMatch || etpMatch)) sc.style.display = 'block';
}

function extractVerdict(text) {
  // Créer ou récupérer le bandeau
  let banner = document.getElementById('verdictBanner');
  if (!banner) {
    const cardHeader = document.querySelector('.card-header');
    if (!cardHeader) return;
    banner = document.createElement('div');
    banner.id = 'verdictBanner';
    banner.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;border-top:0.5px solid var(--border);';
    banner.innerHTML = `
      <div style="padding:16px 12px;text-align:center;border-right:0.5px solid var(--border);">
        <div class="vc-label">Quality</div>
        <div id="vQuality" class="vc-value">—</div>
      </div>
      <div style="padding:16px 12px;text-align:center;border-right:0.5px solid var(--border);">
        <div class="vc-label">Valuation</div>
        <div id="vValuation" class="vc-value">—</div>
      </div>
      <div style="padding:16px 12px;text-align:center;">
        <div class="vc-label">Decision</div>
        <div id="vDecision" class="vc-value">—</div>
      </div>
      <div id="vTarget" style="display:none;grid-column:1/-1;padding:10px 12px;text-align:center;border-top:0.5px solid var(--border);font-family:var(--mono);font-size:12px;color:var(--muted);"></div>
    `;
    cardHeader.insertAdjacentElement('afterend', banner);
  }

  // Qualité
  const qualities = [
    ['Excellent', 'badge-buy', '⭐ Excellent'],
    ['Bon', 'badge-buy', '👍 Good'],
    ['Moyen', 'badge-wait', '⚠️ Average'],
    ['Mauvais', 'badge-avoid', '❌ Poor']
  ];
  for (const [k, cls, label] of qualities) {
    if (text.includes(k)) {
      document.getElementById('vQuality').innerHTML = `<span class="${cls}">${label}</span>`;
      break;
    }
  }

  // Valorisation
  if (text.includes('Sous-évalué')) {
    document.getElementById('vValuation').innerHTML = '<span class="badge-buy">📈 Undervalued</span>';
  } else if (text.includes('Juste prix')) {
    document.getElementById('vValuation').innerHTML = '<span class="badge-wait">⚖️ Fair Value</span>';
  } else if (text.includes('Surévalué')) {
    document.getElementById('vValuation').innerHTML = '<span class="badge-avoid">📉 Overvalued</span>';
  }

  // Décision
  if (text.includes('Éviter')) {
    document.getElementById('vDecision').innerHTML = '<span class="badge-avoid">✗ Avoid</span>';
  } else if (text.includes('Attendre')) {
    document.getElementById('vDecision').innerHTML = '<span class="badge-wait">⏳ Wait</span>';
  } else if (text.includes('Acheter')) {
    document.getElementById('vDecision').innerHTML = '<span class="badge-buy">✅ Buy</span>';
  }

  // Prix cible
  let target = '—';
  const patterns = [
    /Entry Target.*?\|.*?([$€][\d.,]+)/i,
    /Entry Target Price.*?([$€][\d.,]+)/i,
    /prix\s+(?:cible|d.entr[eé]e)[^$\d€]*([$€]?\s*[\d.,]+)/i,
    /entr[eé]e\s*(?:à|:)\s*([$€]?\s*[\d.,]+)/i,
    /cible\s*(?:à|:)\s*([$€]?\s*[\d.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1].trim().length > 1) {
      target = m[1].trim();
      const vt = document.getElementById('vTarget');
      vt.innerHTML = `Entry target price: <span style="color:var(--accent);font-weight:500;">${target}</span>`;
      vt.style.display = 'block';
      break;
    }
  }

  // Retourner le verdict pour la watchlist
  return {
    quality: document.getElementById('vQuality')?.textContent?.trim() || '—',
    valuation: document.getElementById('vValuation')?.textContent?.trim() || '—',
    decision: document.getElementById('vDecision')?.textContent?.trim() || '—',
    target: target,
  };
}

// Appeler extractScorecard après chaque mise à jour du texte
function updateScorecard(text) {
  extractScorecard(text);
}
