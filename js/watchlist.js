/* watchlist.js | v1.7 | 2026-05-24 */
const WATCHLIST_KEY = 'stock_watchlist';

function updateWlCount() {
  const n = getWatchlist().length;
  const el = document.getElementById('wlCount');
  if (el) el.textContent = n ? '(' + n + ')' : '';
}

function getWatchlist() {
  try { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '[]'); }
  catch { return []; }
}

function saveWatchlist(list) {
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
}

function addToWatchlist(data, verdict) {
  const list = getWatchlist();
  const p = data.price || {};
  const currency = p.currency || 'USD';
  const cs = {'USD':'$','EUR':'€','GBP':'£','CHF':'CHF ','CAD':'CA$','JPY':'¥','KRW':'₩','SGD':'S$','INR':'₹','AED':'AED '}[currency] || currency+' ';

  const now = new Date();
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
    dateAdded: now.toLocaleDateString('fr-FR'),
    dateAnalyzed: now.toLocaleDateString('fr-FR') + ' ' + now.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
  };

  const idx = list.findIndex(e => e.ticker === entry.ticker);
  const isUpdate = idx >= 0;
  if (isUpdate) {
    // Conserver le prix d'origine si déjà dans la watchlist
    entry.priceAdded = list[idx].priceAdded;
    list[idx] = entry;
  } else {
    list.unshift(entry);
  }

  saveWatchlist(list);
  updateWlCount();
  renderWatchlist();
  return isUpdate;
}

function removeFromWatchlist(ticker) {
  const list = getWatchlist().filter(e => e.ticker !== ticker);
  saveWatchlist(list);
  updateWlCount();
  renderWatchlist();
}

function renderWatchlist() {
  const list = getWatchlist();
  const container = document.getElementById('watchlistContent');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:64px 24px;color:var(--muted);font-size:13px;line-height:2;">
        No stocks in your watchlist yet.<br>
        <span style="font-size:12px;opacity:0.6">Analysez une action → cliquez "+ Add to Watchlist"</span>
      </div>`;
    return;
  }

  container.innerHTML = `
    <div class="wl-table-wrap">
      <table class="wl-table">
        <thead>
          <tr>
            <th>Company</th>
            <th class="num">Entry Target</th>
            <th class="num">Price Added</th>
            <th class="num">Current Price</th>
            <th class="num">Change</th>
            <th class="ctr">Quality</th>
            <th class="ctr">Valuation</th>
            <th class="ctr">Decision</th>
            <th class="ctr">Analyzed on</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${list.map(e => {
            const varPct = e.priceAdded ? ((e.priceCurrent - e.priceAdded) / e.priceAdded * 100) : 0;
            const varColor = varPct >= 0 ? 'var(--green)' : 'var(--red)';
            const varSign = varPct >= 0 ? '+' : '';
            const decisionClass = e.decision.includes('Acheter') ? 'badge-buy' : e.decision.includes('Attendre') ? 'badge-wait' : e.decision.includes('viter') ? 'badge-avoid' : '';
            return `
            <tr class="wl-row" onclick="loadFromWatchlist('${e.ticker}')">
              <td>
                <div class="wl-ticker">${e.ticker}</div>
                <div class="wl-name">${e.name}</div>
              </td>
              <td class="num mono accent">${e.target}</td>
              <td class="num mono muted">${e.currency}${Number(e.priceAdded||0).toFixed(2)}</td>
              <td class="num mono bold" id="wl-price-${e.ticker}">${e.currency}${Number(e.priceCurrent||0).toFixed(2)}</td>
              <td class="num mono" style="color:${varColor}">${varSign}${varPct.toFixed(2)}%</td>
              <td class="ctr small">${e.quality}</td>
              <td class="ctr small">${e.valuation}</td>
              <td class="ctr small ${decisionClass}">${e.decision}</td>
              <td class="ctr tiny muted">${e.dateAnalyzed || e.dateAdded}</td>
              <td class="ctr">
                <button class="wl-del" onclick="event.stopPropagation();removeFromWatchlist('${e.ticker}')">✕</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="wl-footer">
      <span class="tiny muted">${list.length} stock${list.length > 1 ? 's' : ''}</span>
      <button class="wl-refresh" onclick="refreshWatchlistPrices()">↻ Refresh Prices</button>
    </div>
  `;
}

async function refreshWatchlistPrices() {
  const list = getWatchlist();
  if (!list.length) return;
  const btn = document.querySelector('.wl-refresh');
  if (btn) { btn.textContent = '↻ Updating…'; btn.disabled = true; }

  for (const entry of list) {
    try {
      const res = await fetch(WEBHOOK + '?symbol=' + encodeURIComponent(entry.ticker) + '&region=' + getRegion(entry.ticker));
      const json = await res.json();
      const price = (json.data || json)?.price?.regularMarketPrice;
      if (price) {
        entry.priceCurrent = price;
        const el = document.getElementById('wl-price-' + entry.ticker);
        if (el) el.textContent = entry.currency + price.toFixed(2);
      }
    } catch(e) { console.warn('Refresh error:', entry.ticker, e); }
  }

  saveWatchlist(list);
  renderWatchlist();
  if (btn) { btn.textContent = '↻ Refresh Prices'; btn.disabled = false; }
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
  document.getElementById('watchlistView').style.display = 'flex';
  document.getElementById('historyView') && (document.getElementById('historyView').style.display = 'none');
  renderWatchlist();
}

function showAnalyzeTab() {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active'));
  document.getElementById('tabAnalyze').classList.add('tab-active');
  document.getElementById('analyzeView').style.display = 'block';
  document.getElementById('watchlistView').style.display = 'none';
  document.getElementById('historyView') && (document.getElementById('historyView').style.display = 'none');
}

// Initialiser le compteur au chargement
document.addEventListener("DOMContentLoaded", function() { updateWlCount(); });
