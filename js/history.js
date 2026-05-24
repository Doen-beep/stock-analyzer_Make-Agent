/* history.js | v1.6 | 2026-05-24 */

const SUPABASE_URL = 'https://qxqnxobfsdeqhfanphdo.supabase.co';
const SUPABASE_KEY = 'sb_publishable_KwmWQJ7mAXWRPX03aW2Bvw_aDhwo6O6';

let sessionStartTime = Date.now();
let sessionId = null;

async function supabaseCall(method, table, body, filters) {
  filters = filters || '';
  const res = await fetch(SUPABASE_URL + '/rest/v1/' + table + filters, {
    method: method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) throw new Error(await res.text());
  if (method === 'DELETE' || method === 'PATCH') return null;
  return res.json();
}

function addToHistory(ticker, name, price, currency) {
  // Enregistrer la consultation dans la session courante
  // (la session est déjà créée par initSession)
  console.log('Consulted:', ticker, name, price);
}

async function initSession() {
  try {
    const geo = await fetch('https://ipapi.co/json/').then(r => r.json());
    const now = new Date();
    const session = {
      ip: geo.ip || 'unknown',
      city: geo.city || 'unknown',
      country: geo.country_name || 'unknown',
      country_code: (geo.country_code || '').toLowerCase(),
      date: now.toLocaleDateString('fr-FR'),
      time: now.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'}),
      duration_seconds: 0,
    };
    const result = await supabaseCall('POST', 'sessions', session);
    if (result && result[0]) sessionId = result[0].id;
    setInterval(updateSessionDuration, 30000);
    window.addEventListener('beforeunload', updateSessionDuration);
  } catch(e) {
    console.warn('Session init error:', e.message);
  }
}

async function updateSessionDuration() {
  if (!sessionId) return;
  const duration = Math.round((Date.now() - sessionStartTime) / 1000);
  try {
    await supabaseCall('PATCH', 'sessions?id=eq.' + sessionId, { duration_seconds: duration });
  } catch(e) { console.warn('Session update error:', e); }
}

function updateHistoryCount() {}

async function renderHistory() {
  const container = document.getElementById('historyContent');
  if (!container) return;
  container.innerHTML = '<div style="text-align:center;padding:32px;color:var(--muted);font-size:13px;">Chargement\u2026</div>';

  try {
    const sessions = await supabaseCall('GET', 'sessions', null, '?order=created_at.desc&limit=100');

    if (!sessions || !sessions.length) {
      container.innerHTML = '<div style="text-align:center;padding:64px 24px;color:var(--muted);font-size:13px;">Aucune session enregistr\u00e9e.</div>';
      return;
    }

    const grouped = {};
    sessions.forEach(function(s) {
      if (!grouped[s.date]) grouped[s.date] = [];
      grouped[s.date].push(s);
    });

    let html = '';
    Object.entries(grouped).forEach(function([date, entries]) {
      html += '<div class="hist-group"><div class="hist-date">' + date + ' \u2014 ' + entries.length + ' session' + (entries.length > 1 ? 's' : '') + '</div>';
      entries.forEach(function(s) {
        const flag = s.country_code ? '<img src="https://flagcdn.com/16x12/' + s.country_code + '.png" style="width:16px;height:12px;border-radius:2px;margin-right:6px;vertical-align:middle;">' : '';
        const mins = Math.floor((s.duration_seconds || 0) / 60);
        const secs = (s.duration_seconds || 0) % 60;
        const duration = mins > 0 ? mins + ' min ' + secs + 's' : (s.duration_seconds || 0) + 's';
        html += '<div class="hist-row">';
        html += '<div class="hist-left">' + flag + '<span class="hist-ticker">' + (s.city || '—') + '</span><span class="hist-name">' + (s.country || '—') + '</span></div>';
        html += '<div class="hist-right"><span class="hist-price">' + duration + '</span><span class="hist-time">' + (s.time || '—') + '</span></div>';
        html += '</div>';
      });
      html += '</div>';
    });

    html += '<div class="wl-footer"><span class="tiny muted">' + sessions.length + ' session' + (sessions.length > 1 ? 's' : '') + ' total</span></div>';
    container.innerHTML = html;

  } catch(e) {
    container.innerHTML = '<div style="padding:24px;color:var(--red);font-size:13px;">Error: ' + e.message + '</div>';
  }
}

function showHistoryTab() {
  document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('tab-active'); });
  document.getElementById('tabHistory').classList.add('tab-active');
  document.getElementById('analyzeView').style.display = 'none';
  document.getElementById('watchlistView').style.display = 'none';
  document.getElementById('historyView').style.display = 'flex';
  renderHistory();
}
