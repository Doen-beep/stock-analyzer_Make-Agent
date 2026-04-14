export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol requis' });

  try {
    const { default: yahooFinance } = await import('yahoo-finance2');

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
      ]
    });

    res.status(200).json({ data: { ...data, symbol } });

  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
