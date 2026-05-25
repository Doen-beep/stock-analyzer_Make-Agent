/* /* api/buffett-analysis.js | v1.0 | 2026-05-25 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Outil DCF
function calculate_dcf({ fcf, growth_rate, terminal_growth, discount_rate, years, shares_outstanding }) {
  if (!fcf || !shares_outstanding) return { error: 'Missing required parameters' };
  
  const g = Math.min(growth_rate || 0.05, 0.15); // Cap à 15%
  const tg = Math.min(terminal_growth || 0.03, 0.05); // Cap à 5%
  const r = discount_rate || 0.09;
  const n = years || 10;

  let pv = 0;
  let breakdown = [];
  let cf = fcf;

  for (let i = 1; i <= n; i++) {
    cf = cf * (1 + g);
    const discounted = cf / Math.pow(1 + r, i);
    pv += discounted;
    breakdown.push({ year: i, fcf: Math.round(cf), pv: Math.round(discounted) });
  }

  const terminal_value = (cf * (1 + tg)) / (r - tg);
  const terminal_pv = terminal_value / Math.pow(1 + r, n);
  const total_value = pv + terminal_pv;
  const value_per_share = total_value / shares_outstanding;

  const warnings = [];
  if (growth_rate > 0.15) warnings.push('Growth rate capped at 15%');
  if (terminal_growth > 0.05) warnings.push('Terminal growth capped at 5%');
  if (fcf < 0) warnings.push('Negative FCF — DCF may not be reliable');

  return {
    value_per_share: Math.round(value_per_share * 100) / 100,
    total_enterprise_value: Math.round(total_value),
    pv_growth_phase: Math.round(pv),
    pv_terminal_value: Math.round(terminal_pv),
    breakdown,
    assumptions: { fcf, growth_rate: g, terminal_growth: tg, discount_rate: r, years: n },
    warnings,
  };
}

// Outil Graham Number
function calculate_graham({ eps, book_value_per_share }) {
  if (!eps || !book_value_per_share) return { error: 'Missing EPS or BVPS' };
  if (eps <= 0) return { error: 'Graham Number requires positive EPS', eps, book_value_per_share };
  if (book_value_per_share <= 0) return { error: 'Graham Number requires positive BVPS', eps, book_value_per_share };
  
  const graham = Math.sqrt(22.5 * eps * book_value_per_share);
  return {
    graham_number: Math.round(graham * 100) / 100,
    formula: `√(22.5 × ${eps} × ${book_value_per_share})`,
    eps,
    book_value_per_share,
  };
}

// Outil Owner Earnings
function calculate_owner_earnings({ net_income, depreciation, capex, delta_working_capital, shares_outstanding, multiple_low, multiple_high }) {
  if (!net_income || !shares_outstanding) return { error: 'Missing required parameters' };

  const maintenance_capex = capex ? capex * 0.7 : 0; // Estimation 70% du capex total
  const owner_earnings = net_income + (depreciation || 0) - maintenance_capex - (delta_working_capital || 0);
  const oe_per_share = owner_earnings / shares_outstanding;
  const low = multiple_low || 12;
  const high = multiple_high || 18;

  return {
    owner_earnings,
    owner_earnings_per_share: Math.round(oe_per_share * 100) / 100,
    value_range_low: Math.round(oe_per_share * low * 100) / 100,
    value_range_high: Math.round(oe_per_share * high * 100) / 100,
    breakdown: {
      net_income,
      depreciation: depreciation || 0,
      maintenance_capex: Math.round(maintenance_capex),
      delta_working_capital: delta_working_capital || 0,
    },
    multiples_used: { low, high },
  };
}

const TOOLS = [
  {
    name: 'web_search',
    type: 'web_search_20250305',
  },
  {
    name: 'calculate_dcf',
    description: 'Calculate DCF valuation over 10 years with terminal value. Returns value per share and detailed breakdown.',
    input_schema: {
      type: 'object',
      properties: {
        fcf: { type: 'number', description: 'Free Cash Flow (most recent annual, in absolute value e.g. 100000000)' },
        growth_rate: { type: 'number', description: 'Expected annual FCF growth rate (e.g. 0.08 for 8%), max 15%' },
        terminal_growth: { type: 'number', description: 'Terminal growth rate (e.g. 0.03 for 3%), max 5%' },
        discount_rate: { type: 'number', description: 'Discount rate / WACC (e.g. 0.09 for 9%)' },
        years: { type: 'number', description: 'Projection years (default 10)' },
        shares_outstanding: { type: 'number', description: 'Total shares outstanding' },
      },
      required: ['fcf', 'shares_outstanding'],
    },
  },
  {
    name: 'calculate_graham',
    description: 'Calculate Graham Number: √(22.5 × EPS × BVPS). Handles negative EPS/BVPS gracefully.',
    input_schema: {
      type: 'object',
      properties: {
        eps: { type: 'number', description: 'Earnings Per Share (trailing 12 months)' },
        book_value_per_share: { type: 'number', description: 'Book Value Per Share' },
      },
      required: ['eps', 'book_value_per_share'],
    },
  },
  {
    name: 'calculate_owner_earnings',
    description: 'Calculate Owner Earnings (Buffett method): NetIncome + D&A - MaintenanceCapex - ΔWorkingCapital. Applies multiple range [12,18] for valuation.',
    input_schema: {
      type: 'object',
      properties: {
        net_income: { type: 'number', description: 'Net income (annual)' },
        depreciation: { type: 'number', description: 'Depreciation & Amortization (annual)' },
        capex: { type: 'number', description: 'Total CapEx (annual, positive value)' },
        delta_working_capital: { type: 'number', description: 'Change in working capital (positive = use of cash)' },
        shares_outstanding: { type: 'number', description: 'Total shares outstanding' },
        multiple_low: { type: 'number', description: 'Low end multiple (default 12)' },
        multiple_high: { type: 'number', description: 'High end multiple (default 18)' },
      },
      required: ['net_income', 'shares_outstanding'],
    },
  },
];

const SYSTEM_PROMPT = `You are a senior financial analyst specializing in value investing following Warren Buffett and Charlie Munger's philosophy.

You receive real-time market data for a publicly traded company. Your analysis MUST follow these 5 phases STRICTLY in order:

## PHASE 1 — QUALITATIVE ANALYSIS
Run web searches on:
- Company moat and competitive advantages
- Management quality and capital allocation history
- Industry trends and competitive threats
- Recent news (last 12 months)

## PHASE 2 — QUANTITATIVE ANALYSIS
Analyze the financial data provided. Calculate:
- Revenue CAGR 5Y
- FCF Margin
- Net Debt / EBITDA
- ROE, ROIC (explain method chosen)
- Payout ratio (dividends + buybacks / FCF)

Run web searches to find historical data missing from the provided data (FCF history, CapEx, D&A, equity history).

## PHASE 3 — INTRINSIC VALUE (NO PRICE COMPARISON YET)
MANDATORY: Use the calculation tools — never do mental arithmetic for valuations.
- Calculate DCF using calculate_dcf tool
- Calculate Graham Number using calculate_graham tool  
- Calculate Owner Earnings using calculate_owner_earnings tool
- Derive a blended intrinsic value per share with justification

## PHASE 4 — COMPARISON TO CURRENT PRICE
Only NOW compare your intrinsic value to the current price.
Calculate: margin of safety = (intrinsic value - current price) / intrinsic value

## PHASE 5 — FINAL VERDICT
- Business quality: Excellent / Good / Average / Poor
- Current valuation: Undervalued / Fair Value / Overvalued
- Decision: BUY (margin of safety ≥ 30%) / HOLD / PASS
- Entry target price (intrinsic value × 0.70 for 30% margin of safety)
- Pessimistic scenario (-20%) and optimistic scenario (+20%)

## STRICT RULES
- NEVER look at or mention the current price before Phase 4
- ALL valuation calculations MUST use the provided tools
- Cite web sources for every qualitative claim
- If data is missing: search the web or explicitly state "data unavailable" — never invent numbers
- Prefer "I don't know" over uncertain answers
- Respond in English with clear markdown formatting
- Use ## for phase headers, tables for financial data`;

export default async function handler(req, res) {
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

  const sendEvent = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent({ type: 'start', message: `Starting Buffett analysis for ${ticker}...` });

  try {
    const messages = [
      {
        role: 'user',
        content: `Please analyze ${ticker} following the 5-phase Buffett methodology.\n\nReal-time market data:\n${JSON.stringify(marketData, null, 2)}`
      }
    ];

    let continueLoop = true;

    while (continueLoop) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 8000,
          system: SYSTEM_PROMPT,
          tools: TOOLS,
          messages,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error: ${err}`);
      }

      const result = await response.json();

      // Traiter la réponse
      for (const block of result.content) {
        if (block.type === 'text') {
          sendEvent({ type: 'text', content: block.text });
        } else if (block.type === 'tool_use') {
          sendEvent({ type: 'tool_call', tool: block.name, input: block.input });

          // Exécuter l'outil custom
          let toolResult;
          if (block.name === 'calculate_dcf') {
            toolResult = calculate_dcf(block.input);
          } else if (block.name === 'calculate_graham') {
            toolResult = calculate_graham(block.input);
          } else if (block.name === 'calculate_owner_earnings') {
            toolResult = calculate_owner_earnings(block.input);
          } else if (block.name === 'web_search') {
            // web_search est géré par Anthropic nativement
            toolResult = null;
          }

          if (toolResult !== null) {
            sendEvent({ type: 'tool_result', tool: block.name, result: toolResult });
            messages.push({ role: 'assistant', content: result.content });
            messages.push({
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: block.id,
                content: JSON.stringify(toolResult),
              }]
            });
          }
        }
      }

      // Ajouter la réponse assistant à l'historique
      if (!messages.find(m => m.content === result.content)) {
        messages.push({ role: 'assistant', content: result.content });
      }

      // Continuer si Claude veut utiliser plus d'outils
      continueLoop = result.stop_reason === 'tool_use';
    }

    sendEvent({ type: 'done', message: 'Analysis complete' });

  } catch(e) {
    sendEvent({ type: 'error', message: e.message });
  }

  res.end();
}
