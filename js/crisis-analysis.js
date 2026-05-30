/* api/crisis-analysis.js | v1.0 | 2026-05-30 */

export const config = { maxDuration: 60 };

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are a senior value investor specializing in EVENT-DRIVEN / CONTRARIAN investing — buying quality companies hit by a temporary shock when the market overreacts. Your single job is to answer one question rigorously:

**Is the price drop an UNJUSTIFIED DISCOUNT (opportunity) or a REAL DECLINE (value trap)?**

You receive: a company's current market data, and a CRISIS CONTEXT provided by the user (e.g. "Korea governance crisis", "Iran-Gulf conflict", "SaaS selloff").

You MUST use web search to gather: (1) how far the stock has fallen and over what period, (2) the company's financial history BEFORE the shock (revenue, margins, FCF, debt over the last several years), (3) the nature and likely duration of the crisis context.

Then apply this decision grid STRICTLY, in order:

## STEP 1 — THE SHOCK: TEMPORARY OR STRUCTURAL?
Classify the crisis: is it a passing event (panic, contagion, sentiment, one-off) or a permanent change (technological disruption, lost competitive advantage, obsolete business model)? Ask: "In 5 years, will this be a memory or a worsened reality?"

## STEP 2 — HAVE THE FUNDAMENTALS ACTUALLY MOVED?
Compare the magnitude of the PRICE drop to the magnitude of the FUNDAMENTALS change. Did revenue, margins, FCF, ROIC actually deteriorate, or did ONLY the stock price fall? If the company still earns roughly the same but the stock dropped 30%+ by contagion → signal of unjustified discount.

## STEP 3 — CAN THE BALANCE SHEET SURVIVE?
Assess debt, cash, FCF. A low-debt, cash-generating company SURVIVES the crisis and emerges stronger. A highly-leveraged one may not survive to the recovery → discount may be justified or insufficient.

## STEP 4 — CAUSE: THE COMPANY OR ITS ENVIRONMENT?
Did the stock fall because of the company itself (its own loans rotting, its product failing) or because of its environment (the country/sector "looks scary" while the company's numbers are intact)? Environmental contagion on intact fundamentals = classic unjustified discount.

## STEP 5 — THE VALUE-TRAP CHECK
Explicitly warn if this looks like a value trap: cheap (low P/E, below historical average) BUT earnings are structurally declining, so it stays cheap while falling further. A low P/E is NEVER a reason to buy on its own — earnings must be intact or recovering.

## FINAL VERDICT
End with a summary table in this EXACT format:

| Dimension | Assessment |
|-----------|------------|
| Crisis type | Temporary / Structural |
| Price drop | ~XX% over [period] |
| Fundamentals | Intact / Mildly hit / Seriously deteriorated |
| Balance sheet | Survives easily / Tight / At risk |
| Cause | Environmental contagion / Company-specific |
| Verdict | UNJUSTIFIED DISCOUNT / AMBIGUOUS / VALUE TRAP |
| Conviction | High / Medium / Low |

## RULES
- Be honest and skeptical. Most "obvious" opportunities are not. Beware hindsight bias.
- If data is missing or unreliable (common for small/exotic markets), SAY SO explicitly and lower conviction — do not fabricate history.
- Distinguishing temporary from structural in real time is genuinely uncertain. Acknowledge this.
- Never give a definitive buy recommendation; this is decision-support, not financial advice.
- Respond in French, with markdown formatting.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { ticker, marketData, crisisContext } = req.body;
  if (!ticker) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'ticker required' })}\n\n`);
    return res.end();
  }
  if (!crisisContext || !crisisContext.trim()) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'crisisContext required' })}\n\n`);
    return res.end();
  }

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  sendEvent({ type: 'start', message: `Analyse de crise pour ${ticker}...` });

  try {
    const messages = [{
      role: 'user',
      content: `Analyse cette valeur sous l'angle décote injustifiée vs vrai déclin.\n\n`
        + `CONTEXTE DE CRISE (fourni par l'utilisateur) : ${crisisContext}\n\n`
        + `Données de marché actuelles :\n${JSON.stringify(marketData, null, 2)}\n\n`
        + `Utilise la recherche web pour récupérer l'historique financier AVANT le choc et le contexte de la crise, puis applique la grille en 5 étapes.`
    }];

    // web_search est un outil natif côté serveur Anthropic : le modèle effectue
    // ses recherches et produit sa réponse finale dans le même appel. Pas de
    // boucle manuelle d'aller-retour d'outils nécessaire (même pattern que
    // buffett-analysis.js).
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        tools: [
          { type: 'web_search_20250305', name: 'web_search', max_uses: 8 },
        ],
        messages,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Anthropic API error: ${err}`);
    }

    const result = await response.json();

    for (const block of result.content) {
      if (block.type === 'text' && block.text) {
        sendEvent({ type: 'text', content: block.text });
      } else if (block.type === 'server_tool_use' || block.type === 'tool_use') {
        sendEvent({ type: 'tool_call', tool: 'web_search', input: block.input });
      }
    }

    sendEvent({ type: 'done', message: 'Analyse terminée' });

  } catch(e) {
    sendEvent({ type: 'error', message: e.message });
  }

  res.end();
}
