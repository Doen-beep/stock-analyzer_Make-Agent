/* history.js | v1.0 | 2026-05-24 */
const HISTORY_KEY = 'stock_history';
const MAX_HISTORY = 50;

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

function saveHistory(list) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

function addToHistory(ticker, name, price, currency) {
  const list = getHistory();
  const now = new Date();
  const entry = {
    ticker,
    name,
    price,
    currency,
    date: now.toLocaleDateString('fr-FR'),
    time: now.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
    timestamp: now.getTime(),
  };
  list.unshift(entry);
  if (list.length > MAX_HISTORY) list.pop();
  saveHistory(list);
  updateHistoryCount();
}

function updateHistoryCount() {
  const n = getHistory().length;
  const el = document.getElementById('histCount');
  if (el) el.textContent = n ? `(${n})` : '';
}

function renderHistory() {
  const list = getHistory();
  const container = document.getElementById('historyContent');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:64px 24px;color:var(--muted);font-size:13px;line-height:2;">
        Aucune consultation enregistrée.<br>
        <span style="font-size:12px;opacity:0.6">L'historique se remplit automatiquement à chaque analyse.</span>
      </div>`;
    return;
  }

  // Grouper par date
  const grouped = {};
  list.forEach(e => {
    if (!grouped[e.date]) grouped[e.date] = [];
    grouped[e.date].push(e);
  });

  container.innerHTML = Object.entries(grouped).map(([date, entries]) => `
    <div class="hist-group">
      <div class="hist-date">${date}</div>
      ${entries.map(e => `
        <div class="hist-row" onclick="loadFromHistory('${e.ticker}')">
          <div class="hist-left">
            <span class="hist-ticker">${e.ticker}</span>
            <span class="hist-name">${e.name}</span>
          </div>
          <div class="hist-right">
            <span class="hist-price">${e.currency}${Number(e.price||0).toFixed(2)}</span>
            <span class="hist-time">${e.time}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('') + `
    <div class="wl-footer">
      <span class="tiny muted">${list.length} consultation${list.length > 1 ? 's' : ''}</span>
      <button class="wl-refresh" onclick="clearHistory()">🗑 Effacer l'historique</button>
    </div>
  `;
}

function clearHistory() {
  if (!confirm('Effacer tout l\'historique ?')) return;
  localStorage.removeItem(HISTORY_KEY);
  updateHistoryCount();
  renderHistory();
}

function loadFromHistory(ticker) {
  showAnalyzeTab();
  document.getElementById('ticker').value = ticker;
  analyze();
}

function showHistoryTab() {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active'));
  document.getElementById('tabHistory').classList.add('tab-active');
  document.getElementById('analyzeView').style.display = 'none';
  document.getElementById('watchlistView').style.display = 'none';
  document.getElementById('historyView').style.display = 'flex';
  renderHistory();
}
