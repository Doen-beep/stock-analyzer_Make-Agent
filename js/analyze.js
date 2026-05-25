/* analyze.js | v2.8 | 2026-05-24 */
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
  status.textContent = 'Loading ' + ticker + '…';

  try {
    const res = await fetch(WEBHOOK + '?symbol=' + encodeURIComponent(ticker) + '&region=' + getRegion(ticker));
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    if (text.trim() === 'Accepted') throw new Error('Make webhook not ready — please retry');
    let json;
    try { json = JSON.parse(text); } catch(e) { throw new Error('Invalid response: ' + text.slice(0, 50)); }
    const data = json.data || json;
    if (!data.price) throw new Error('Invalid data received');

    lastData = data;
    // Enregistrer dans l'historique
    const p = data.price || {};
    const currency = p.currency || 'USD';
    const cs = {'USD':'$','EUR':'€','GBP':'£','CHF':'CHF ','CAD':'CA$','JPY':'¥','KRW':'₩','SGD':'S$','INR':'₹'}[currency] || currency+' ';
    addToHistory(p.symbol || ticker, p.shortName || ticker, p.regularMarketPrice, cs);
    status.className = 'status';
    status.textContent = '✓ ' + ticker + ' · ' + new Date().toLocaleTimeString('fr-FR');
    render(data);
  } catch (e) {
    status.className = 'status';
    status.textContent = '';
    errorEl.textContent = 'Error: ' + e.message;
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
  aiText.innerHTML = '<span style="color:var(--muted);font-style:italic">Analyzing…</span>';

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

    if (!text) throw new Error('Empty response');

    aiText.innerHTML = renderMarkdown(text);
    const verdict = extractVerdict(text);
    // Afficher le bouton watchlist et stocker le verdict
    const wlBtn = document.getElementById('wlBtn');
    if (wlBtn) {
      wlBtn.style.display = 'block';
      wlBtn.classList.remove('added');
      wlBtn.textContent = '+ Ajouter à la watchlist';
      window._lastVerdict = verdict;
    }

  } catch (e) {
    aiText.innerHTML = `<span style="color:var(--red)">Error: ${e.message}</span>`;
  } finally {
    aiBtn.disabled = false;
  }
}

function addCurrentToWatchlist() {
  if (!lastData || !window._lastVerdict) return;
  const isUpdate = addToWatchlist(lastData, window._lastVerdict);
  const wlBtn = document.getElementById('wlBtn');
  if (wlBtn) {
    wlBtn.classList.add('added');
    wlBtn.textContent = isUpdate ? '✓ Watchlist Updated' : '✓ Added to Watchlist';
  }
  updateWlCount();
  setTimeout(() => showWatchlistTab(), 800);
}

async function claudeAnalyze() { return gptAnalyze(); }

