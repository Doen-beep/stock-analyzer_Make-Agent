const yahooFinance = require('yahoo-finance2').default;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol requis' });

  try {
    const data = await yahooFinance.quoteSummary(symbol, {
      modules: [
        'price',
        'summaryDetail',
        'financialData',
        'defaultKeyStatistics',
        'earnings',
        'incomeStatementHistory',
        'cashflowStatementHistory',
        'balanceSheetHistory',
      ],
      fetchType: 'lazy',
    });

    res.status(200).json({ data: { ...data, symbol } });

  } catch (e) {
    console.error('yahoo-finance2 error:', e.message);
    res.status(500).json({ error: e.message });
  }
};
