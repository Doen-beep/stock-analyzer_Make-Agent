export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol requis' });

  try {
    // Log version info pour debug
    const yf = await import('yahoo-finance2');
    console.log('yf keys:', Object.keys(yf));
    console.log('yf.default type:', typeof yf.default);
    console.log('yf.default keys:', yf.default ? Object.keys(yf.default).slice(0,5) : 'null');

    const yahooFinance = yf.default;
    const data = await yahooFinance.quoteSummary(symbol, {
      modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics', 'earnings']
    });

    res.status(200).json({ data: { ...data, symbol } });

  } catch (e) {
    console.error('Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}
