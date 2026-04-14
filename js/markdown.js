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
    .replace(/\bBon\b/g, '<span class="badge-buy">👍 Bon</span>')
    .replace(/\bMoyen\b/g, '<span class="badge-wait">⚠️ Moyen</span>')
    .replace(/\bMauvais\b/g, '<span class="badge-avoid">❌ Mauvais</span>')
    .replace(/Juste prix/g, '<span class="badge-wait">⚖️ Juste prix</span>')
    .replace(/Sous-évalué/g, '<span class="badge-buy">📈 Sous-évalué</span>')
    .replace(/Surévalué/g, '<span class="badge-avoid">📉 Surévalué</span>')
    .replace(/Attendre une meilleure entrée/g, '<span class="badge-wait">⏳ Attendre</span>')
    .replace(/\bAttendre\b/g, '<span class="badge-wait">⏳ Attendre</span>')
    .replace(/\bÉviter\b/g, '<span class="badge-avoid">✗ Éviter</span>')
    .replace(/\bAcheter\b/g, '<span class="badge-buy">✅ Acheter</span>');

  return '<div class="ai-body">' + html + '</div>';
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
      <div style="padding:10px 12px;text-align:center;border-right:0.5px solid var(--border);">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;">Qualité</div>
        <div id="vQuality" style="font-size:12px;font-weight:500;">—</div>
      </div>
      <div style="padding:10px 12px;text-align:center;border-right:0.5px solid var(--border);">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;">Valorisation</div>
        <div id="vValuation" style="font-size:12px;font-weight:500;">—</div>
      </div>
      <div style="padding:10px 12px;text-align:center;">
        <div style="font-family:var(--mono);font-size:9px;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:3px;">Décision</div>
        <div id="vDecision" style="font-size:12px;font-weight:500;">—</div>
      </div>
      <div id="vTarget" style="display:none;grid-column:1/-1;padding:7px 12px;text-align:center;border-top:0.5px solid var(--border);font-family:var(--mono);font-size:11px;color:var(--muted);"></div>
    `;
    cardHeader.insertAdjacentElement('afterend', banner);
  }

  // Qualité
  const qualities = [
    ['Excellent', 'badge-buy', '⭐ Excellent'],
    ['Bon', 'badge-buy', '👍 Bon'],
    ['Moyen', 'badge-wait', '⚠️ Moyen'],
    ['Mauvais', 'badge-avoid', '❌ Mauvais']
  ];
  for (const [k, cls, label] of qualities) {
    if (text.includes(k)) {
      document.getElementById('vQuality').innerHTML = `<span class="${cls}">${label}</span>`;
      break;
    }
  }

  // Valorisation
  if (text.includes('Sous-évalué')) {
    document.getElementById('vValuation').innerHTML = '<span class="badge-buy">📈 Sous-évalué</span>';
  } else if (text.includes('Juste prix')) {
    document.getElementById('vValuation').innerHTML = '<span class="badge-wait">⚖️ Juste prix</span>';
  } else if (text.includes('Surévalué')) {
    document.getElementById('vValuation').innerHTML = '<span class="badge-avoid">📉 Surévalué</span>';
  }

  // Décision
  if (text.includes('Éviter')) {
    document.getElementById('vDecision').innerHTML = '<span class="badge-avoid">✗ Éviter</span>';
  } else if (text.includes('Attendre')) {
    document.getElementById('vDecision').innerHTML = '<span class="badge-wait">⏳ Attendre</span>';
  } else if (text.includes('Acheter')) {
    document.getElementById('vDecision').innerHTML = '<span class="badge-buy">✅ Acheter</span>';
  }

  // Prix cible
  const patterns = [
    /prix\s+(?:cible|d.entr[eé]e)[^$\d]*([$]?\s*[\d.,]+)/i,
    /entr[eé]e\s*(?:à|:)\s*([$]?\s*[\d.,]+)/i,
    /cible\s*(?:à|:)\s*([$]?\s*[\d.,]+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m && m[1].trim().length > 1) {
      const vt = document.getElementById('vTarget');
      vt.innerHTML = `Prix cible d'entrée : <span style="color:var(--accent);font-weight:500;">${m[1].trim()}</span>`;
      vt.style.display = 'block';
      break;
    }
  }
}
