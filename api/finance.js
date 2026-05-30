/* api/finance.js | v1.2 | 2026-05-30 */
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!RAPIDAPI_KEY) return res.status(500).json({ error: 'RAPIDAPI_KEY not configured' });

  const { symbol, region } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const response = await fetch(
      `https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-summary?symbol=${encodeURIComponent(symbol)}&region=${region || 'US'}`,
      {
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': 'yahoo-finance-real-time1.p.rapidapi.com',
        }
      }
    );

    const raw = await response.text();

    // Diagnostic visible dans les logs Vercel
    console.log('[finance]', JSON.stringify({ symbol, region: region || 'US', status: response.status, len: raw.length }));

    if (!response.ok) {
      // 404 / pas de données → message clair, pas un 500
      if (response.status === 404 || response.status === 400) {
        return res.status(404).json({ error: `No data for "${symbol}" (region ${region || 'US'}). Check the ticker symbol.` });
      }
      return res.status(502).json({ error: `Upstream RapidAPI error ${response.status}`, detail: raw.slice(0, 200) });
    }

    let data;
    try { data = JSON.parse(raw); }
    catch { return res.status(502).json({ error: 'Invalid JSON from RapidAPI', detail: raw.slice(0, 200) }); }

    // Réponse OK mais sans prix → ticker probablement inexistant
    const price = data?.price?.regularMarketPrice ?? data?.quoteSummary?.result?.[0]?.price?.regularMarketPrice;
    if (price == null) {
      return res.status(404).json({ error: `No price data for "${symbol}". The ticker may not exist or this market may not be covered.` });
    }

    res.status(200).json({ data });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
