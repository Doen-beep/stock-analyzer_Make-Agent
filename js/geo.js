/* api/geo.js | v1.0 | 2026-05-25 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Récupérer l'IP du visiteur depuis les headers
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.headers['x-real-ip']
      || req.socket?.remoteAddress
      || '';

    // Appel géolocalisation depuis le serveur Vercel (pas de CORS)
    const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,org,timezone,query`);
    const geo = await geoRes.json();

    if (geo.status !== 'success') {
      return res.status(200).json({ ip, city: 'Unknown', country: 'Unknown', country_code: '', org: '', timezone: '' });
    }

    res.status(200).json({
      ip: geo.query || ip,
      city: geo.city || 'Unknown',
      country: geo.country || 'Unknown',
      country_code: (geo.countryCode || '').toLowerCase(),
      org: geo.org || '',
      timezone: geo.timezone || '',
    });

  } catch(e) {
    res.status(200).json({ ip: '', city: 'Unknown', country: 'Unknown', country_code: '', org: '', timezone: '' });
  }
}
