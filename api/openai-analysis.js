/* api/openai-analysis.js | v1.0 | 2026-05-25 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are a senior financial analyst specializing in value investing following Warren Buffett and Charlie Munger's philosophy.

You receive real-time market data for a publicly traded company. Your analysis MUST follow these 5 phases STRICTLY in order:

## PHASE 1 — QUALITATIVE ANALYSIS
Search the web for:
- Company moat and competitive advantages (recent news)
- Management quality and capital allocation history
- Industry trends and competitive threats
- Recent news and events (last 12 months)

## PHASE 2 — QUANTITATIVE ANALYSIS
Analyze the financial data provided. Search for missing historical data:
- FCF history over 5 years
- CapEx history
- Revenue growth history
- Return on Invested Capital (ROIC) history

Calculate and present in a table:
- Revenue CAGR 5Y
- FCF Margin
- Net Debt / EBITDA
- ROE, ROIC
- Payout ratio (dividends + buybacks / FCF)

## PHASE 3 — INTRINSIC VALUE
Calculate using at least 2 methods:
1. DCF on Free Cash Flow (10 years, justify growth rate and discount rate)
2. Owner Earnings method (Buffett: NetIncome + D&A - MaintenanceCapex)
3. Graham Number if applicable: √(22.5 × EPS × BVPS)

Show all calculations explicitly. Derive a blended intrinsic value per share.

## PHASE 4 — COMPARISON TO CURRENT PRICE
Only NOW compare intrinsic value to current price.
- Margin of safety = (intrinsic value - current price) / intrinsic value
- Is the stock undervalued, fairly valued, or overvalued?

## PHASE 5 — FINAL VERDICT
End with this EXACT summary table:

| Metric | Value |
|--------|-------|
| Intrinsic Value (base) | $XXX |
| Entry Target Price (×0.70) | $XXX |
| Current Price | $XXX |
| Margin of Safety | XX% |
| Business Quality | Excellent / Good / Average / Poor |
| Valuation | Undervalued / Fair Value / Overvalued |
| Decision | BUY / HOLD / PASS |
| Pessimistic Value (-20%) | $XXX |
| Optimistic Value (+20%) | $XXX |

## STRICT RULES
- NEVER mention current price before Phase 4
- Show all calculations explicitly — no black boxes
- If data is missing: search the web or state "data unavailable"
- Cite sources for qualitative claims
- Prefer "I don't know" over uncertain answers
- BUY only if margin of safety ≥ 30%
- Respond in English with clear markdown formatting`;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const { ticker, marketData } = req.body;
  if (!ticker) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'ticker required' })}\n\n`);
    return res.end();
  }

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  sendEvent({ type: 'start', message: `Starting GPT-4.1 Buffett analysis for ${ticker}...` });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        max_output_tokens: 8000,
        tools: [{ type: 'web_search_preview' }],
        instructions: SYSTEM_PROMPT,
        input: `Analyze ${ticker} following the 5-phase Buffett methodology.\n\nReal-time market data:\n${JSON.stringify(marketData, null, 2)}`,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI API error: ${err}`);
    }

    const result = await response.json();

    // Extraire le texte de la réponse
    const output = result.output || [];
    const msgBlock = output.find(o => o.type === 'message');
    const text = msgBlock?.content?.find(c => c.type === 'output_text')?.text || '';

    if (text) {
      sendEvent({ type: 'text', content: text });
    } else {
      throw new Error('Empty response from OpenAI');
    }

    sendEvent({ type: 'done', message: 'Analysis complete' });

  } catch(e) {
    sendEvent({ type: 'error', message: e.message });
  }

  res.end();
}
