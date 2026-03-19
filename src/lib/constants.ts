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
    title: 'Dilution',
    desc: 'When new shares are created and issued—to investors, ESOP pool, or advisors—the total share count grows. Your existing share count stays fixed, but your percentage of the total shrinks.',
    example: 'You own 600 of 1,000 shares (60%). You raise seed funding and issue 200 new shares. Now you own 600 of 1,200 (50%). Your shares never changed—the denominator grew.',
    tipType: 'warn',
    tip: 'Anti-dilution protection for investors compensates them in a down round by issuing more shares—diluting YOU further. Always model your equity trail.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Vesting Schedule',
    desc: 'Vesting means you earn your own shares over time rather than owning them all on Day 1. Standard: 4-year vesting with a 1-year cliff.',
    example: 'Co-founder holds 15% equity on a 4-year vest with 1-year cliff. Exits at month 10 → receives 0 shares. Exits at month 18 → earned 6 months post-cliff = 25,000 shares.',
    tipType: 'good',
    tip: 'Always negotiate double-trigger acceleration: if the company is acquired, all unvested shares vest immediately.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'ESOP Pool (Employee Stock Options)',
    desc: 'A pool of shares reserved for future employees. Investors usually require this pool be created BEFORE they invest—which dilutes only the founders.',
    example: 'Crabster creates a 10% ESOP pool pre-investment. Sasi\'s 60% becomes 54.5% before the investor even puts in a rupee. This is "pre-money ESOP".',
    tipType: 'warn',
    tip: 'Push for post-money ESOP creation—create the pool AFTER the investment valuation is set to protect 3-5% of your personal equity.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Cap Table (Capitalization Table)',
    desc: 'A cap table is a structured list of every shareholder, their share type, exact share count, and ownership percentage. It is the single source of truth for ownership.',
    example: 'Crabster cap table: Sasitharan 55%, Co-founder 15%, Angel Investor 15%, ESOP Pool 12%, Advisor 3%. Total = 100%.',
    tipType: 'good',
    tip: 'Use a dedicated CA-maintained spreadsheet or tool like Carta from Day 1. Retroactively fixing a messy cap table costs lakhs in legal fees.',
    color: '#1d4ed8'
  },

  // SECTION 2: SHARES
  {
    tag: 'shares',
    label: 'Shares',
    title: 'Preference Shares',
    desc: 'Shares held by investors that carry special rights like liquidation preference and anti-dilution protection. They are paid before common shareholders.',
    example: 'Seed investor holds 15% with 1x liquidation preference on ₹50L. Exit at ₹40L: investor takes all ₹40L. Founders receive ₹0.',
    tipType: 'warn',
    tip: 'Avoid participating preferred (double-dip) where the investor gets capital back AND their equity share. Stick to 1x non-participating.',
    color: '#16a34a'
  },
  {
    tag: 'shares',
    label: 'Shares',
    title: 'Common vs Preference',
    desc: 'Common shares are held by founders/employees. Preference shares are held by investors. The distinction is critical in small or mediocre exits.',
    example: 'Company sells for ₹3 Cr. Investor has ₹5 Cr in 1x liquidation preference. The entire ₹3 Cr goes to the investor. Founders receive ₹0.',
    tipType: 'warn',
    tip: 'Always negotiate the conversion threshold—the price above which the investor automatically converts to common shares.',
    color: '#16a34a'
  },
  {
    tag: 'shares',
    label: 'Shares',
    title: 'DVR Shares (Voting Rights)',
    desc: 'Differential Voting Rights allow founders to retain majority control (e.g., 10 votes per share) even if their economic ownership is low.',
    example: 'Sasi holds 25% equity but all his shares have 10x DVR. He controls 77% of votes despite having only 25% economic ownership.',
    tipType: 'good',
    tip: 'DVR structure must be set up early. Reference Companies Act 2013 Section 43 when discussing with your CA.',
    color: '#16a34a'
  },

  // SECTION 3: VALUATION & TRACTION
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Pre-Money vs Post-Money',
    desc: 'Pre-money is valuation before investment. Post-money is after. Post-money = Pre-money + Investment.',
    example: 'Pre-money: ₹4 Cr. Investment: ₹1 Cr. Post-money = ₹5 Cr. Investor owns 20% (1/5), not 25% (1/4).',
    tipType: 'warn',
    tip: 'Investor ownership is always calculated on post-money. Don\'t give away an extra 5% by mistake.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Revenue Multiple',
    desc: 'Company value = ARR × Industry Multiple. ARR is monthly revenue × 12. Multiples vary by growth and sector (SaaS: 8-15x, AI: 10-20x).',
    example: 'Crabster MRR = ₹1.5L. ARR = ₹18L. IoT multiple 3x → ₹54L valuation. High growth justifications can double this.',
    tipType: 'good',
    tip: 'Know your sector multiple. At 15% MoM growth, you can justify a forward-revenue premium over current metrics.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Traction',
    desc: 'Measurable evidence that your business works. It converts subjective opinion into objective data for investors.',
    example: '"45 paying schools, ₹1.5L MRR, 15% MoM growth" vs "We believe the market is huge". The former gets a 50% higher valuation.',
    tipType: 'good',
    tip: 'For EZCirkit: track repeat purchases and referral rates obsessively. Data is your strongest negotiating lever.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'TAM / SAM / SOM',
    desc: 'TAM is the total market. SAM is the portion you can reach. SOM is what you can capture in 3-5 years.',
    example: 'TAM: India STEM (₹2000 Cr). SAM: TN Schools (₹150 Cr). SOM: TN Govt/Private schools via partners (₹18 Cr).',
    tipType: 'good',
    tip: 'TN Founders: Cite TANSIM and TIDE grants as tailwinds. It signals deep understanding of the local ecosystem.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Unit Economics (CAC & LTV)',
    desc: 'CAC is cost to acquire a customer. LTV is their lifetime value. Target LTV:CAC > 3x and Payback < 12 months.',
    example: 'CAC ₹1,200. Customer buys ₹2,500 kit + ₹5,500 upgrades. LTV ₹8,000. Ratio = 6.7x. Outstanding metrics.',
    tipType: 'good',
    tip: 'LTV compounds with accessories and bulk school licenses. Track cohort revenue at 6 and 12 months.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Burn Rate & Runway',
    desc: 'Burn is net monthly spend. Runway = Cash / Burn. This determines your fundraising urgency and leverage.',
    example: 'Bank: ₹5L. Net Burn: ₹1L. Runway: 5 months. At 5 months, you MUST start closing a round now.',
    tipType: 'warn',
    tip: 'Start fundraising with 12+ months of runway. Desperation is visible to investors and it costs equity.',
    color: '#92400e'
  },

  // SECTION 4: TERM SHEET
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Liquidation Preference (Non-Participating)',
    desc: 'In an exit, investors get their capital back first. 1x non-participating means they take their money back OR their % share, not both.',
    example: '₹2 Cr invested at 1x. Exit at ₹8 Cr. Investor takes ₹2 Cr preference. Remaining ₹6 Cr goes to founders.',
    tipType: 'good',
    tip: '1x non-participating preferred is the global standard. Any serious VC should accept this without major pushback.',
    color: '#b91c1c'
  },
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Board Composition',
    desc: 'The board controls major decisions like hiring/firing the CEO. Control is more powerful than share ownership.',
    example: 'Red flag: Investor asks for 2 of 3 board seats at seed. They can fire you as CEO at any meeting.',
    tipType: 'warn',
    tip: 'Never give investors board majority pre-Series A. Aim for founder majority or a founder-leaning independent seat.',
    color: '#b91c1c'
  },
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Drag-Along Rights',
    desc: 'Allows majority shareholders to force minority shareholders to sell their shares if a sale is approved.',
    example: 'Investors hold 51% and approved a low-ball sale. Drag-along forces Sasi to sell his 49% even if he objects.',
    tipType: 'warn',
    tip: 'Require drag-along to trigger ONLY if both majority investors AND majority founders approve the sale.',
    color: '#b91c1c'
  },
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'No-Shop / Exclusivity',
    desc: 'Prohibits approaching other investors for a period (usually 30 days) after signing a term sheet.',
    example: '60-day exclusivity wastes time. If the investor drops the valuation on day 59, you have zero leverage.',
    tipType: 'warn',
    tip: 'Cap exclusivity at 30 days. Add a clause that exclusivity voids if material economic terms are changed.',
    color: '#b91c1c'
  },

  // SECTION 5: PROTECTION
  {
    tag: 'protection',
    label: 'Protection',
    title: 'Anti-Dilution (Weighted Average)',
    desc: 'Protects investors in a "down round". Broad-based weighted average is the fair, standard way to calculate this.',
    example: 'Weighted average dilution in a down round might cost you 2% extra equity. Full ratchet would cost 15%.',
    tipType: 'good',
    tip: 'Never accept "Full Ratchet". Weighted average is the only institutional standard you should sign.',
    color: '#7c3aed'
  },
  {
    tag: 'protection',
    label: 'Protection',
    title: 'Founder Authority Levers',
    desc: 'Levers like DVR shares, reserved matters, and super-majority requirements to keep control of your vision.',
    example: 'Requiring 75% board vote to remove the CEO gives the founder an effective veto over their own firing.',
    tipType: 'good',
    tip: 'TN Founders: Register a personal holding company to hold your stake. It provides LTCG tax flexibility later.',
    color: '#7c3aed'
  },

  // SECTION 6: DARK PATTERNS
  {
    tag: 'darkpattern',
    label: 'Dark Pattern',
    title: 'Full Ratchet Anti-Dilution',
    desc: 'The most predatory anti-dilution clause. It wipes out founders in a valuation reset.',
    example: 'In a 50% down round, full ratchet can double the investor\'s share count at YOUR direct expense.',
    tipType: 'dark',
    tip: 'This is a deal-breaker. Walk away if an investor insists on Full Ratchet. It destroys founder motivation.',
    color: '#000000'
  },
  {
    tag: 'darkpattern',
    label: 'Dark Pattern',
    title: 'Participating Preferred',
    desc: 'The "Double-Dip". Investor gets their money back AND their % share of the remainder.',
    example: 'In a ₹10 Cr exit, this clause can transfer ₹1 Cr+ from your pocket directly to the investor.',
    tipType: 'dark',
    tip: 'Push for non-participating. Most Indian VCs try to slip this in; smart founders always strike it out.',
    color: '#000000'
  }
];
