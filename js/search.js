let allCompanies = [];
let dataLoaded = false;
let searchOpen = false;
let searchTimeout = null;

async function loadData() {
  if (dataLoaded) return;
  try {
    const [sp500, nasdaq, stoxx] = await Promise.all([
      fetch('data/sp500.json').then(r => r.json()),
      fetch('data/nasdaq.json').then(r => r.json()),
      fetch('data/stoxx600.json').then(r => r.json()),
    ]);
    const seen = new Set();
    [...sp500, ...nasdaq, ...stoxx].forEach(c => {
      if (!seen.has(c.ticker)) { seen.add(c.ticker); allCompanies.push(c); }
    });
    dataLoaded = true;
  } catch (e) {
    console.warn('Erreur chargement données:', e);
  }
}

function initSearch() {
  const input = document.getElementById('ticker');
  document.querySelector('.input-row').style.position = 'relative';
  input.addEventListener('focus', loadData);
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
}

function doSearch(q) {
  const ql = q.toLowerCase();
  const matches = allCompanies.filter(c =>
    c.name.toLowerCase().includes(ql) || c.ticker.toLowerCase().includes(ql)
  ).slice(0, 7);
  if (matches.length) showDropdown(matches);
  else closeDropdown();
}

function showDropdown(matches) {
  let dd = document.getElementById('searchDropdown');
  if (!dd) {
    dd = document.createElement('div');
    dd.id = 'searchDropdown';
    document.querySelector('.input-row').appendChild(dd);
  }
  dd.style.cssText = 'position:absolute;top:100%;left:0;right:0;z-index:200;background:#16161f;border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.5);';
  dd.innerHTML = matches.map((c, i) => `
    <div class="search-item" data-ticker="${c.ticker}" data-index="${i}" style="padding:10px 16px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;border-bottom:0.5px solid var(--border);">
      <div>
        <span style="font-family:var(--mono);font-size:13px;font-weight:500;color:var(--text)">${c.ticker}</span>
        <span style="font-size:12px;color:var(--muted);margin-left:10px">${c.name}</span>
      </div>
      <span style="font-family:var(--mono);font-size:10px;color:var(--muted);letter-spacing:0.06em">${c.exchange}</span>
    </div>
  `).join('');
  dd.querySelectorAll('.search-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      dd.querySelectorAll('.search-item').forEach(el => { el.classList.remove('active'); el.style.background = 'transparent'; });
      item.classList.add('active');
      item.style.background = 'var(--accent-dim)';
    });
    item.addEventListener('mouseleave', () => { item.classList.remove('active'); item.style.background = 'transparent'; });
    item.addEventListener('click', () => selectTicker(item.dataset.ticker));
  });
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
  items[next].style.background = 'var(--accent-dim)';
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
