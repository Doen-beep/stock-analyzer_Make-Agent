const WATCHLIST_KEY = 'stock_watchlist';

function getWatchlist() {
  try {
    return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]');
  } catch { return []; }
}

function saveWatchlist(list) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

function addToWatchlist(data, verdict) {
  const list = getWatchlist();
  const p = data.price || {};
  const currency = p.currency || 'USD';
  const cs = {'USD':'$','EUR':'€','GBP':'£','CHF':'CHF ','CAD':'CA$'}[currency] || currency+' ';

  const entry = {
    ticker: p.symbol || '—',
    name: p.shortName || p.symbol || '—',
    currency: cs,
    priceAdded: p.regularMarketPrice,
    priceCurrent: p.regularMarketPrice,
    quality: verdict.quality || '—',
    valuation: verdict.valuation || '—',
    decision: verdict.decision || '—',
    target: verdict.target || '—',
    dateAdded: new Date().toLocaleDateString('fr-FR'),
  };

  // Remplacer si déjà présent
  const idx = list.findIndex(e => e.ticker === entry.ticker);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);

  saveWatchlist(list);
  renderWatchlist();
  showWatchlistTab();
}

function removeFromWatchlist(ticker) {
  const list = getWatchlist().filter(e => e.ticker !== ticker);
  saveWatchlist(list);
  renderWatchlist();
}

function renderWatchlist() {
  const list = getWatchlist();
  const container = document.getElementById('watchlistContent');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:48px 24px;color:var(--muted);font-size:13px;">
        Aucune entreprise dans la watchlist.<br>
        <span style="font-size:12px;opacity:0.6">Analysez une action et cliquez "+ Ajouter à la watchlist"</span>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid var(--border);">
            <th style="font-family:var(--mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#a09cc0;padding:10px 12px;text-align:left;">Ticker</th>
            <th style="font-family:var(--mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#a09cc0;padding:10px 12px;text-align:right;">Prix ajouté</th>
            <th style="font-family:var(--mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#a09cc0;padding:10px 12px;text-align:right;">Prix actuel</th>
            <th style="font-family:var(--mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#a09cc0;padding:10px 12px;text-align:right;">Variation</th>
            <th style="font-family:var(--mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#a09cc0;padding:10px 12px;text-align:center;">Qualité</th>
            <th style="font-family:var(--mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#a09cc0;padding:10px 12px;text-align:center;">Valorisation</th>
            <th style="font-family:var(--mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#a09cc0;padding:10px 12px;text-align:center;">Décision</th>
            <th style="font-family:var(--mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#a09cc0;padding:10px 12px;text-align:right;">Cible</th>
            <th style="font-family:var(--mono);font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:#a09cc0;padding:10px 12px;text-align:center;">Ajouté</th>
            <th style="padding:10px 12px;"></th>
          </tr>
        </thead>
        <tbody>
          ${list.map(e => {
            const varPct = e.priceAdded ? ((e.priceCurrent - e.priceAdded) / e.priceAdded * 100) : 0;
            const varColor = varPct >= 0 ? 'var(--green)' : 'var(--red)';
            const varSign = varPct >= 0 ? '+' : '';
            return `
            <tr style="border-bottom:0.5px solid var(--border);cursor:pointer;" onclick="loadFromWatchlist('${e.ticker}')" class="wl-row">
              <td style="padding:12px;">
                <div style="font-family:var(--mono);font-weight:500;color:#e8e6f0">${e.ticker}</div>
                <div style="font-size:11px;color:#9990bb;margin-top:2px">${e.name}</div>
              </td>
              <td style="padding:12px;text-align:right;font-family:var(--mono);color:#c0bcd8">${e.currency}${Number(e.priceAdded).toFixed(2)}</td>
              <td style="padding:12px;text-align:right;font-family:var(--mono);font-weight:500;color:#e8e6f0" id="wl-price-${e.ticker}">${e.currency}${Number(e.priceCurrent).toFixed(2)}</td>
              <td style="padding:12px;text-align:right;font-family:var(--mono);color:${varColor}">${varSign}${varPct.toFixed(2)}%</td>
              <td style="padding:12px;text-align:center;font-size:12px">${e.quality}</td>
              <td style="padding:12px;text-align:center;font-size:12px">${e.valuation}</td>
              <td style="padding:12px;text-align:center;font-size:12px">${e.decision}</td>
              <td style="padding:12px;text-align:right;font-family:var(--mono);color:var(--accent)">${e.target}</td>
              <td style="padding:12px;text-align:center;font-size:11px;color:#6b6880">${e.dateAdded}</td>
              <td style="padding:12px;text-align:center;">
                <button onclick="event.stopPropagation();removeFromWatchlist('${e.ticker}')"
                  style="background:none;border:1px solid rgba(240,90,90,0.3);color:var(--red);border-radius:4px;padding:3px 8px;cursor:pointer;font-size:11px;">✕</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="padding:12px 16px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
      <span style="font-family:var(--mono);font-size:11px;color:var(--muted)">${list.length} entreprise${list.length > 1 ? 's' : ''}</span>
      <button onclick="refreshWatchlistPrices()" style="background:none;border:1px solid var(--border);color:#a09cc0;border-radius:4px;padding:5px 12px;cursor:pointer;font-family:var(--mono);font-size:11px;letter-spacing:0.06em;">
        ↻ Actualiser les prix
      </button>
    </div>
  `;
}

async function refreshWatchlistPrices() {
  const list = getWatchlist();
  if (!list.length) return;

  const btn = document.querySelector('[onclick="refreshWatchlistPrices()"]');
  if (btn) { btn.textContent = '↻ Actualisation…'; btn.disabled = true; }

  for (const entry of list) {
    try {
      const res = await fetch(WEBHOOK + '?symbol=' + encodeURIComponent(entry.ticker) + '&region=' + getRegion(entry.ticker));
      const json = await res.json();
      const data = json.data || json;
      const price = data?.price?.regularMarketPrice;
      if (price) {
        entry.priceCurrent = price;
        const el = document.getElementById('wl-price-' + entry.ticker);
        if (el) el.textContent = entry.currency + price.toFixed(2);
      }
    } catch (e) { console.warn('Refresh error:', entry.ticker, e); }
  }

  saveWatchlist(list);
  renderWatchlist();
  if (btn) { btn.textContent = '↻ Actualiser les prix'; btn.disabled = false; }
}

function loadFromWatchlist(ticker) {
  showAnalyzeTab();
  document.getElementById('ticker').value = ticker;
  analyze();
}

function showWatchlistTab() {
  document.getElementById('tabAnalyze').classList.remove('tab-active');
  document.getElementById('tabWatchlist').classList.add('tab-active');
  document.getElementById('analyzeView').style.display = 'none';
  document.getElementById('watchlistView').style.display = 'block';
  renderWatchlist();
}

function showAnalyzeTab() {
  document.getElementById('tabWatchlist').classList.remove('tab-active');
  document.getElementById('tabAnalyze').classList.add('tab-active');
  document.getElementById('watchlistView').style.display = 'none';
  document.getElementById('analyzeView').style.display = 'block';
}
