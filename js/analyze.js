/* analyze.js | v2.2 | 2026-05-24 */
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
    const json = await res.json();
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

  const claudeBtn = document.getElementById('claudeBtn');
  const aiBlock = document.getElementById('aiBlock');
  const aiText = document.getElementById('aiText');

  claudeBtn.disabled = true;
  aiBlock.style.display = 'block';
  // Bandeau d'attente animé
  const steps = [
    '🔍 Searching for qualitative data — moat, management, competitive advantages...',
    '📊 Retrieving 10-year financial history — revenue, FCF, margins...',
    '🧮 Calculating normalized FCF and ROIC over full cycle...',
    '💡 Running DCF and Owner Earnings valuation models...',
    '⚖️ Comparing intrinsic value to current price...',
    '📝 Writing final verdict and scorecard...',
  ];
  let stepIdx = 0;

  function renderWaitBanner() {
    return `
      <div id="waitBanner" style="border:1px solid var(--border);border-radius:6px;padding:20px 24px;margin-bottom:8px;">
        <div style="font-family:var(--mono);font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);margin-bottom:12px;">
          🚀 GPT-4.1 Deep Analysis Running...
        </div>
        <div id="waitStep" style="font-size:14px;color:var(--text);margin-bottom:16px;">${steps[0]}</div>
        <div style="height:4px;background:var(--border);border-radius:2px;overflow:hidden;">
          <div id="waitBar" style="height:100%;background:var(--accent);border-radius:2px;width:0%;"></div>
        </div>
        <div style="font-size:12px;color:var(--muted);margin-top:10px;">Searching 10 years of financial data — please wait 30-60 seconds</div>
      </div>`;
  }

  aiBlock.style.display = 'block';
  aiText.innerHTML = renderWaitBanner();

  // Démarrer l'animation après le rendu
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const bar = document.getElementById('waitBar');
      if (bar) { bar.style.transition = 'width 55s linear'; bar.style.width = '90%'; }
    });
  });

  const stepTimer = setInterval(() => {
    stepIdx = (stepIdx + 1) % steps.length;
    const el = document.getElementById('waitStep');
    if (el) el.textContent = steps[stepIdx];
  }, 9000);
  window._gptStepTimer = stepTimer;

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
      body: JSON.stringify({
        ticker: p.symbol || '',
        marketData: compactData,
      }),
    });

    if (!res.ok) throw new Error('HTTP ' + res.status);

    // Lire le stream SSE
    if (window._gptStepTimer) { clearInterval(window._gptStepTimer); window._gptStepTimer = null; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    aiText.innerHTML = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'text') {
            fullText += event.content;
            aiText.innerHTML = renderMarkdown(fullText);
          } else if (event.type === 'tool_call') {
            aiText.innerHTML += '<div class="ai-tool-call">⚙️ ' + event.tool + '...</div>';
          } else if (event.type === 'error') {
            throw new Error(event.message);
          } else if (event.type === 'done') {
            extractVerdict(fullText);
            const wlBtn = document.getElementById('wlBtn');
            if (wlBtn) wlBtn.style.display = 'block';
          }
        } catch(e) {
          if (e.message !== 'Unexpected end of JSON input') console.warn('SSE parse error:', e);
        }
      }
    }

  } catch(e) {
    document.getElementById('aiText').innerHTML = '<span style="color:var(--red)">Claude Error: ' + e.message + '</span>';
  } finally {
    claudeBtn.disabled = false;
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
