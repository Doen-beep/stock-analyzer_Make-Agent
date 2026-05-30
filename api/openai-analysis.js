/* api/openai-analysis.js | v1.6 | 2026-05-25 */

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
⚠️ YOU MUST ACTUALLY PERFORM THE WEB SEARCHES BELOW — DO NOT SKIP THEM.
Do NOT say "I will search" — actually search NOW using your web_search tool.

Required searches (execute ALL of them):
1. Search: "[company name] revenue history 2015 2016 2017 2018 2019 2020 2021 2022 2023 2024"
2. Search: "[company name] free cash flow history annual"
3. Search: "[company name] EBIT margin history"
4. Search: "[company name] ROIC return on invested capital history"
5. Search: "[company name] annual report 2024 financial highlights"

After searches, build a 10-year financial table with actual numbers found.
If current FCF is negative or distorted by cycle, use NORMALIZED FCF based on 10-year average margins.

Present results in a table:
- Revenue CAGR 10Y and 5Y (with actual figures)
- Normalized FCF Margin (10-year average)
- Net Debt / EBITDA
- ROE, ROIC (10-year average)

## PHASE 3 — INTRINSIC VALUE
⚠️ ONLY use figures from your web searches above — NEVER use current distorted figures alone.
⚠️ If FCF is currently negative due to cycle, normalize based on historical margins.

Calculate using 2 methods minimum:
1. DCF on NORMALIZED FCF (10-year projection, show every assumption and calculation)
2. Owner Earnings (NetIncome + D&A - MaintenanceCapex, normalized over 10Y)
3. EV/EBIT multiple if DCF unreliable

Show ALL calculations step by step. No black boxes.

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
  res.setHeader('Content-Type', 'application/json');

  const { ticker, marketData } = req.body;
  if (!ticker) return res.status(400).json({ error: 'ticker required' });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1',
        max_output_tokens: 16000,
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
    const output = result.output || [];
    const msgBlock = output.find(o => o.type === 'message');
    const text = msgBlock?.content?.find(c => c.type === 'output_text')?.text || '';

    if (!text) throw new Error('Empty response from OpenAI');

    // Flag truncation so the client can warn the user instead of showing a
    // half-written analysis with a blank verdict banner.
    const incomplete = result.status === 'incomplete'
      || msgBlock?.status === 'incomplete'
      || result.incomplete_details != null;

    res.status(200).json({ text, incomplete: !!incomplete });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
}
