/* api/buffett-analysis.js | v1.4 | 2026-05-25 */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function calculate_dcf({ fcf, growth_rate, terminal_growth, discount_rate, years, shares_outstanding }) {
  if (!fcf || !shares_outstanding) return { error: 'Missing required parameters' };
  const g = Math.min(growth_rate || 0.05, 0.15);
  const tg = Math.min(terminal_growth || 0.03, 0.05);
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

function calculate_graham({ eps, book_value_per_share }) {
  if (!eps || !book_value_per_share) return { error: 'Missing EPS or BVPS' };
  if (eps <= 0) return { error: 'Graham Number requires positive EPS', eps, book_value_per_share };
  if (book_value_per_share <= 0) return { error: 'Graham Number requires positive BVPS', eps, book_value_per_share };
  const graham = Math.sqrt(22.5 * eps * book_value_per_share);
  return {
    graham_number: Math.round(graham * 100) / 100,
    formula: `√(22.5 × ${eps} × ${book_value_per_share})`,
    eps, book_value_per_share,
  };
}

function calculate_owner_earnings({ net_income, depreciation, capex, delta_working_capital, shares_outstanding, multiple_low, multiple_high }) {
  if (!net_income || !shares_outstanding) return { error: 'Missing required parameters' };
  const maintenance_capex = capex ? capex * 0.7 : 0;
  const owner_earnings = net_income + (depreciation || 0) - maintenance_capex - (delta_working_capital || 0);
  const oe_per_share = owner_earnings / shares_outstanding;
  const low = multiple_low || 12;
  const high = multiple_high || 18;
  return {
    owner_earnings,
    owner_earnings_per_share: Math.round(oe_per_share * 100) / 100,
    value_range_low: Math.round(oe_per_share * low * 100) / 100,
    value_range_high: Math.round(oe_per_share * high * 100) / 100,
    breakdown: { net_income, depreciation: depreciation || 0, maintenance_capex: Math.round(maintenance_capex), delta_working_capital: delta_working_capital || 0 },
    multiples_used: { low, high },
  };
}

const CUSTOM_TOOLS = [
  {
    name: 'calculate_dcf',
    description: 'Calculate DCF valuation over 10 years with terminal value. Returns value per share and detailed breakdown.',
    input_schema: {
      type: 'object',
      properties: {
        fcf: { type: 'number', description: 'Free Cash Flow (most recent annual)' },
        growth_rate: { type: 'number', description: 'Expected annual FCF growth rate (e.g. 0.08 for 8%), max 15%' },
        terminal_growth: { type: 'number', description: 'Terminal growth rate (e.g. 0.03), max 5%' },
        discount_rate: { type: 'number', description: 'Discount rate / WACC (e.g. 0.09)' },
        years: { type: 'number', description: 'Projection years (default 10)' },
        shares_outstanding: { type: 'number', description: 'Total shares outstanding' },
      },
      required: ['fcf', 'shares_outstanding'],
    },
  },
  {
    name: 'calculate_graham',
    description: 'Calculate Graham Number: √(22.5 × EPS × BVPS).',
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
    description: 'Calculate Owner Earnings (Buffett method): NetIncome + D&A - MaintenanceCapex - ΔWorkingCapital.',
    input_schema: {
      type: 'object',
      properties: {
        net_income: { type: 'number', description: 'Net income (annual)' },
        depreciation: { type: 'number', description: 'Depreciation & Amortization (annual)' },
        capex: { type: 'number', description: 'Total CapEx (annual, positive value)' },
        delta_working_capital: { type: 'number', description: 'Change in working capital' },
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
Run web searches on: company moat, competitive advantages, management quality, industry trends, recent news.

## PHASE 2 — QUANTITATIVE ANALYSIS
Analyze the financial data provided. Search for missing historical data (FCF history, CapEx, D&A, equity).

## PHASE 3 — INTRINSIC VALUE (NO PRICE COMPARISON YET)
MANDATORY: Use calculate_dcf, calculate_graham, and calculate_owner_earnings tools.
Derive a blended intrinsic value per share.

## PHASE 4 — COMPARISON TO CURRENT PRICE
Only NOW compare intrinsic value to current price.
Margin of safety = (intrinsic value - current price) / intrinsic value

## PHASE 5 — FINAL VERDICT
- Business quality: Excellent / Good / Average / Poor
- Valuation: Undervalued / Fair Value / Overvalued
- Decision: BUY (margin ≥ 30%) / HOLD / PASS
- Entry target = intrinsic value × 0.70
- Pessimistic (-20%) and optimistic (+20%) scenarios

## RULES
- NEVER mention current price before Phase 4
- ALL valuations MUST use the calculation tools
- If data missing: search web or state "data unavailable"
- Respond in English with markdown formatting`;

function executeTool(name, input) {
  if (name === 'calculate_dcf') return calculate_dcf(input);
  if (name === 'calculate_graham') return calculate_graham(input);
  if (name === 'calculate_owner_earnings') return calculate_owner_earnings(input);
  return { error: 'Unknown tool' };
}

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

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  sendEvent({ type: 'start', message: `Starting Buffett analysis for ${ticker}...` });

  try {
    const messages = [{
      role: 'user',
      content: `Please analyze ${ticker} following the 5-phase Buffett methodology.\n\nReal-time market data:\n${JSON.stringify(marketData, null, 2)}`
    }];

    let continueLoop = true;
    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (continueLoop && iterations < MAX_ITERATIONS) {
      iterations++;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          system: SYSTEM_PROMPT,
          tools: [
            { type: 'web_search_20250305', name: 'web_search', max_uses: 3 },
            ...CUSTOM_TOOLS,
          ],
          messages,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Anthropic API error: ${err}`);
      }

      const result = await response.json();

      // Ajouter la réponse assistant à l'historique
      messages.push({ role: 'assistant', content: result.content });

      // Collecter tous les tool_use blocks et préparer les tool_results
      const toolUseBlocks = result.content.filter(b => b.type === 'tool_use');
      const toolResults = [];

      for (const block of result.content) {
        if (block.type === 'text' && block.text) {
          sendEvent({ type: 'text', content: block.text });
        } else if (block.type === 'tool_use') {
          sendEvent({ type: 'tool_call', tool: block.name, input: block.input });

          // Exécuter les outils custom seulement
          if (block.name !== 'web_search') {
            const toolResult = executeTool(block.name, block.input);
            sendEvent({ type: 'tool_result', tool: block.name, result: toolResult });
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(toolResult),
            });
          }
          // web_search est géré nativement par Anthropic — pas de tool_result à envoyer
        }
      }

      // Si Claude a utilisé des outils custom, envoyer tous les results en un seul message
      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
        continueLoop = true; // Continuer pour que Claude reçoive les résultats
      } else if (result.stop_reason === 'tool_use') {
        // Claude veut utiliser des outils mais tous sont natifs (web_search)
        // Pas besoin d'envoyer tool_results, Anthropic les gère
        continueLoop = false;
      } else {
        continueLoop = false;
      }
    }

    sendEvent({ type: 'done', message: 'Analysis complete' });

  } catch(e) {
    sendEvent({ type: 'error', message: e.message });
  }

  res.end();
}
