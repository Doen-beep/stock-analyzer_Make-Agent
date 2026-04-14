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
      <div class="section"><h3>Séance</h3>
        <div class="row"><span class="label">Ouverture</span><span class="val">${cs}${fmt(p.regularMarketOpen)}</span></div>
        <div class="row"><span class="label">Volume</span><span class="val">${fmtM(p.regularMarketVolume)}</span></div>
        <div class="row"><span class="label">Vol. moy. 3M</span><span class="val">${fmtM(sd.averageVolume)}</span></div>
        ${rbar(p.regularMarketDayLow, p.regularMarketDayHigh, price)}
      </div>
      <div class="section"><h3>52 semaines</h3>
        <div class="row"><span class="label">Plus haut</span><span class="val up">${cs}${fmt(sd.fiftyTwoWeekHigh)}</span></div>
        <div class="row"><span class="label">Plus bas</span><span class="val down">${cs}${fmt(sd.fiftyTwoWeekLow)}</span></div>
        <div class="row"><span class="label">Perf.</span><span class="val ${cc(ks['52WeekChange'])}">${pct(ks['52WeekChange'])}</span></div>
        ${rbar(sd.fiftyTwoWeekLow, sd.fiftyTwoWeekHigh, price)}
      </div>
      <div class="section"><h3>Valorisation</h3>
        <div class="row"><span class="label">Capi.</span><span class="val">${fmtB(p.marketCap)}</span></div>
        <div class="row"><span class="label">PER trailing</span><span class="val">${fmt(sd.trailingPE)}x</span></div>
        <div class="row"><span class="label">PER forward</span><span class="val">${fmt(sd.forwardPE)}x</span></div>
        <div class="row"><span class="label">Prix/Livre</span><span class="val">${fmt(ks.priceToBook)}x</span></div>
        <div class="row"><span class="label">Bêta</span><span class="val">${fmt(sd.beta)}</span></div>
      </div>
      <div class="section"><h3>Analystes (${fd.numberOfAnalystOpinions || '—'})</h3>
        <div class="row"><span class="label">Recommandation</span><span class="val">${fd.recommendationKey || '—'}</span></div>
        <div class="row"><span class="label">Objectif médian</span><span class="val">${cs}${fmt(fd.targetMedianPrice)}</span></div>
        <div class="row"><span class="label">Potentiel</span><span class="val ${price && fd.targetMedianPrice && fd.targetMedianPrice > price ? 'up' : 'down'}">${price && fd.targetMedianPrice ? pct((fd.targetMedianPrice - price) / price) : '—'}</span></div>
        <div class="row"><span class="label">Fourchette</span><span class="val">${cs}${fmt(fd.targetLowPrice)}–${cs}${fmt(fd.targetHighPrice)}</span></div>
      </div>
      <div class="section"><h3>Finances</h3>
        <div class="row"><span class="label">CA</span><span class="val">${fmtB(fd.totalRevenue)}</span></div>
        <div class="row"><span class="label">Croissance CA</span><span class="val ${cc(fd.revenueGrowth)}">${pct(fd.revenueGrowth)}</span></div>
        <div class="row"><span class="label">Marge nette</span><span class="val ${cc(fd.profitMargins)}">${pct(fd.profitMargins)}</span></div>
        <div class="row"><span class="label">Free cash-flow</span><span class="val">${fmtB(fd.freeCashflow)}</span></div>
        <div class="row"><span class="label">Dette/FP</span><span class="val">${fmt(fd.debtToEquity)}x</span></div>
      </div>
      <div class="section"><h3>Dividende & actionnariat</h3>
        <div class="row"><span class="label">Dividende</span><span class="val">${cs}${fmt(sd.dividendRate)}/an</span></div>
        <div class="row"><span class="label">Rendement</span><span class="val">${pct(sd.dividendYield)}</span></div>
        <div class="row"><span class="label">EPS trailing</span><span class="val">${cs}${fmt(ks.trailingEps)}</span></div>
        <div class="row"><span class="label">EPS forward</span><span class="val">${cs}${fmt(ks.forwardEps)}</span></div>
        <div class="row"><span class="label">Institutions</span><span class="val">${pct(ks.heldPercentInstitutions)}</span></div>
      </div>
    </div>

    <div class="ai-btn-wrap" id="aiBtnWrap">
      <button class="ai-btn" id="aiBtn" onclick="aiAnalyze()">Analyser avec l'agent IA</button>
    </div>
    <div class="ai-block" id="aiBlock">
      <h3>Analyse IA</h3>
      <div class="ai-text" id="aiText"></div>
    </div>
  `;

  document.getElementById('card').style.display = 'block';
  document.getElementById('aiBtnWrap').style.display = 'block';
}
