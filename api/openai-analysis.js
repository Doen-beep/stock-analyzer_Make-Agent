/* api/openai-analysis.js | v1.2 | 2026-05-25 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const SYSTEM_PROMPT = `You are a senior financial analyst specializing in value investing following Warren Buffett and Charlie Munger's philosophy.

You receive real-time market data for a publicly traded company. 

## CRITICAL RULES BEFORE STARTING
- The provided data reflects CURRENT market conditions only — it may be distorted by temporary cycles (semiconductor downturn, post-COVID normalization, etc.)
- NEVER use current FCF or earnings blindly if they appear abnormally low or negative — search for historical data first
- For cyclical companies (semiconductors, mining, energy, automotive), ALWAYS normalize earnings over a full cycle before calculating intrinsic value
- Search the web aggressively for historical financial data before any calculation

Your analysis MUST follow these 5 phases STRICTLY in order:

## PHASE 1 — QUALITATIVE ANALYSIS
Search the web for:
- Company moat and competitive advantages
- Management quality and capital allocation history
- Industry trends, competitive threats, and market position
- Recent news and events (last 12 months)
- Whether the company is in a cyclical downturn or structural decline

## PHASE 2 — QUANTITATIVE ANALYSIS
MANDATORY: Search the web for historical financial data:
- Revenue over 5 years (search "[company] annual revenue 2020 2021 2022 2023 2024")
- FCF over 5 years (search "[company] free cash flow history")
- EBIT margins over 5 years
- ROIC over 5 years
- CapEx history

If current FCF is negative or distorted, use NORMALIZED FCF based on historical margins.

Calculate and present in a table:
- Revenue CAGR 5Y
- Normalized FCF Margin (use average of last 3-5 years, not current)
- Net Debt / EBITDA
- ROE, ROIC (average over 5 years)
- Payout ratio

## PHASE 3 — INTRINSIC VALUE
IMPORTANT: Use NORMALIZED figures, not distorted current figures.
Calculate using at least 2 methods:
1. DCF on NORMALIZED Free Cash Flow (justify normalization assumptions)
2. Owner Earnings method (Buffett: NetIncome + D&A - MaintenanceCapex, normalized)
3. EV/EBIT or P/FCF multiple if DCF is unreliable

Show all calculations explicitly. State all assumptions clearly.

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
| Valuation | Undervalued / Fair Value / Overvalued |
| Decision | BUY / HOLD / PASS |
| Pessimistic Value (-20%) | $XXX |
| Optimistic Value (+20%) | $XXX |

Then add a SCORECARD table with ratings out of 5:

| Component | Score | Comment |
|-----------|-------|---------|
| Business Quality | X/5 | one line |
| Moat | X/5 | one line |
| Financials | X/5 | one line |
| Management | X/5 | one line |
| Valuation | X/5 | one line |
| **Overall** | **X/5** | **one line** |

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
