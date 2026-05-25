/* api/finance.js | v1.0 | 2026-05-25 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol, region } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });

  try {
    const response = await fetch(
      `https://yahoo-finance-real-time1.p.rapidapi.com/stock/get-summary?symbol=${encodeURIComponent(symbol)}&region=${region || 'US'}`,
      {
        headers: {
          'X-RapidAPI-Key': '80db74e768msh9b00b7e4d3562ddp1a2721jsn35861fb36e34',
          'X-RapidAPI-Host': 'yahoo-finance-real-time1.p.rapidapi.com',
        }
      }
    );

    if (!response.ok) throw new Error('RapidAPI error: ' + response.status);

    const data = await response.json();
    res.status(200).json({ data });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
