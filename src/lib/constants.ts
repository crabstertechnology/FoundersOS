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
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Equity (Ownership %)',
    desc: 'Equity is the percentage of your company that you own. It determines your share of proceeds in an exit, your voting power, and your economic stake.',
    example: 'Crabster Technology has 1 crore total shares. Sasitharan holds 60 lakh shares. Equity = 60%. If Crabster is acquired for ₹10 Cr, Sasitharan receives ₹6 Cr.',
    tipType: 'warn',
    tip: 'Founders commonly give 20-30% at seed. Model the full dilution path across 3 rounds BEFORE taking any money.',
    color: '#1d4ed8'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Pre-Money vs Post-Money',
    desc: 'Pre-money is the valuation before new investment. Post-money is after. Post-money = Pre-money + Investment Amount.',
    example: 'Pre-money: ₹4 Cr. Investment: ₹1 Cr. Post-money = ₹5 Cr. Investor owns 1/5 = 20%.',
    tipType: 'good',
    tip: 'Investor ownership is always calculated on post-money. Don\'t make the math error of giving 25% on a 4Cr pre-money valuation.',
    color: '#92400e'
  },
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Liquidation Preference',
    desc: 'In an exit, preference shareholders are paid first. 1x non-participating means the investor gets their capital back OR their equity percentage, whichever is higher.',
    example: '₹2Cr invested at 1x non-participating. Exit at ₹8Cr. Investor gets ₹2Cr OR 20% (₹1.6Cr) - they pick ₹2Cr.',
    tipType: 'dark',
    tip: 'Avoid participating preferred (double-dip) where the investor gets capital back AND their equity share.',
    color: '#b91c1c'
  }
];