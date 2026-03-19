export const INDUSTRIES = [
  { value: 'iot', label: 'IoT / Hardware', multiple: 3 },
  { value: 'saas', label: 'SaaS / Software', multiple: 8 },
  { value: 'edtech', label: 'EdTech', multiple: 5 },
  { value: 'ecomm', label: 'E-Commerce / D2C', multiple: 2.5 },
  { value: 'fintech', label: 'FinTech', multiple: 7 },
  { value: 'healthtech', label: 'HealthTech', multiple: 6 },
  { value: 'ai', label: 'AI / ML', multiple: 12 },
];

export const STAGES = [
  { value: 'idea', label: 'Idea / Pre-Revenue' },
  { value: 'mvp', label: 'MVP / Early Traction' },
  { value: 'seed', label: 'Seed Stage' },
  { value: 'seriesa', label: 'Series A' },
  { value: 'seriesb', label: 'Series B+' },
];

export const GLOSSARY_ITEMS = [
  // SECTION 1: EQUITY & DILUTION
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Equity (Ownership %)',
    desc: 'Equity is the percentage of your company that you own. It determines your share of proceeds in an exit, your voting power at board meetings, and your economic stake. Every funding round, ESOP grant, and note conversion changes who owns what.',
    example: 'Crabster Technology has a 100% initial stake. Sasitharan grants 10% to a partner. Sasitharan now holds 90%. If Crabster is acquired for Rs. 10 Cr, Sasitharan receives Rs. 9 Cr.',
    tipType: 'warn',
    tip: 'Founders commonly give 20-30% at seed. Model the full dilution path across 3 rounds BEFORE accepting any investment.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Dilution',
    desc: 'The reduction in ownership percentage for existing stakeholders when new equity is issued. In our model, all dilution is calculated by deducting from the Founder\'s 100% stake.',
    example: 'You hold 100%. You grant 15% to an investor. You now hold 85%. You haven\'t "lost" value if the valuation increased, but you own a smaller slice of a larger pie.',
    tipType: 'warn',
    tip: 'Anti-dilution protection for investors compensates them in a down round by issuing more equity -- diluting YOU further.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'ESOP Pool',
    desc: 'A pool of equity reserved for future hires. Investors typically require this pool be created BEFORE they invest, which dilutes only the founders.',
    example: 'Creating a 10% pool pre-investment dilutes a 100% founder to 90% before the investor even puts in a rupee.',
    tipType: 'warn',
    tip: 'A 10-15% pool is standard for seed-stage companies to attract high-quality talent.',
    color: '#1d4ed8'
  },

  // SECTION 2: UNIT ECONOMICS (LTV & CAC)
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'LTV (Lifetime Value)',
    desc: 'The total PROFIT expected from a customer over their entire relationship with your company. Formula: Profit per Order × Number of Orders.',
    example: 'You make Rs. 500 profit on every order. A customer orders 10 times. LTV = Rs. 5,000.',
    tipType: 'good',
    tip: 'Always use Profit-based LTV (Contribution Margin), not Revenue. Revenue-based LTV hides high operational costs.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'CAC (Customer Acquisition Cost)',
    desc: 'The total sales and marketing cost required to acquire one new customer.',
    example: 'You spend Rs. 50,000 on ads and get 100 customers. CAC = Rs. 500.',
    tipType: 'warn',
    tip: 'If your CAC is higher than your profit per first order, you need high retention (repeat orders) to stay alive.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'LTV:CAC Ratio',
    desc: 'A metric used to determine the efficiency of your marketing spend. Target is typically 3x or higher.',
    example: 'LTV of Rs. 3,000 / CAC of Rs. 1,000 = 3x. For every Rs. 1 spent, you make Rs. 3 in profit.',
    tipType: 'good',
    tip: 'A ratio below 3x indicates you are spending too much to acquire customers relative to the profit they generate.',
    color: '#92400e'
  },

  // SECTION 3: FINANCIAL HEALTH
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Monthly Burn Rate',
    desc: 'The net amount of money your startup loses each month (Expenses - Revenue).',
    example: 'Spend Rs. 2.5L, Earn Rs. 1L. Burn = Rs. 1.5L/month.',
    tipType: 'warn',
    tip: 'Monitor this closely. If your burn increases without a proportional increase in growth, you are heading for a "Cash Zero" date.',
    color: '#92400e'
  },

  // SECTION 4: LIQUIDATION & DEAL TERMS
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Liquidation Preference',
    desc: 'Determines who gets paid first in an exit. A 1x multiple means investors get their capital back before anyone else.',
    example: 'In a Rs. 5 Cr exit, an investor with a 1x pref on Rs. 2 Cr takes Rs. 2 Cr first. The remaining Rs. 3 Cr is split by equity %.',
    tipType: 'warn',
    tip: 'Always push for "Non-Participating" preference. "Participating" allows investors to take their capital AND their % share, which is often called "double-dipping".',
    color: '#b91c1c'
  }
];
