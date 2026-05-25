/* api/test-yf.js | v1.0 | 2026-05-25 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const ticker = req.query.ticker || 'AAPL';

  try {
    const { default: yahooFinance } = await import('yahoo-finance2');

    // Test minimal - juste le prix
    const quote = await yahooFinance.quote(ticker);

    res.status(200).json({
      success: true,
      ticker,
      price: quote.regularMarketPrice,
      currency: quote.currency,
      name: quote.shortName,
    });

  } catch(e) {
    res.status(500).json({
      success: false,
      error: e.message,
      type: e.constructor.name,
    });
  }
}
