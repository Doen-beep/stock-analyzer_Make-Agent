/* search.js | v1.3 | 2026-05-24   */
let allCompanies = [];
let searchOpen = false;
let searchTimeout = null;

// Charger les données immédiatement
(async function loadData() {
  try {
    const [sp500, nasdaq, stoxx, euronext, asia, euronextParis, xetra, six, gulf] = await Promise.all([
      fetch('data/sp500.json').then(r => r.json()),
      fetch('data/nasdaq.json').then(r => r.json()),
      fetch('data/stoxx600.json').then(r => r.json()),
      fetch('data/euronext.json').then(r => r.json()),
      fetch('data/asia.json').then(r => r.json()),
      fetch('data/euronext-paris.json').then(r => r.json()),
      fetch('data/xetra.json').then(r => r.json()),
      fetch('data/six.json').then(r => r.json()),
      fetch('data/gulf.json').then(r => r.json()),
    ]);
    const seen = new Set();
    [...sp500, ...nasdaq, ...stoxx, ...euronext, ...asia, ...euronextParis, ...xetra, ...six, ...gulf].forEach(c => {
      if (!seen.has(c.ticker)) { seen.add(c.ticker); allCompanies.push(c); }
    });
    console.log('Search data loaded:', allCompanies.length, 'companies');
  } catch (e) {
    console.warn('Erreur chargement données:', e);
  }
})();

function initSearch() {
  const input = document.getElementById('ticker');
  const inputRow = document.querySelector('.input-row');
  inputRow.style.position = 'relative';

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(searchTimeout);
    if (q.length < 2) { closeDropdown(); return; }
    searchTimeout = setTimeout(() => doSearch(q), 150);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDropdown(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); navigateDropdown(1); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); navigateDropdown(-1); return; }
    if (e.key === 'Enter') {
      const active = document.querySelector('.search-item.active');
      if (active) { active.click(); return; }
      if (!searchOpen) analyze();
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.input-row')) closeDropdown();
  });

  console.log('initSearch called OK');
}

function doSearch(q) {
  const ql = q.toLowerCase();
  const matches = allCompanies.filter(c =>
    c.name.toLowerCase().includes(ql) || c.ticker.toLowerCase().includes(ql)
  ).slice(0, 7);
  console.log('Search:', q, '->', matches.length, 'results');
  if (matches.length) showDropdown(matches);
  else closeDropdown();
}

function showDropdown(matches) {
  closeDropdown();
  const inputRow = document.querySelector('.input-row');
  const dd = document.createElement('div');
  dd.id = 'searchDropdown';
  dd.style.cssText = 'position:absolute;top:100%;left:0;right:0;z-index:9999;background:#16161f;border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5);';

  dd.innerHTML = matches.map((c, i) => `
    <div class="search-item" data-ticker="${c.ticker}" data-index="${i}"
      style="padding:10px 16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:0.5px solid var(--border);">
      <div>
        <span style="font-family:var(--mono);font-size:13px;font-weight:500;color:#e8e6f0">${c.ticker}</span>
        <span style="font-size:12px;color:#9990bb;margin-left:10px">${c.name}</span>
      </div>
      <span style="font-family:var(--mono);font-size:10px;color:#6b6880;letter-spacing:0.06em">${c.exchange}</span>
    </div>
  `).join('');

  dd.querySelectorAll('.search-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      dd.querySelectorAll('.search-item').forEach(el => { el.classList.remove('active'); el.style.background = 'transparent'; });
      item.classList.add('active');
      item.style.background = 'rgba(124,106,247,0.12)';
    });
    item.addEventListener('mouseleave', () => {
      item.classList.remove('active');
      item.style.background = 'transparent';
    });
    item.addEventListener('click', () => selectTicker(item.dataset.ticker));
  });

  inputRow.appendChild(dd);
  searchOpen = true;
}

function navigateDropdown(dir) {
  const items = [...document.querySelectorAll('.search-item')];
  if (!items.length) return;
  const idx = items.findIndex(el => el.classList.contains('active'));
  items.forEach(el => { el.classList.remove('active'); el.style.background = 'transparent'; });
  let next = idx + dir;
  if (next < 0) next = items.length - 1;
  if (next >= items.length) next = 0;
  items[next].classList.add('active');
  items[next].style.background = 'rgba(124,106,247,0.12)';
}

function selectTicker(ticker) {
  document.getElementById('ticker').value = ticker;
  closeDropdown();
  analyze();
}

function closeDropdown() {
  const d = document.getElementById('searchDropdown');
  if (d) d.remove();
  searchOpen = false;
}