async function gptAnalyze() {
  if (!lastData) return;

  const gptBtn = document.getElementById('gptBtn');
  const aiBlock = document.getElementById('aiBlock');
  const aiText = document.getElementById('aiText');

  if (!aiBlock || !aiText) { console.error('aiBlock or aiText not found'); return; }
  if (gptBtn) gptBtn.disabled = true;
  // Bandeau d'attente simple
  const waitSteps = [
    { icon: '🔍', text: 'Searching for company moat, management quality and competitive advantages...' },
    { icon: '📊', text: 'Retrieving 10 years of financial history — revenue, FCF, margins, ROIC...' },
    { icon: '🧮', text: 'Normalizing earnings over a full business cycle...' },
    { icon: '💡', text: 'Running DCF and Owner Earnings valuation models...' },
    { icon: '⚖️', text: 'Comparing intrinsic value to current market price...' },
    { icon: '📝', text: 'Writing final verdict and scorecard...' },
  ];

  aiBlock.style.display = 'block';
  aiText.innerHTML = '';
  let waitIdx = 0;

  function renderWait() {
    return '<div style="border:1px solid var(--border);border-radius:8px;overflow:hidden;">' +
      waitSteps.map((s, i) => {
        const active = i === waitIdx;
        const done = i < waitIdx;
        return '<div style="display:flex;align-items:center;gap:12px;padding:12px 18px;' +
          'border-bottom:' + (i < waitSteps.length-1 ? '0.5px solid var(--border)' : 'none') + ';' +
          'background:' + (active ? 'rgba(169,144,255,0.08)' : 'none') + ';' +
          'opacity:' + (done ? '0.4' : active ? '1' : '0.3') + ';">' +
          '<span style="font-size:16px;">' + (done ? '✓' : s.icon) + '</span>' +
          '<span style="font-size:13px;color:' + (active ? 'var(--text)' : 'var(--muted)') + ';' +
          'font-weight:' + (active ? '500' : '400') + ';">' + s.text + '</span>' +
          (active ? '<span style="margin-left:auto;font-family:var(--mono);font-size:11px;color:var(--accent);">running...</span>' : '') +
          '</div>';
      }).join('') +
      '<div style="padding:10px 18px;font-family:var(--mono);font-size:11px;color:var(--muted);border-top:0.5px solid var(--border);">This analysis searches 10 years of financial data — please wait 30-60 seconds</div>' +
      '</div>';
  }

  aiText.innerHTML = renderWait();
  const waitTimer = setInterval(() => {
    waitIdx = Math.min(waitIdx + 1, waitSteps.length - 1);
    aiText.innerHTML = renderWait();
  }, 9000);
  window._gptStepTimer = waitTimer;

  try {
    // Envoyer données compactes pour respecter la limite de tokens
    const p  = lastData.price || {};
    const sd = lastData.summaryDetail || {};
    const fd = lastData.financialData || {};
    const ks = lastData.defaultKeyStatistics || {};
    const currency = p.currency || 'USD';
    const cs = {'USD':'$','EUR':'€','GBP':'£','CHF':'CHF ','CAD':'CA$'}[currency] || currency+' ';

    const compactData = {
      ticker: p.symbol,
      name: p.shortName,
      currency,
      price: p.regularMarketPrice,
      marketCap: p.marketCap,
      peTrailing: sd.trailingPE,
      peForward: sd.forwardPE,
      priceToBook: ks.priceToBook,
      beta: sd.beta,
      week52High: sd.fiftyTwoWeekHigh,
      week52Low: sd.fiftyTwoWeekLow,
      revenue: fd.totalRevenue,
      revenueGrowth: fd.revenueGrowth,
      netMargin: fd.profitMargins,
      grossMargin: fd.grossMargins,
      operatingMargin: fd.operatingMargins,
      freeCashflow: fd.freeCashflow,
      debtToEquity: fd.debtToEquity,
      roe: fd.returnOnEquity,
      roa: fd.returnOnAssets,
      eps: ks.trailingEps,
      epsForward: ks.forwardEps,
      bookValuePerShare: ks.bookValue,
      sharesOutstanding: ks.sharesOutstanding,
      dividendRate: sd.dividendRate,
      dividendYield: sd.dividendYield,
      targetMedianPrice: fd.targetMedianPrice,
      targetLowPrice: fd.targetLowPrice,
      targetHighPrice: fd.targetHighPrice,
      analystCount: fd.numberOfAnalystOpinions,
      recommendation: fd.recommendationKey,
      earningsHistory: (lastData.earnings?.financialsChart?.yearly || []).map(y => ({
        year: y.date, revenue: y.revenue, earnings: y.earnings
      })),
    };

    const res = await fetch(VERCEL_URL + '/api/openai-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: p.symbol || '', marketData: compactData }),
    });

    if (window._gptStepTimer) { clearInterval(window._gptStepTimer); window._gptStepTimer = null; }
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const json = await res.json();
    if (json.error) throw new Error(json.error);
    const fullText = json.text || '';
    if (!fullText) throw new Error('Empty response from OpenAI');

    aiText.innerHTML = renderMarkdown(fullText);
    if (typeof updateScorecard === 'function') updateScorecard(fullText);
    window._lastVerdict = extractVerdict(fullText);
    const wlBtn = document.getElementById('wlBtn');
    if (wlBtn) { wlBtn.style.display = 'block'; wlBtn.classList.remove('added'); wlBtn.textContent = '+ Add to Watchlist'; }

  } catch(e) {
    if (window._gptStepTimer) { clearInterval(window._gptStepTimer); window._gptStepTimer = null; }
    aiText.innerHTML = '<span style="color:var(--red)">Error: ' + e.message + '</span>';
  } finally {
    if (gptBtn) gptBtn.disabled = false;
  }
}

async function claudeOnlyAnalyze() {
  if (!lastData) return;

  const claudeBtn = document.getElementById('claudeBtn');
  const aiBlock = document.getElementById('aiBlock');
  const aiText = document.getElementById('aiText');

  claudeBtn.disabled = true;
  aiBlock.style.display = 'block';
  aiText.innerHTML = '<span style="color:var(--muted);font-style:italic">🧪 Claude Buffett analysis running...</span>';

  const p = lastData.price || {};
  const sd = lastData.summaryDetail || {};
  const fd = lastData.financialData || {};
  const ks = lastData.defaultKeyStatistics || {};
  const currency = p.currency || 'USD';
  const cs = {'USD':'$','EUR':'€','GBP':'£','CHF':'CHF ','CAD':'CA$'}[currency] || currency+' ';

  const compactData = {
    ticker: p.symbol, name: p.shortName, currency,
    price: p.regularMarketPrice, marketCap: p.marketCap,
    peTrailing: sd.trailingPE, peForward: sd.forwardPE,
    priceToBook: ks.priceToBook, beta: sd.beta,
    revenue: fd.totalRevenue, revenueGrowth: fd.revenueGrowth,
    netMargin: fd.profitMargins, freeCashflow: fd.freeCashflow,
    debtToEquity: fd.debtToEquity, roe: fd.returnOnEquity,
    eps: ks.trailingEps, epsForward: ks.forwardEps,
    bookValuePerShare: ks.bookValue, sharesOutstanding: ks.sharesOutstanding,
    dividendRate: sd.dividendRate, targetMedianPrice: fd.targetMedianPrice,
    recommendation: fd.recommendationKey,
  };

  try {
    const res = await fetch(VERCEL_URL + '/api/buffett-analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticker: p.symbol || '', marketData: compactData }),
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    if (window._gptStepTimer) { clearInterval(window._gptStepTimer); window._gptStepTimer = null; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    aiText.innerHTML = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'text') { fullText += event.content; aiText.innerHTML = renderMarkdown(fullText); }
          else if (event.type === 'tool_call') aiText.innerHTML += '<div class="ai-tool-call">⚙️ ' + event.tool + '...</div>';
          else if (event.type === 'error') throw new Error(event.message);
          else if (event.type === 'done') { extractVerdict(fullText); const wlBtn = document.getElementById('wlBtn'); if (wlBtn) wlBtn.style.display = 'block'; }
        } catch(e) { if (e.message !== 'Unexpected end of JSON input') console.warn('SSE:', e); }
      }
    }
  } catch(e) {
    document.getElementById('aiText').innerHTML = '<span style="color:var(--red)">Claude Error: ' + e.message + '</span>';
  } finally {
    claudeBtn.disabled = false;
  }
}
