import yahooFinance from 'yahoo-finance2';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { symbol, region } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol requis' });

  try {
    const [quote, financials] = await Promise.all([
      yahooFinance.quoteSummary(symbol, {
        modules: [
          'price',
          'summaryDetail',
          'financialData',
          'defaultKeyStatistics',
          'earnings',
        ]
      }),
      yahooFinance.quoteSummary(symbol, {
        modules: [
          'incomeStatementHistory',
          'cashflowStatementHistory',
          'balanceSheetHistory',
        ]
      }).catch(() => ({}))
    ]);

    res.status(200).json({
      data: {
        ...quote,
        ...financials,
        symbol,
      }
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
