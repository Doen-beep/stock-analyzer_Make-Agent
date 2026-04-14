let lastData = null;

async function analyze() {
  const ticker = document.getElementById('ticker').value.trim().toUpperCase();
  if (!ticker) return;

  const btn     = document.getElementById('btn');
  const status  = document.getElementById('status');
  const errorEl = document.getElementById('error');
  const card    = document.getElementById('card');

  btn.disabled = true;
  card.style.display = 'none';
  errorEl.style.display = 'none';
  lastData = null;
  status.className = 'status loading';
  status.textContent = 'Chargement de ' + ticker + '…';

  try {
    const res = await fetch(WEBHOOK + '?symbol=' + encodeURIComponent(ticker) + '&region=' + getRegion(ticker));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const json = await res.json();
    const data = json.data || json;
    if (!data.price) throw new Error('Données invalides reçues');

    lastData = data;
    status.className = 'status';
    status.textContent = '✓ ' + ticker + ' · ' + new Date().toLocaleTimeString('fr-FR');
    render(data);
  } catch (e) {
    status.className = 'status';
    status.textContent = '';
    errorEl.textContent = 'Erreur : ' + e.message;
    errorEl.style.display = 'block';
  } finally {
    btn.disabled = false;
  }
}

async function aiAnalyze() {
  if (!lastData) return;

  const aiBtn   = document.getElementById('aiBtn');
  const aiBlock = document.getElementById('aiBlock');
  const aiText  = document.getElementById('aiText');

  aiBtn.disabled = true;
  aiBlock.style.display = 'block';
  aiText.innerHTML = '<span style="color:var(--muted);font-style:italic">Analyse en cours…</span>';

  const p  = lastData.price || {};
  const sd = lastData.summaryDetail || {};
  const fd = lastData.financialData || {};
  const ks = lastData.defaultKeyStatistics || {};

  const input_as_text = [
    `Analyse financière de ${p.symbol} (${p.shortName || p.symbol}) — données temps réel :`,
    `PRIX & MARCHÉ`,
    `Prix : $${fmt(p.regularMarketPrice)} | Variation : ${pct(p.regularMarketChangePercent)}`,
    `Plage 52 sem. : $${fmt(sd.fiftyTwoWeekLow)} – $${fmt(sd.fiftyTwoWeekHigh)} | Perf. : ${pct(ks['52WeekChange'])}`,
    `Moy. 50j : $${fmt(sd.fiftyDayAverage)} | Moy. 200j : $${fmt(sd.twoHundredDayAverage)}`,
    `Capitalisation : ${fmtB(p.marketCap)} | Bêta : ${fmt(sd.beta)}`,
    `VALORISATION`,
    `PER trailing : ${fmt(sd.trailingPE)}x | PER forward : ${fmt(sd.forwardPE)}x | Prix/Livre : ${fmt(ks.priceToBook)}x`,
    `ANALYSTES (${fd.numberOfAnalystOpinions} opinions) : ${fd.recommendationKey}`,
    `Objectif médian : $${fmt(fd.targetMedianPrice)} | Fourchette : $${fmt(fd.targetLowPrice)} – $${fmt(fd.targetHighPrice)}`,
    `FINANCES`,
    `CA : ${fmtB(fd.totalRevenue)} | Croissance : ${pct(fd.revenueGrowth)}`,
    `Marge nette : ${pct(fd.profitMargins)} | Marge brute : ${pct(fd.grossMargins)}`,
    `FCF : ${fmtB(fd.freeCashflow)} | ROE : ${pct(fd.returnOnEquity)} | Dette/FP : ${fmt(fd.debtToEquity)}x`,
    `EPS : $${fmt(ks.trailingEps)} → $${fmt(ks.forwardEps)} (forward)`,
    `Dividende : $${fmt(sd.dividendRate)}/an (${pct(sd.dividendYield)})`,
  ].join(' ');

  try {
    const res = await fetch(WEBHOOK_AI, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input_as_text })
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    const json = await res.json();
    const output = json?.output || json?.data?.output || [];
    const msgBlock = output.find(o => o.type === 'message');
    const text = msgBlock?.content?.find(c => c.type === 'output_text')?.text
      || json?.output_text
      || json?.data?.output_text
      || (typeof json === 'string' ? json : null);

    if (!text) throw new Error('Réponse vide');

    aiText.innerHTML = renderMarkdown(text);
    extractVerdict(text);

  } catch (e) {
    aiText.innerHTML = `<span style="color:var(--red)">Erreur : ${e.message}</span>`;
  } finally {
    aiBtn.disabled = false;
  }
}
