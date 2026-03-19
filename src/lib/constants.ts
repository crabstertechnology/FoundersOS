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
    title: 'Advisor Equity %',
    desc: 'Stakes allocated to strategic mentors or advisors who provide specialized expertise or industry access. Typically ranges from 0.1% to 1.0% per advisor, depending on their involvement.',
    example: 'You bring on a seasoned SaaS advisor and grant them 0.5% over a 2-year vesting period. This is deducted from Sasitharan\'s primary 100% stake.',
    tipType: 'good',
    tip: 'Never grant advisor equity without a vesting schedule. A 2-year schedule with a 6-month cliff is standard.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Co-Founder Equity %',
    desc: 'The ownership stake held by other active co-founders. In this model, Sasitharan starts at 100%, and co-founder stakes are subtracted to determine the remaining primary ownership.',
    example: 'If Sasitharan brings in a Tech Co-Founder for 30%, the primary stake drops to 70%.',
    tipType: 'warn',
    tip: 'Ensure all co-founders (including yourself) are on a standard 4-year vesting schedule with a 1-year cliff.',
    color: '#1d4ed8'
  },

  // SECTION 2: UNIT ECONOMICS
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'LTV (Lifetime Value)',
    desc: 'The total PROFIT expected from a customer over their entire relationship. Calculated as (Profit per Order × Number of Orders). This is a survival metric.',
    example: 'You make ₹500 profit on every order. A customer orders 10 times. LTV = ₹5,000.',
    tipType: 'good',
    tip: 'Always use Profit-based LTV (Contribution Margin), not Revenue. Revenue-based LTV hides high delivery costs.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'CAC (Acquisition Cost)',
    desc: 'Customer Acquisition Cost: The total Sales + Marketing spend required to acquire one new customer.',
    example: 'You spend ₹50,000 on ads and get 100 customers. CAC = ₹500.',
    tipType: 'warn',
    tip: 'If your CAC is higher than your profit per first order, you need high retention to stay alive.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'LTV:CAC Ratio',
    desc: 'A metric used to determine marketing efficiency. A ratio of 3x or higher is considered healthy for a scaling startup.',
    example: 'LTV ₹3,000 / CAC ₹1,000 = 3x. For every ₹1 spent, you make ₹3 in profit.',
    tipType: 'good',
    tip: 'A ratio below 3x indicates your acquisition is too expensive for the profit generated.',
    color: '#92400e'
  },

  // SECTION 3: FINANCIAL HEALTH
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Monthly Burn Rate',
    desc: 'The net amount of money your startup loses each month (Expenses - Revenue). Used to calculate "Runway".',
    example: 'Expenses: ₹2.5L, Revenue: ₹1L. Net Burn = ₹1.5L/month.',
    tipType: 'warn',
    tip: 'If your burn increases without a proportional increase in growth, you are heading for a "Cash Zero" date.',
    color: '#92400e'
  },

  // SECTION 4: LIQUIDATION & DEAL TERMS
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Preference Multiple',
    desc: 'Determines how many times their capital an investor gets back before anyone else. 1x is standard; 2x means they get double their investment back first.',
    example: 'In a ₹5 Cr exit, an investor with 1x pref on ₹2 Cr takes ₹2 Cr first. The rest is split by equity %.',
    tipType: 'warn',
    tip: '2x or 3x multiples are "dark patterns" and can wipe out common shareholders in small exits.',
    color: '#b91c1c'
  },
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Liquidation Type',
    desc: 'Determines if an investor "double dips". Non-Participating means they choose between their capital OR their % share. Participating means they get BOTH.',
    example: 'Participating preferred allows an investor to take their ₹1 Cr back AND their 20% share of the remainder. This is highly aggressive.',
    tipType: 'warn',
    tip: 'Always push for "Non-Participating" preference. It is the global standard for founder-friendly deals.',
    color: '#b91c1c'
  }
];
