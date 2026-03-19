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
    example: 'Crabster Technology has 1 crore total shares. Sasitharan holds 60 lakh shares. His equity = 60%. If Crabster is acquired for Rs. 10 Cr, Sasitharan receives Rs. 6 Cr (60%) before any liquidation preferences.',
    tipType: 'warn',
    tip: 'Founders commonly give 20-30% at seed. Model the full dilution path across 3 rounds BEFORE accepting any investment.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Dilution',
    desc: 'When new shares are created and issued, the total share count grows. Your existing share count stays fixed, but your percentage of the total shrinks. You never "lose" shares -- the denominator just gets larger.',
    example: 'You own 600 of 1,000 shares (60%). You raise seed and issue 200 new shares. Now you own 600 of 1,200 (50%). Over 3 rounds: 60% → 48% → 38% → 31%.',
    tipType: 'warn',
    tip: 'Anti-dilution protection for investors compensates them in a down round by issuing more shares -- diluting YOU further.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Vesting Schedule',
    desc: 'Vesting means you earn your own shares over time. Standard structure: 4-year vesting with a 1-year cliff. The cliff means if you leave before 12 months, you receive zero shares.',
    example: 'Co-founder holds 15% on 4-year vest/1-year cliff. Exits at month 10 → receives 0 shares. Exits at month 18 → earned 25% of their total stake.',
    tipType: 'good',
    tip: 'Always negotiate double-trigger acceleration: if the company is acquired, all unvested shares vest immediately.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'ESOP Pool',
    desc: 'A pool of shares reserved for future hires. Investors typically require this pool be created BEFORE they invest (Pre-money ESOP), which dilutes only the founders.',
    example: 'Creating a 10% pool pre-investment dilutes a 60% founder to 54.5% before the investor even puts in a rupee.',
    tipType: 'warn',
    tip: 'Always push for post-money ESOP creation -- create the pool AFTER the investment valuation is set to share the dilution.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Cap Table',
    desc: 'A structured list of every shareholder, their share type (Common, Preference, ESOP), and exact ownership percentage. The single source of truth for ownership.',
    example: 'Sasitharan 50%, Co-founder 15%, Angel 15%, ESOP 12%, Advisor 2%, Partners 6%. Total = 100%.',
    tipType: 'good',
    tip: 'Use professional software or a CA-maintained sheet from Day 1. Retroactively fixing a messy cap table is expensive.',
    color: '#1d4ed8'
  },

  // SECTION 2: SHARES
  {
    tag: 'shares',
    label: 'Shares',
    title: 'Preference Shares',
    desc: 'Shares held by investors that carry special rights like liquidation preference and anti-dilution protection. They are paid first in an exit.',
    example: 'In a Rs. 40 lakh exit where an investor has a Rs. 50 lakh preference, the investor takes all Rs. 40 lakh. Founders get Rs. 0.',
    tipType: 'warn',
    tip: 'Avoid multiples higher than 1x. Higher multiples can wipe out founders in mediocre exits.',
    color: '#b91c1c'
  },
  {
    tag: 'shares',
    label: 'Shares',
    title: 'DVR Shares',
    desc: 'Differential Voting Rights allow founders to retain majority control (e.g., 10 votes per share) even as their economic ownership dilutes.',
    example: 'Sasi holds 25% equity but 10x DVR rights. He controls 77% of votes, preventing hostile takeovers.',
    tipType: 'good',
    tip: 'DVR structures must be set up at incorporation. It is much harder to implement post-investment.',
    color: '#b91c1c'
  },

  // SECTION 3: VALUATION & TRACTION
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Pre-Money vs Post-Money',
    desc: 'Pre-money is value before investment. Post-money = Pre-money + Investment. Ownership is always calculated on Post-money.',
    example: 'Pre-money: Rs. 4 Cr. Investment: Rs. 1 Cr. Post-money = Rs. 5 Cr. Investor owns 1/5 = 20% (not 25%).',
    tipType: 'warn',
    tip: 'Miscalculating this is the most common math error founders make, often accidentally giving away 5% extra.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Monthly Burn Rate',
    desc: 'The net amount of money your startup loses each month (Expenses - Revenue). Determines how fast you run out of cash.',
    example: 'Spend Rs. 2.5L, Earn Rs. 1L. Burn = Rs. 1.5L/month. With Rs. 15L in bank, runway is 10 months.',
    tipType: 'warn',
    tip: 'Start fundraising with 12+ months of runway. Desperation is visible to investors.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Unit Economics (CAC & LTV)',
    desc: 'CAC is what it costs to get a customer. LTV is how much they spend over their lifetime. Goal: LTV > 3x CAC.',
    example: 'Spend Rs. 54,000 to get 45 customers (CAC = Rs. 1,200). Each spends Rs. 8,000 (LTV). Ratio = 6.7x.',
    tipType: 'good',
    tip: 'Target an LTV:CAC ratio of 3x or higher. If CAC is Rs. 1,000, LTV should be at least Rs. 3,000.',
    color: '#92400e'
  },

  // SECTION 4: TERM SHEET
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Liquidation Preference',
    desc: 'Determines who gets paid first in an exit. 1x Non-participating is the standard founder-friendly term.',
    example: 'With participating preference, investors "double-dip" by taking their capital back AND their % of the remainder.',
    tipType: 'dark',
    tip: 'Always push for "Non-Participating". Most Indian VCs try to slip in participation; smart founders strike it out.',
    color: '#b91c1c'
  },
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Drag-Along Rights',
    desc: 'Allows majority shareholders to force minority shareholders to sell the company. Protects investors wanting an exit.',
    example: 'Investors with 51% vote to sell for Rs. 5 Cr. Drag-along forces Sasi to sell his 49% even if he disagrees.',
    tipType: 'warn',
    tip: 'Require drag-along to trigger ONLY if BOTH majority investors AND majority founders approve the sale.',
    color: '#b91c1c'
  },

  // SECTION 5: DARK PATTERNS
  {
    tag: 'darkpattern',
    label: 'Dark Pattern',
    title: 'Full Ratchet Anti-Dilution',
    desc: 'A predatory clause that adjusts the investor\'s price to the lowest future round, wiping out founder equity in a down round.',
    example: 'In a 50% down round, full ratchet can double the investor\'s share count at YOUR direct expense.',
    tipType: 'dark',
    tip: 'This is a deal-breaker. Walk away if an investor insists on Full Ratchet. Use "Weighted Average" instead.',
    color: '#000000'
  },
  {
    tag: 'darkpattern',
    label: 'Dark Pattern',
    title: 'Founder Removal Clause',
    desc: 'Allows investors to fire the founder as CEO via board majority, regardless of how much equity the founder holds.',
    example: 'Investors control 3 of 5 board seats. They vote to remove the founder after one bad quarter.',
    tipType: 'dark',
    tip: 'Require CEO removal to need a 75% board supermajority AND founder director consent.',
    color: '#000000'
  }
];
