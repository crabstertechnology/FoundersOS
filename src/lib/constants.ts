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
    desc: 'Equity is the percentage of your company that you own. It determines your share of proceeds in an exit, your voting power at board meetings, and your economic stake in the business. When you raise money, you trade equity for cash.',
    example: 'Crabster Technology has 1 crore total shares. Sasitharan holds 60 lakh shares. His equity = 60%. If Crabster is acquired for ₹10 Cr, Sasitharan receives ₹6 Cr (60%) before any liquidation preferences are calculated.',
    tipType: 'warn',
    tip: 'Founders commonly give 20-30% at seed. Model the full dilution path across 3 rounds BEFORE accepting any investment.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Advisor Equity %',
    desc: 'Equity stakes allocated to strategic mentors or advisors who provide specialized expertise, industry connections, or high-level guidance. These are typically small percentages (0.1% to 1%).',
    example: 'Crabster grants a senior IoT expert 0.5% equity for attending monthly strategy sessions and introducing them to 3 major school distributors.',
    tipType: 'good',
    tip: 'Always subject advisor equity to a 2-year vesting schedule to ensure long-term commitment.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Co-Founder Equity %',
    desc: 'The percentage of ownership held by individuals who started the company alongside the primary founder. These stakes should be split based on contribution, risk, and roles.',
    example: 'Two co-founders split equity 60/40 based on one leading sales and the other leading product development from Day 1.',
    tipType: 'warn',
    tip: 'Ensure all co-founders have a 4-year vesting schedule with a 1-year cliff to protect the company from early departures.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Dilution',
    desc: 'When new shares are created and issued—to investors, ESOP pool, or advisors—the total share count grows. Your existing share count stays fixed, but your percentage of the total shrinks.',
    example: 'You own 60% of a company. You raise seed funding and issue new shares to an investor. Your 60% might become 50% even though you didn\'t sell any of your own shares.',
    tipType: 'warn',
    tip: 'Anti-dilution protection for investors compensates them in a down round—diluting YOU further. Always model your equity trail.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Vesting Schedule',
    desc: 'Vesting means you earn your own shares over time rather than owning them all on Day 1. Standard: 4-year vesting with a 1-year cliff.',
    example: 'Co-founder holds 15% on a 4-year vest. Exits at month 10 → receives 0 shares. Exits at month 18 → earned 25% of their total stake.',
    tipType: 'good',
    tip: 'Always negotiate double-trigger acceleration: if the company is acquired, all unvested shares vest immediately.',
    color: '#1d4ed8'
  },

  // SECTION 2: SHARES & LIQUIDATION
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Preference Multiple',
    desc: 'The multiplier applied to an investor\'s capital in an exit. 1x is standard; 2x means investors get double their capital back before founders get anything.',
    example: 'Investor puts in ₹50L with a 2x multiple. Company sells for ₹80L. Investor takes all ₹80L (they were owed ₹1Cr). Founders receive ₹0.',
    tipType: 'warn',
    tip: 'Avoid multiples higher than 1x. Higher multiples can wipe out founders in mediocre exits.',
    color: '#b91c1c'
  },
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Liquidation Type (Participating vs Non-Participating)',
    desc: 'Non-participating is founder-friendly (investor picks capital back OR their % share). Participating is a "double dip" (investor takes capital back AND their % share).',
    example: 'In a ₹10Cr exit, a participating clause could transfer an extra ₹1.5Cr+ from your pocket directly to the investor.',
    tipType: 'dark',
    tip: 'Always push for "Non-Participating". Most Indian VCs try to slip in participation; smart founders strike it out.',
    color: '#b91c1c'
  },

  // SECTION 3: VALUATION & ECONOMICS
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Monthly Burn Rate',
    desc: 'The net amount of money your startup loses each month. Calculated as: Total Monthly Expenses - Total Monthly Revenue.',
    example: 'Crabster spends ₹2.5L and earns ₹1L. Monthly Burn = ₹1.5L. If they have ₹15L in bank, their runway is 10 months.',
    tipType: 'warn',
    tip: 'Start fundraising with 12+ months of runway. Desperation is visible to investors and it costs you equity.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Average LTV (Lifetime Value)',
    desc: 'Lifetime Value: The total revenue expected per customer over their entire relationship with your company.',
    example: 'A student buys a ₹2,500 kit and then ₹5,000 in expansion packs over 2 years. The LTV is ₹7,500.',
    tipType: 'good',
    tip: 'High LTV justifies higher customer acquisition costs. Track your customer churn to improve this metric.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Average CAC (Customer Acquisition Cost)',
    desc: 'Customer Acquisition Cost: The total sales and marketing spend required to acquire one new customer.',
    example: 'You spend ₹10,000 on social ads and get 20 new customers. Your CAC is ₹500.',
    tipType: 'good',
    tip: 'Target an LTV:CAC ratio of 3x or higher. If CAC is ₹1,000, LTV should be at least ₹3,000 for a sustainable business.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Pre-Money vs Post-Money',
    desc: 'Pre-money is valuation before investment. Post-money is after. Post-money = Pre-money + Investment.',
    example: 'Pre-money: ₹4 Cr. Investment: ₹1 Cr. Post-money = ₹5 Cr. Investor owns 20% (1/5).',
    tipType: 'warn',
    tip: 'Investor ownership is always calculated on post-money. Don\'t give away an extra 5% by mistake.',
    color: '#92400e'
  },

  // SECTION 4: DARK PATTERNS
  {
    tag: 'darkpattern',
    label: 'Dark Pattern',
    title: 'Full Ratchet Anti-Dilution',
    desc: 'The most predatory anti-dilution clause. It wipes out founders in a valuation reset (down round).',
    example: 'In a 50% down round, full ratchet can double the investor\'s share count at YOUR direct expense.',
    tipType: 'dark',
    tip: 'This is a deal-breaker. Walk away if an investor insists on Full Ratchet. It destroys founder motivation.',
    color: '#000000'
  }
];
