const fmt  = (n, d=2) => n == null || isNaN(n) ? '—' : Number(n).toFixed(d);
const fmtB = n => n == null ? '—' : (n/1e9 >= 1000 ? (n/1e12).toFixed(1)+' T$' : (n/1e9).toFixed(1)+' Mrd$');
const fmtM = n => n == null ? '—' : (n/1e6).toFixed(1)+' M';
const pct  = n => n == null ? '—' : (n >= 0 ? '+' : '')+(n*100).toFixed(2)+'%';
const cc   = n => n == null ? '' : n >= 0 ? 'up' : 'down';

function recBadge(k) {
  if (!k) return '';
  const m = {
    buy: ['rec-buy','Achat'],
    hold: ['rec-hold','Neutre'],
    sell: ['rec-sell','Vente'],
    'strong buy': ['rec-buy','Fort achat'],
    'strong sell': ['rec-sell','Fort vente']
  };
  const [c, l] = m[k] || ['rec-hold', k];
  return `<div class="rec-badge ${c}">${l}</div>`;
}

function rbar(lo, hi, cur) {
  if (!lo || !hi || !cur) return '';
  const p = Math.min(100, Math.max(0, ((cur-lo)/(hi-lo))*100));
  return `
    <div class="range-bar">
      <div class="range-fill" style="width:${p}%"></div>
      <div class="range-dot" style="left:${p}%"></div>
    </div>
    <div class="range-labels"><span>$${fmt(lo)}</span><span>$${fmt(hi)}</span></div>`;
}
