/* config.js | v1.2 | 2026-05-25 */

// Base URL Vercel
const VERCEL_URL = 'https://stock-analyzer-make-agent.vercel.app';

// Yahoo Finance — maintenant via Vercel (Make en pause)
const WEBHOOK = VERCEL_URL + '/api/finance';

// URL Analyse IA — Make → OpenAI (en pause, remplacé par VERCEL_URL + /api/openai-analysis)
const WEBHOOK_AI = 'https://hook.eu1.make.com/xhpvfxz13qin7xhr0jx92v5owusxidys';
