/* watchlist.js | v2.0 | 2026-05-24 */
const WATCHLIST_KEY = 'stock_watchlist';
const CATEGORIES_KEY = 'stock_categories';

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

function getCategories() {
  try { return JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '["All"]'); }
  catch { return ['All']; }
}

function saveCategories(cats) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
}

function addToWatchlist(data, verdict) {
  const list = getWatchlist();
  const p = data.price || {};
  const currency = p.currency || 'USD';
  const cs = {'USD':'$','EUR':'€','GBP':'£','CHF':'CHF ','CAD':'CA$','JPY':'¥','KRW':'₩','SGD':'S$','INR':'₹','AED':'AED ','SAR':'SAR ','QAR':'QAR '}[currency] || currency+' ';
  const now = new Date();

  const entry = {
    ticker: p.symbol || '—',
    name: p.shortName || p.symbol || '—',
    currency: cs,
    priceAdded: p.regularMarketPrice,
    priceCurrent: p.regularMarketPrice,
    intrinsicValue: verdict.intrinsicValue || '—',
    valuation: verdict.valuation || '—',
    decision: verdict.decision || '—',
    target: verdict.target || '—',
    scores: verdict.scores || {},
    overall: verdict.overall || '—',
    category: 'All',
    dateAdded: now.toLocaleDateString('en-GB'),
    dateAnalyzed: now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}),
  };

  const idx = list.findIndex(e => e.ticker === entry.ticker);
  const isUpdate = idx >= 0;
  if (isUpdate) {
    entry.priceAdded = list[idx].priceAdded;
    entry.category = list[idx].category || 'All';
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

function setCategory(ticker, category) {
  const list = getWatchlist();
  const idx = list.findIndex(e => e.ticker === ticker);
  if (idx >= 0) { list[idx].category = category; saveWatchlist(list); }
  renderWatchlist();
}

function addCategory(name) {
  if (!name || !name.trim()) return;
  const cats = getCategories();
  if (!cats.includes(name.trim())) { cats.push(name.trim()); saveCategories(cats); }
  renderWatchlist();
}

function deleteCategory(name) {
  if (name === 'All') return;
  const cats = getCategories().filter(c => c !== name);
  saveCategories(cats);
  // Reset stocks in this category to 'All'
  const list = getWatchlist();
  list.forEach(e => { if (e.category === name) e.category = 'All'; });
  saveWatchlist(list);
  renderWatchlist();
}

let activeCategory = 'All';

function renderWatchlist() {
  const list = getWatchlist();
  const cats = getCategories();
  const container = document.getElementById('watchlistContent');
  if (!container) return;

  // Filtrer par catégorie active
  const filtered = activeCategory === 'All' ? list : list.filter(e => e.category === activeCategory);

  container.innerHTML = `
    <div class="wl-cats">
      ${cats.map(c => `
        <div class="wl-cat ${c === activeCategory ? 'wl-cat-active' : ''}" onclick="activeCategory='${c}';renderWatchlist()">
          ${c}
          <span class="wl-cat-count">${c === 'All' ? list.length : list.filter(e => e.category === c).length}</span>
          ${c !== 'All' ? `<span class="wl-cat-del" onclick="event.stopPropagation();deleteCategory('${c}')">✕</span>` : ''}
        </div>
      `).join('')}
      <div class="wl-cat wl-cat-add" onclick="promptAddCategory()">+ New</div>
    </div>

    ${!filtered.length ? `
      <div style="text-align:center;padding:48px 24px;color:var(--muted);font-size:13px;">
        No stocks in this category.<br>
        <span style="font-size:12px;opacity:0.6">Add stocks from the Analyze tab.</span>
      </div>` : `
    <div class="wl-table-wrap">
      <table class="wl-table">
        <thead>
          <tr>
            <th>Company</th>
            <th class="num">Intrinsic Value</th>
            <th class="num">Entry Target</th>
            <th class="num">Price Added</th>
            <th class="num">Current Price</th>
            <th class="num">Change</th>
            <th class="ctr">Score</th>
            <th class="ctr">Valuation</th>
            <th class="ctr">Decision</th>
            <th class="ctr">Category</th>
            <th class="ctr">Analyzed on</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(e => {
            const varPct = e.priceAdded ? ((e.priceCurrent - e.priceAdded) / e.priceAdded * 100) : 0;
            const varColor = varPct >= 0 ? 'var(--green)' : 'var(--red)';
            const varSign = varPct >= 0 ? '+' : '';
            const decisionClass = e.decision.includes('Buy') || e.decision.includes('Acheter') ? 'badge-buy' :
                                  e.decision.includes('Wait') || e.decision.includes('Attendre') ? 'badge-wait' : 'badge-avoid';
            const catOptions = cats.filter(c => c !== 'All').map(c =>
              `<option value="${c}" ${e.category === c ? 'selected' : ''}>${c}</option>`
            ).join('');
            const sc = e.scores || {};
            const scoreTip = [
              'Business: ' + (sc.business || '—') + '/5',
              'Moat: ' + (sc.moat || '—') + '/5',
              'Financials: ' + (sc.financials || '—') + '/5',
              'Management: ' + (sc.management || '—') + '/5',
              'Valuation: ' + (sc.valuationScore || '—') + '/5',
            ].join(' · ');
            const ov = e.overall && e.overall !== '—' ? e.overall : null;
            const ovStars = ov ? '★'.repeat(Math.round(parseFloat(ov))) : '';
            return `
            <tr class="wl-row" onclick="loadFromWatchlist('${e.ticker}')">
              <td>
                <div class="wl-ticker">${e.ticker}</div>
                <div class="wl-name">${e.name}</div>
              </td>
              <td class="num mono muted">${e.intrinsicValue || '—'}</td>
              <td class="num mono accent">${e.target}</td>
              <td class="num mono muted">${e.currency}${Number(e.priceAdded||0).toFixed(2)}</td>
              <td class="num mono bold" id="wl-price-${e.ticker}">${e.currency}${Number(e.priceCurrent||0).toFixed(2)}</td>
              <td class="num mono" style="color:${varColor}">${varSign}${varPct.toFixed(2)}%</td>
              <td class="ctr small" title="${scoreTip}">${ov ? `<span style="color:#f5c842">${ovStars}</span> ${ov}/5` : '—'}</td>
              <td class="ctr small">${e.valuation}</td>
              <td class="ctr small ${decisionClass}">${e.decision}</td>
              <td class="ctr" onclick="event.stopPropagation()">
                <select class="wl-cat-select" onchange="setCategory('${e.ticker}', this.value)">
                  <option value="All" ${e.category === 'All' || !e.category ? 'selected' : ''}>—</option>
                  ${catOptions}
                </select>
              </td>
              <td class="ctr tiny muted">${e.dateAnalyzed || e.dateAdded}</td>
              <td class="ctr" onclick="event.stopPropagation()">
                <button class="wl-del" onclick="removeFromWatchlist('${e.ticker}')">✕</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`}

    <div class="wl-footer">
      <span class="tiny muted">${filtered.length} stock${filtered.length !== 1 ? 's' : ''}</span>
      <button class="wl-refresh" onclick="refreshWatchlistPrices()">↻ Refresh Prices</button>
    </div>
  `;
}

function promptAddCategory() {
  const name = prompt('New category name:');
  if (name && name.trim()) addCategory(name.trim());
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
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active'));
  document.getElementById('tabWatchlist').classList.add('tab-active');
  document.getElementById('analyzeView').style.display = 'none';
  document.getElementById('watchlistView').style.display = 'flex';
  if (document.getElementById('historyView')) document.getElementById('historyView').style.display = 'none';
  renderWatchlist();
}

function showAnalyzeTab() {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active'));
  document.getElementById('tabAnalyze').classList.add('tab-active');
  document.getElementById('analyzeView').style.display = 'block';
  document.getElementById('watchlistView').style.display = 'none';
  if (document.getElementById('historyView')) document.getElementById('historyView').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function() { updateWlCount(); });
