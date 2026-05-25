/* render.js | v1.8 | 2026-05-24 */

// Tooltip helper
function tip(text) {
  return `<span class="tip" title="${text}">?</span>`;
}

function render(d) {
  const p  = d.price || {};
  const sd = d.summaryDetail || {};
  const fd = d.financialData || {};
  const ks = d.defaultKeyStatistics || {};

  const sym   = p.symbol || '—';
  const name  = p.shortName || sym;
  const price = p.regularMarketPrice;
  const chg   = p.regularMarketChange;
  const currency = p.currency || sd.currency || 'USD';
  const cs = {'USD':'$','EUR':'€','GBP':'£','CHF':'CHF ','CAD':'CA$','JPY':'¥','HKD':'HK$','AUD':'A$'}[currency] || currency+' ';

  document.getElementById('card').innerHTML = `
    <div class="card-header">
      <div class="ticker-name">
        <h2>${sym}</h2>
        <p>${name}</p>
        ${recBadge(fd.recommendationKey)}
      </div>
      <div class="price-block">
        <div class="price">${cs}${fmt(price)}</div>
        <div class="change ${cc(chg)}">${chg >= 0 ? '+' : ''}${fmt(chg)} (${pct(p.regularMarketChangePercent)})</div>
        ${p.postMarketPrice ? `<div class="change ${cc(p.postMarketChange)}" style="font-size:11px;margin-top:2px">After-hours ${cs}${fmt(p.postMarketPrice)} ${p.postMarketChange >= 0 ? '+' : ''}${fmt(p.postMarketChange)}</div>` : ''}
      </div>
    </div>

    <div class="grid">
      <div class="section"><h3>Session</h3>
        <div class="row"><span class="label">Open ${tip('Opening price at market open today')}</span><span class="val">${cs}${fmt(p.regularMarketOpen)}</span></div>
        <div class="row"><span class="label">Volume ${tip('Number of shares traded today')}</span><span class="val">${fmtM(p.regularMarketVolume)}</span></div>
        <div class="row"><span class="label">Avg Vol. 3M ${tip('Average daily volume over the past 3 months')}</span><span class="val">${fmtM(sd.averageVolume)}</span></div>
        ${rbar(p.regularMarketDayLow, p.regularMarketDayHigh, price)}
      </div>

      <div class="section"><h3>52 Weeks</h3>
        <div class="row"><span class="label">High ${tip('Highest price reached in the past 52 weeks')}</span><span class="val up">${cs}${fmt(sd.fiftyTwoWeekHigh)}</span></div>
        <div class="row"><span class="label">Low ${tip('Lowest price reached in the past 52 weeks')}</span><span class="val down">${cs}${fmt(sd.fiftyTwoWeekLow)}</span></div>
        <div class="row"><span class="label">Perf. ${tip('Price performance over the past 52 weeks')}</span><span class="val ${cc(ks['52WeekChange'])}">${pct(ks['52WeekChange'])}</span></div>
        ${rbar(sd.fiftyTwoWeekLow, sd.fiftyTwoWeekHigh, price)}
      </div>

      <div class="section"><h3>Valuation</h3>
        <div class="row"><span class="label">Mkt Cap ${tip('Total market value of all shares (price × shares outstanding)')}</span><span class="val">${fmtB(p.marketCap)}</span></div>
        <div class="row"><span class="label">P/E Trailing ${tip('Price divided by earnings per share over the last 12 months. Lower = cheaper.')}</span><span class="val">${fmt(sd.trailingPE)}x</span></div>
        <div class="row"><span class="label">P/E Forward ${tip('Price divided by expected earnings per share next year. Lower = cheaper.')}</span><span class="val">${fmt(sd.forwardPE)}x</span></div>
        <div class="row"><span class="label">Price/Book ${tip('Price compared to the company book value. Below 1 may indicate undervaluation.')}</span><span class="val">${fmt(ks.priceToBook)}x</span></div>
        <div class="row"><span class="label">Beta ${tip('Measures volatility vs the market. Above 1 = more volatile than the market.')}</span><span class="val">${fmt(sd.beta)}</span></div>
      </div>

      <div class="section"><h3>Analysts (${fd.numberOfAnalystOpinions || '—'})</h3>
        <div class="row"><span class="label">Consensus ${tip('Average recommendation from professional analysts')}</span><span class="val">${fd.recommendationKey || '—'}</span></div>
        <div class="row"><span class="label">Target (median) ${tip('Median price target from analysts over the next 12 months')}</span><span class="val">${cs}${fmt(fd.targetMedianPrice)}</span></div>
        <div class="row"><span class="label">Upside ${tip('Potential gain if the stock reaches the analysts median target')}</span><span class="val ${price && fd.targetMedianPrice && fd.targetMedianPrice > price ? 'up' : 'down'}">${price && fd.targetMedianPrice ? pct((fd.targetMedianPrice - price) / price) : '—'}</span></div>
        <div class="row"><span class="label">Range ${tip('Low to high price target range from all analysts')}</span><span class="val">${cs}${fmt(fd.targetLowPrice)}–${cs}${fmt(fd.targetHighPrice)}</span></div>
      </div>

      <div class="section"><h3>Financials</h3>
        <div class="row"><span class="label">Revenue ${tip('Total sales revenue over the last 12 months')}</span><span class="val">${fmtB(fd.totalRevenue)}</span></div>
        <div class="row"><span class="label">Revenue Growth ${tip('Year-over-year growth in total revenue')}</span><span class="val ${cc(fd.revenueGrowth)}">${pct(fd.revenueGrowth)}</span></div>
        <div class="row"><span class="label">Net Margin ${tip('Percentage of revenue kept as profit after all expenses')}</span><span class="val ${cc(fd.profitMargins)}">${pct(fd.profitMargins)}</span></div>
        <div class="row"><span class="label">Free Cash Flow ${tip('Cash generated after paying for operations and investments. Key for Buffett analysis.')}</span><span class="val">${fmtB(fd.freeCashflow)}</span></div>
        <div class="row"><span class="label">Debt/Equity ${tip('Ratio of total debt to shareholder equity. High ratio = more financial risk.')}</span><span class="val">${fmt(fd.debtToEquity)}x</span></div>
      </div>

      <div class="section"><h3>Dividend & Ownership</h3>
        <div class="row"><span class="label">Dividend ${tip('Annual dividend paid per share to shareholders')}</span><span class="val">${cs}${fmt(sd.dividendRate)}/yr</span></div>
        <div class="row"><span class="label">Yield ${tip('Dividend as a percentage of the current share price')}</span><span class="val">${pct(sd.dividendYield)}</span></div>
        <div class="row"><span class="label">EPS Trailing ${tip('Earnings per share over the last 12 months')}</span><span class="val">${cs}${fmt(ks.trailingEps)}</span></div>
        <div class="row"><span class="label">EPS Forward ${tip('Expected earnings per share over the next 12 months')}</span><span class="val">${cs}${fmt(ks.forwardEps)}</span></div>
        <div class="row"><span class="label">Institutions ${tip('Percentage of shares held by institutional investors (funds, banks)')}</span><span class="val">${pct(ks.heldPercentInstitutions)}</span></div>
      </div>
    </div>

    <div class="ai-btn-wrap" id="aiBtnWrap">
      <button class="ai-btn" id="gptBtn" onclick="gptAnalyze()">🚀 Deep Analysis with GPT-4.1</button>
      <button class="ai-btn" id="claudeBtn" onclick="claudeOnlyAnalyze()" style="border-color:#e8a87c;color:#e8a87c;margin-top:8px;">🧪 Analyze with Claude (Beta)</button>
      <button class="wl-btn" id="wlBtn" onclick="addCurrentToWatchlist()" style="display:none;">+ Add to Watchlist</button>
    </div>
    <div class="ai-block" id="aiBlock">
      <h3>AI ANALYSIS</h3>
      <div class="ai-text" id="aiText"></div>
    </div>
  `;

  document.getElementById('card').style.display = 'block';
  document.getElementById('aiBtnWrap').style.display = 'block';
}
