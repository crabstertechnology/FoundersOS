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
  // SECTION 1: EQUITY
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Equity (Ownership %)',
    desc: 'Your percentage of the company — determines exit proceeds, voting power, and economic stake. Every funding round, ESOP grant, and note conversion changes who owns what.',
    example: 'Crabster Technology starts at 100%. Sasitharan grants 10% to a partner — Sasitharan now holds 90%. On a Rs. 10 Cr acquisition, Sasitharan receives Rs. 9 Cr.',
    tipType: 'warn',
    tip: 'Founders commonly give 20–30% at seed. Model your full dilution path across 3 rounds BEFORE accepting any investment.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Advisor Equity %',
    desc: 'Stakes allocated to strategic mentors or advisors who provide specialised expertise or industry access. Typically ranges from 0.1% to 1.0% per advisor.',
    example: 'You bring on a seasoned SaaS advisor and grant them 0.5% over a 2-year vesting period. This is deducted from Sasitharan\'s primary 100% stake.',
    tipType: 'good',
    tip: 'Never grant advisor equity without a vesting schedule. A 2-year schedule with a 6-month cliff is standard.',
    color: '#1d4ed8'
  },
  {
    tag: 'equity',
    label: 'Equity',
    title: 'Co-Founder Equity %',
    desc: 'The ownership stake held by other active co-founders. Co-founder stakes are subtracted from the primary founder\'s stake.',
    example: 'If Sasitharan brings in a Tech Co-Founder for 30%, the primary stake drops to 70%.',
    tipType: 'warn',
    tip: 'Ensure all co-founders (including yourself) are on a standard 4-year vesting schedule with a 1-year cliff. No exceptions.',
    color: '#1d4ed8'
  },

  // SECTION 2: CAP TABLE
  {
    tag: 'captable',
    label: 'Cap Table',
    title: 'Pre-Money Valuation',
    desc: 'Your company\'s agreed value BEFORE new investment money enters. The starting price tag used to calculate equity.',
    example: 'Investor offers Rs. 1 Cr for 10%. Pre-money valuation = Rs. 9 Cr. Post-money = Rs. 10 Cr.',
    tipType: 'warn',
    tip: 'Never confuse pre-money and post-money. A Rs. 10 Cr post-money deal at 10% means your company was valued at Rs. 9 Cr before the cheque.',
    color: '#7c3aed'
  },
  {
    tag: 'captable',
    label: 'Cap Table',
    title: 'Post-Money Valuation',
    desc: 'Company value AFTER investment has entered. Formula: Post-money = Pre-money + Investment Amount.',
    example: 'Rs. 9 Cr pre-money + Rs. 1 Cr raised = Rs. 10 Cr post-money. Investor owns 10% (Rs. 1 Cr / Rs. 10 Cr).',
    tipType: 'good',
    tip: 'Your equity % at any round = Investment divided by Post-money valuation. Simple math that founders often get wrong.',
    color: '#7c3aed'
  },
  {
    tag: 'captable',
    label: 'Cap Table',
    title: 'ESOP Pool',
    desc: 'Employee Stock Option Plan — equity reserved for current and future employees to attract and retain talent.',
    example: 'Crabster sets aside 10% for an ESOP pool. This dilutes existing shareholders before the investor comes in.',
    tipType: 'warn',
    tip: 'Investors always ask for ESOP pool creation PRE-investment — meaning dilution comes from founders, not investors.',
    color: '#7c3aed'
  },
  {
    tag: 'captable',
    label: 'Cap Table',
    title: 'Anti-Dilution Rights',
    desc: 'Protects investors if a future round is raised at a lower valuation (a \'down round\').',
    example: 'You raised at Rs. 10 Cr. Next round is at Rs. 5 Cr. Anti-dilution rights adjust the investor\'s share count.',
    tipType: 'warn',
    tip: 'Full Ratchet anti-dilution is extremely founder-unfriendly. Always push for Broad-based Weighted Average.',
    color: '#7c3aed'
  },
  {
    tag: 'captable',
    label: 'Cap Table',
    title: 'Pro-Rata Rights',
    desc: 'An investor\'s right to participate in future funding rounds to maintain their ownership percentage.',
    example: 'Angel owns 5% after Seed. Pro-rata right means they can invest in Series A to keep that 5%.',
    tipType: 'good',
    tip: 'Pro-rata is valuable to good investors. It signals confidence, but too many pro-rata holders can slow down future rounds.',
    color: '#7c3aed'
  },

  // SECTION 3: INSTRUMENTS
  {
    tag: 'instruments',
    label: 'Instruments',
    title: 'SAFE Note',
    desc: 'Simple Agreement for Future Equity. An instrument that converts into equity at a future round — not debt, no interest.',
    example: 'Early investor puts in Rs. 25 L via SAFE at a Rs. 2 Cr valuation cap. At the next round, it converts at the better price.',
    tipType: 'good',
    tip: 'SAFE is widely used post-Y Combinator. SEBI\'s new framework is making it easier in India via DPIIT-recognised startups.',
    color: '#db2777'
  },
  {
    tag: 'instruments',
    label: 'Instruments',
    title: 'Convertible Note',
    desc: 'Short-term debt that converts to equity at the next funding round, typically with a discount rate and/or a valuation cap.',
    example: 'Rs. 10 L convertible note with 20% discount. Next round prices at Rs. 100/share — note converts at Rs. 80/share.',
    tipType: 'warn',
    tip: 'Unlike SAFE, convertible notes are DEBT. They carry interest and a maturity date. Investors can demand repayment.',
    color: '#db2777'
  },
  {
    tag: 'instruments',
    label: 'Instruments',
    title: 'Down Round',
    desc: 'A funding round raised at a valuation LOWER than the previous round. Triggers anti-dilution and signals distress.',
    example: 'Raised Series A at Rs. 20 Cr. Raised Series B at Rs. 12 Cr. This is a down round — painful for all existing shareholders.',
    tipType: 'warn',
    tip: 'Down rounds destroy team morale. Avoid by not over-valuing early rounds beyond your performance projections.',
    color: '#db2777'
  },
  {
    tag: 'instruments',
    label: 'Instruments',
    title: 'Bridge Round',
    desc: 'Emergency or transitional funding to \'bridge\' a startup to its next major milestone or funding round.',
    example: 'Running out of runway 3 months before Series A? Raise a Rs. 20 L bridge note from existing investors.',
    tipType: 'good',
    tip: 'Bridge rounds are acceptable once. Repeated bridge rounds signal the startup cannot independently raise.',
    color: '#db2777'
  },

  // SECTION 4: VALUATION
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'LTV (Lifetime Value)',
    desc: 'Total PROFIT expected from a customer over their relationship. Calculated as (Profit per Order x Number of Orders).',
    example: 'You make Rs. 500 profit on every order. A customer orders 10 times. LTV = Rs. 5,000.',
    tipType: 'good',
    tip: 'Always use Contribution Margin-based LTV, not Revenue. Revenue-based LTV hides high operational costs.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'CAC (Acquisition Cost)',
    desc: 'Total Sales + Marketing spend required to acquire one new customer.',
    example: 'You spend Rs. 50,000 on ads and get 100 customers. CAC = Rs. 500.',
    tipType: 'warn',
    tip: 'If your CAC is higher than your profit per first order, you need high retention to stay alive.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'LTV:CAC Ratio',
    desc: 'Marketing efficiency metric. A ratio of 3x or higher is considered healthy. Below 1x means you are destroying value.',
    example: 'LTV Rs. 3,000 / CAC Rs. 1,000 = 3x. For every Rs. 1 spent, you make Rs. 3 in profit.',
    tipType: 'warn',
    tip: 'A ratio below 3x indicates your acquisition cost is too high relative to the profit generated.',
    color: '#92400e'
  },
  {
    tag: 'valuation',
    label: 'Valuation',
    title: 'Monthly Burn Rate',
    desc: 'The net amount of money your startup loses each month (Expenses minus Revenue).',
    example: 'Expenses Rs. 2.5 L, Revenue Rs. 1 L. Net Burn = Rs. 1.5 L/month.',
    tipType: 'warn',
    tip: 'Runway = Cash in Bank / Monthly Burn. If you have 10 months, start fundraising at month 7 — never later.',
    color: '#92400e'
  },

  // SECTION 5: UNIT ECONOMICS
  {
    tag: 'unitecon',
    label: 'Unit Economics',
    title: 'Contribution Margin',
    desc: 'Revenue minus variable costs per unit. The \'real\' profit per unit that contributes towards fixed costs.',
    example: 'Kit sells for Rs. 1,500. BOM + shipping = Rs. 900. Contribution Margin = Rs. 600 (40%).',
    tipType: 'good',
    tip: 'Contribution Margin must be positive before you scale. A negative margin means every sale deepens your losses.',
    color: '#059669'
  },
  {
    tag: 'unitecon',
    label: 'Unit Economics',
    title: 'Gross Margin',
    desc: '(Revenue minus COGS) divided by Revenue. Shows how efficiently you produce and deliver your product.',
    example: 'Rs. 10 L revenue, Rs. 6 L COGS — Gross Margin = 40%. SaaS typically targets 70–80%.',
    tipType: 'good',
    tip: 'Hardware startups have lower margins than SaaS. But below 20% signals a pricing or sourcing problem.',
    color: '#059669'
  },
  {
    tag: 'unitecon',
    label: 'Unit Economics',
    title: 'Payback Period',
    desc: 'Time taken to recover your Customer Acquisition Cost from a customer\'s profit contribution.',
    example: 'CAC Rs. 500, monthly profit per customer Rs. 100 — Payback = 5 months.',
    tipType: 'warn',
    tip: 'A payback period above 18 months is risky. You are funding growth from capital, not revenue.',
    color: '#059669'
  },
  {
    tag: 'unitecon',
    label: 'Unit Economics',
    title: 'ARR / MRR',
    desc: 'Annual / Monthly Recurring Revenue. Predictable baseline for subscription models. No. 1 valuation metric for SaaS.',
    example: '10 customers paying Rs. 5,000/month — MRR = Rs. 50,000. ARR = Rs. 6,00,000.',
    tipType: 'good',
    tip: 'A 5–10x ARR multiple is common in India. Track MRR churn separately to ensure net growth.',
    color: '#059669'
  },

  // SECTION 6: INDIA LEGAL
  {
    tag: 'legal',
    label: 'India Legal',
    title: 'DPIIT Recognition',
    desc: 'DPIIT recognition unlocks startup tax benefits, self-certification, and faster regulatory approvals.',
    example: 'Crabster registers on the Startup India portal to unlock Section 80-IAC tax exemption eligibility.',
    tipType: 'good',
    tip: 'Free to apply. Zero reason not to register. Required for Angel Tax exemption. Apply on startupindia.gov.in.',
    color: '#dc2626'
  },
  {
    tag: 'legal',
    label: 'India Legal',
    title: 'Section 80-IAC',
    desc: 'Income tax exemption for DPIIT startups — 100% profit deduction for 3 out of 10 years.',
    example: 'Crabster earns Rs. 50 L profit in Year 3. With 80-IAC, zero corporate tax on that profit.',
    tipType: 'good',
    tip: 'Must apply separately to the Inter-Ministerial Board. Processing takes 60–90 days.',
    color: '#dc2626'
  },
  {
    tag: 'legal',
    label: 'India Legal',
    title: 'Angel Tax (Sec 56(2)(viib))',
    desc: 'Tax on funding received above Fair Market Value. DPIIT-registered startups are now exempt.',
    example: 'Investor pays at Rs. 3 Cr valuation when FMV is Rs. 1 Cr. The Rs. 2 Cr is exempt if DPIIT registered.',
    tipType: 'warn',
    tip: 'DPIIT startups are exempt from Angel Tax as per 2023 notification. Register before raising funds.',
    color: '#dc2626'
  },
  {
    tag: 'legal',
    label: 'India Legal',
    title: 'SHA (Shareholders Agreement)',
    desc: 'Legal contract defining rights, governance, exit rights, and dispute resolution. Most important doc you\'ll sign.',
    example: 'The SHA defines investor veto rights, ROFR on transfers, and drag-along triggers.',
    tipType: 'warn',
    tip: 'Never accept an SHA without a lawyer. Watch for reserved matters and affirmative voting rights.',
    color: '#dc2626'
  },
  {
    tag: 'legal',
    label: 'India Legal',
    title: 'RoC Compliance (MCA21)',
    desc: 'Filings required under the Companies Act — annual returns and share allotment forms (Form PAS-3).',
    example: 'Crabster raises a round — must file Form PAS-3 within 30 days or face daily penalties.',
    tipType: 'warn',
    tip: 'Missed RoC filings compound with penalties and can block future fundraising due diligence.',
    color: '#dc2626'
  },

  // SECTION 7: TERM SHEET
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Preference Multiple',
    desc: 'Determines how many times their capital an investor gets back before anyone else. 1x is standard.',
    example: 'In a Rs. 5 Cr exit, an investor with 1x pref on Rs. 2 Cr takes Rs. 2 Cr first.',
    tipType: 'warn',
    tip: '2x or 3x multiples are \'dark patterns\' that can wipe out founders in small exits. Push for 1x.',
    color: '#b91c1c'
  },
  {
    tag: 'termsheet',
    label: 'Term Sheet',
    title: 'Liquidation Type',
    desc: 'Determines if an investor \'double dips\'. Non-Participating is standard; Participating is aggressive.',
    example: 'Participating preferred allows an investor to take their Rs. 1 Cr back AND their 20% share of the remainder.',
    tipType: 'warn',
    tip: 'Always push for Non-Participating preference. It is the global standard for founder-friendly deals.',
    color: '#b91c1c'
  },

  // SECTION 8: GOVERNANCE
  {
    tag: 'governance',
    label: 'Governance',
    title: 'Drag-Along Rights',
    desc: 'Majority shareholders can force minority shareholders to agree to a company sale on the same terms.',
    example: 'Founders + Lead control 70%. Drag-along forces the 30% minority to sell at the same price.',
    tipType: 'warn',
    tip: 'Drag-along prevents minorities from blocking an exit, but check the trigger threshold (50% is aggressive).',
    color: '#4b5563'
  },
  {
    tag: 'governance',
    label: 'Governance',
    title: 'Tag-Along Rights',
    desc: 'Minority shareholders\' right to join if a majority shareholder sells their stake.',
    example: 'Lead investor sells their 20%. Tag-along allows the 5% angel to also sell at the same price.',
    tipType: 'good',
    tip: 'Tag-along protects small shareholders from being stranded after a majority sale changes direction.',
    color: '#4b5563'
  },
  {
    tag: 'governance',
    label: 'Governance',
    title: 'Right of First Refusal (ROFR)',
    desc: 'Existing shareholders get first right to buy shares before they are offered to an outside party.',
    example: 'A co-founder wants to sell their 20%. ROFR gives Sasitharan the right to buy that 20% first.',
    tipType: 'good',
    tip: 'ROFR is standard in all well-drafted SHAs. Always insist on it for all shareholders.',
    color: '#4b5563'
  },
  {
    tag: 'governance',
    label: 'Governance',
    title: 'Information Rights',
    desc: 'Contractual right to receive regular updates — monthly MIS, quarterly reports, and audited accounts.',
    example: 'SHA clause: \'Company shall provide monthly MIS within 15 days of month-end.\'',
    tipType: 'warn',
    tip: 'Negotiate the format before signing. Overly burdensome reporting slows down small teams.',
    color: '#4b5563'
  },
  {
    tag: 'governance',
    label: 'Governance',
    title: 'Board Composition',
    desc: 'Structure of the Board — who controls votes, can veto decisions, and governs the company.',
    example: 'Seed board: 2 Founder seats, 1 Lead Investor seat. Founders retain control 2-1.',
    tipType: 'warn',
    tip: 'Never give an investor board majority at seed stage. Board control equals company control.',
    color: '#4b5563'
  },
  {
    tag: 'governance',
    label: 'Governance',
    title: 'Reserved Matters',
    desc: 'List of decisions that require investor consent regardless of board majority.',
    example: 'Common matters: issuing new shares, acquiring companies, changing the business model.',
    tipType: 'warn',
    tip: 'Negotiate the reserved matters list carefully. A long list effectively means the investor controls the company.',
    color: '#4b5563'
  }
];
