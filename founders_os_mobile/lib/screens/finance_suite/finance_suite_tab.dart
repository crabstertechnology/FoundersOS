import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import 'package:intl/intl.dart';
import '../../services/firebase_service.dart';
import '../../services/gemini_service.dart';
import '../../models/models.dart';

class FinanceSuiteTab extends StatefulWidget {
  const FinanceSuiteTab({super.key});

  @override
  State<FinanceSuiteTab> createState() => _FinanceSuiteTabState();
}

class _FinanceSuiteTabState extends State<FinanceSuiteTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _geminiService = GeminiService();

  // Valuation Forms
  final _nameController = TextEditingController();
  final _revenueController = TextEditingController();
  final _growthController = TextEditingController();
  final _burnController = TextEditingController();
  final _cashController = TextEditingController();
  final _profitController = TextEditingController();
  final _frequencyController = TextEditingController();
  final _cacController = TextEditingController();
  final _investmentController = TextEditingController();
  final _equityController = TextEditingController();
  final _esopController = TextEditingController();
  final _advisorController = TextEditingController();
  final _coFounderController = TextEditingController();

  String _stage = 'idea';
  String _industry = 'saas';
  String _prefMultiple = '1';
  String _prefType = 'nonparticipating';

  // AI Advisor State
  bool _isAdvisorLoading = false;
  Map<String, dynamic>? _advisorReport;

  // Cap Table Registry Forms
  final _partnerNameController = TextEditingController();
  final _partnerOwnershipController = TextEditingController();
  String _partnerRole = 'Partner';
  final _roundNameController = TextEditingController();
  final _roundAmountController = TextEditingController();
  final _roundEquityController = TextEditingController();

  // Dilution Simulator State
  double _simGrantPct = 0.0;

  // Exit Simulator State
  final _exitValueController = TextEditingController(text: '500000000'); // 50 Cr default

  // Term Sheet AI State
  final _clausesController = TextEditingController();
  bool _isClauseLoading = false;
  Map<String, dynamic>? _clauseReport;
  final _qaController = TextEditingController();
  bool _isQaLoading = false;
  final List<Map<String, dynamic>> _qaChat = [];

  // Glossary Jargon Data
  final List<Map<String, String>> _glossary = [
    {
      'term': 'Liquidation Preference',
      'definition': 'Determines how payout proceeds are shared in an exit. A 1x non-participating preference is the standard for fair deals. Participating preferences allow investors to double-dip.'
    },
    {
      'term': 'Anti-Dilution Right',
      'definition': 'Protects investors during down-rounds. Broad-based Weighted Average is standard and founder-friendly, while Full Ratchet is aggressive and highly dilutive.'
    },
    {
      'term': 'ESOP Pool',
      'definition': 'Shares set aside to attract future hires. Creating the pool before the round dilutes the founders, whereas creating it after dilutes everyone.'
    },
    {
      'term': 'Pre-Money vs. Post-Money',
      'definition': 'Pre-money is the value of your startup before investment. Post-money is Pre-money + Investment. A higher post-money with low equity is ideal.'
    },
    {
      'term': 'Right of First Refusal (ROFR)',
      'definition': 'Gives existing shareholders the right to buy shares from selling shareholders before they can sell to outsiders. Standard, but must be reviewed.'
    },
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);

    // Seed controllers with database values once loaded
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final profile = Provider.of<FirebaseService>(context, listen: false).currentProfile;
      if (profile != null) {
        _populateFields(profile);
      }
    });
  }

  void _populateFields(CompanyProfile profile) {
    _nameController.text = profile.companyName;
    _revenueController.text = profile.mRevenue.toStringAsFixed(0);
    _growthController.text = profile.growthRate.toStringAsFixed(0);
    _burnController.text = profile.burnRate.toStringAsFixed(0);
    _cashController.text = profile.cashBank.toStringAsFixed(0);
    _profitController.text = profile.profitPerOrder.toStringAsFixed(0);
    _frequencyController.text = profile.ordersPerCustomer.toStringAsFixed(0);
    _cacController.text = profile.cac.toStringAsFixed(0);
    _investmentController.text = profile.investment.toStringAsFixed(0);
    _equityController.text = profile.equityOffered.toStringAsFixed(0);
    _esopController.text = profile.esopPool.toStringAsFixed(0);
    _advisorController.text = profile.advisorEquity.toStringAsFixed(0);
    _coFounderController.text = profile.coFounderEq.toStringAsFixed(0);

    setState(() {
      _stage = profile.stage;
      _industry = profile.industry;
      _prefMultiple = profile.prefMultiple;
      _prefType = profile.prefType;
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _nameController.dispose();
    _revenueController.dispose();
    _growthController.dispose();
    _burnController.dispose();
    _cashController.dispose();
    _profitController.dispose();
    _frequencyController.dispose();
    _cacController.dispose();
    _investmentController.dispose();
    _equityController.dispose();
    _esopController.dispose();
    _advisorController.dispose();
    _coFounderController.dispose();
    _partnerNameController.dispose();
    _partnerOwnershipController.dispose();
    _roundNameController.dispose();
    _roundAmountController.dispose();
    _roundEquityController.dispose();
    _exitValueController.dispose();
    _clausesController.dispose();
    _qaController.dispose();
    super.dispose();
  }

  String _formatINR(double val) {
    final format = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return format.format(val);
  }

  // -----------------------------------------------------------------
  // Save profile changes to Firestore
  // -----------------------------------------------------------------
  void _saveProfileFields() async {
    final firebaseService = Provider.of<FirebaseService>(context, listen: false);
    final investment = double.tryParse(_investmentController.text) ?? 0.0;
    final equity = double.tryParse(_equityController.text) ?? 0.0;
    final calculatedPost = equity > 0 ? (investment / (equity / 100.0)) : 0.0;

    await firebaseService.updateProfileFields({
      'companyName': _nameController.text.trim(),
      'stage': _stage,
      'industry': _industry,
      'mRevenue': double.tryParse(_revenueController.text) ?? 0.0,
      'growthRate': double.tryParse(_growthController.text) ?? 0.0,
      'burnRate': double.tryParse(_burnController.text) ?? 0.0,
      'cashBank': double.tryParse(_cashController.text) ?? 0.0,
      'profitPerOrder': double.tryParse(_profitController.text) ?? 0.0,
      'ordersPerCustomer': double.tryParse(_frequencyController.text) ?? 1.0,
      'cac': double.tryParse(_cacController.text) ?? 0.0,
      'investment': investment,
      'equityOffered': equity,
      'esopPool': double.tryParse(_esopController.text) ?? 10.0,
      'advisorEquity': double.tryParse(_advisorController.text) ?? 0.0,
      'coFounderEq': double.tryParse(_coFounderController.text) ?? 0.0,
      'prefMultiple': _prefMultiple,
      'prefType': _prefType,
      'postMoneyValuation': calculatedPost,
      'latestValuation': calculatedPost,
    });

    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Valuation data synced successfully!'), backgroundColor: Colors.teal),
      );
    }
  }

  // -----------------------------------------------------------------
  // Get Strategic AI Audit (Gemini)
  // -----------------------------------------------------------------
  void _runStrategicAdvisor() async {
    final firebaseService = Provider.of<FirebaseService>(context, listen: false);
    final profile = firebaseService.currentProfile;
    if (profile == null) return;

    setState(() {
      _isAdvisorLoading = true;
      _advisorReport = null;
    });

    final others = firebaseService.shareholders.where((s) => s.name.toLowerCase() != 'sasitharan').toList();
    final double totalAllocatedToOthers = others.fold(0.0, (acc, s) => acc + s.ownership);
    final double founderEq = (100.0 - totalAllocatedToOthers).clamp(0.0, 100.0);
    final double ltv = profile.profitPerOrder * profile.ordersPerCustomer;
    final double ltvCac = profile.cac > 0 ? ltv / profile.cac : 0.0;
    final double runway = profile.burnRate > 0 ? profile.cashBank / profile.burnRate : 0.0;

    final report = await _geminiService.getStrategicAdvice(
      profile: profile,
      shareholders: firebaseService.shareholders,
      rounds: firebaseService.fundingRounds,
      founderEq: founderEq,
      ltvCac: ltvCac,
      runway: runway,
    );

    setState(() {
      _advisorReport = report;
      _isAdvisorLoading = false;
    });
  }

  // -----------------------------------------------------------------
  // Term Sheet AI Actions
  // -----------------------------------------------------------------
  void _analyzeTermSheet() async {
    final firebaseService = Provider.of<FirebaseService>(context, listen: false);
    final profile = firebaseService.currentProfile;
    if (profile == null) return;

    setState(() {
      _isClauseLoading = true;
      _clauseReport = null;
    });

    final others = firebaseService.shareholders.where((s) => s.name.toLowerCase() != 'sasitharan').toList();
    final double totalAllocatedToOthers = others.fold(0.0, (acc, s) => acc + s.ownership);
    final double founderEq = (100.0 - totalAllocatedToOthers).clamp(0.0, 100.0);

    final report = await _geminiService.getTermSheetAdvice(
      profile: profile,
      founderEq: founderEq,
      existingClauses: _clausesController.text.trim(),
    );

    setState(() {
      _clauseReport = report;
      _isClauseLoading = false;
    });
  }

  void _submitTermSheetQA() async {
    final firebaseService = Provider.of<FirebaseService>(context, listen: false);
    final profile = firebaseService.currentProfile;
    if (profile == null || _qaController.text.isEmpty) return;

    final query = _qaController.text.trim();
    _qaController.clear();

    setState(() {
      _qaChat.add({'role': 'user', 'text': query});
      _isQaLoading = true;
    });

    final result = await _geminiService.askTermSheetQuestion(profile: profile, question: query);

    setState(() {
      _qaChat.add({
        'role': 'model',
        'text': result['answer'] ?? 'No answer provided.',
        'riskLevel': result['riskLevel'] ?? 'Low',
        'riskRationale': result['riskRationale'] ?? '',
        'suggestedFollowUps': result['suggestedFollowUpQuestions'] ?? []
      });
      _isQaLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final firebaseService = Provider.of<FirebaseService>(context);
    final profile = firebaseService.currentProfile;

    if (profile == null) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)));
    }

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090D16),
        title: const Text(
          'FINANCE SUITE',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 1.5),
        ),
        bottom: TabBar(
          controller: _tabController,
          isScrollable: true,
          labelColor: const Color(0xFF06B6D4),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFF06B6D4),
          tabs: const [
            Tab(text: 'Valuation', icon: Icon(LucideIcons.coins)),
            Tab(text: 'Cap Table', icon: Icon(LucideIcons.pieChart)),
            Tab(text: 'Exit Simulator', icon: Icon(LucideIcons.target)),
            Tab(text: 'Term Sheet AI', icon: Icon(LucideIcons.sparkles)),
            Tab(text: 'Glossary', icon: Icon(LucideIcons.bookOpen)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildValuationTab(profile, firebaseService),
          _buildCapTableTab(profile, firebaseService),
          _buildExitSimulatorTab(profile, firebaseService),
          _buildTermSheetAITab(profile),
          _buildGlossaryTab(),
        ],
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 1: Valuation Calculator
  // -----------------------------------------------------------------
  Widget _buildValuationTab(CompanyProfile profile, FirebaseService firebaseService) {
    // Math logic
    final investment = double.tryParse(_investmentController.text) ?? 0.0;
    final equity = double.tryParse(_equityController.text) ?? 0.0;
    final postMoney = equity > 0 ? (investment / (equity / 100.0)) : 0.0;
    final preMoney = (postMoney - investment).clamp(0.0, double.infinity);

    final profitPerOrder = double.tryParse(_profitController.text) ?? 0.0;
    final frequency = double.tryParse(_frequencyController.text) ?? 1.0;
    final cac = double.tryParse(_cacController.text) ?? 0.0;
    final ltv = profitPerOrder * frequency;
    final ltvCac = cac > 0 ? ltv / cac : 0.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Metrics Cards Row
          Row(
            children: [
              Expanded(
                child: _buildMetricMiniCard(
                  'PRE-MONEY VAL',
                  _formatINR(preMoney),
                  'Post - Investment',
                  Colors.blueAccent,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricMiniCard(
                  'POST-MONEY VAL',
                  _formatINR(postMoney),
                  'Inv ÷ Equity%',
                  const Color(0xFF06B6D4),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Startup Details Card
          _buildCard(
            title: 'Startup Valuation Inputs',
            icon: LucideIcons.coins,
            child: Column(
              children: [
                _buildFieldInput('Company Name', _nameController),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildDropdown(
                        label: 'Stage',
                        value: _stage,
                        items: ['idea', 'mvp', 'seed', 'seriesa', 'seriesb'],
                        onChanged: (v) => setState(() => _stage = v!),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildDropdown(
                        label: 'Industry',
                        value: _industry,
                        items: ['iot', 'saas', 'edtech', 'ecomm', 'fintech', 'healthtech', 'ai'],
                        onChanged: (v) => setState(() => _industry = v!),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildFieldInput('Monthly Revenue (₹)', _revenueController, keyboardType: TextInputType.number)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildFieldInput('Monthly Burn (₹)', _burnController, keyboardType: TextInputType.number)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildFieldInput('Cash in Bank (₹)', _cashController, keyboardType: TextInputType.number)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildFieldInput('Investment Sought (₹)', _investmentController, keyboardType: TextInputType.number)),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(child: _buildFieldInput('Equity Offered (%)', _equityController, keyboardType: TextInputType.number)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildFieldInput('ESOP Pool (%)', _esopController, keyboardType: TextInputType.number)),
                  ],
                ),
                const SizedBox(height: 20),
                ElevatedButton(
                  onPressed: _saveProfileFields,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Sync & Save to Firestore', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Unit Economics Card
          _buildCard(
            title: 'Unit Economics Builder',
            icon: LucideIcons.target,
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(child: _buildFieldInput('Profit / Order (₹)', _profitController, keyboardType: TextInputType.number)),
                    const SizedBox(width: 12),
                    Expanded(child: _buildFieldInput('Freq (Orders/Cust)', _frequencyController, keyboardType: TextInputType.number)),
                  ],
                ),
                const SizedBox(height: 12),
                _buildFieldInput('Customer Acquisition Cost (CAC) (₹)', _cacController, keyboardType: TextInputType.number),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.02),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('LTV', style: TextStyle(color: Colors.grey, fontSize: 10)),
                          Text(_formatINR(ltv), style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('LTV : CAC', style: TextStyle(color: Colors.grey, fontSize: 10)),
                          Text('${ltvCac.toStringAsFixed(2)}x', style: TextStyle(color: ltvCac >= 3 ? Colors.greenAccent : Colors.amberAccent, fontSize: 14, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('NET PROFIT/CUST', style: TextStyle(color: Colors.grey, fontSize: 10)),
                          Text(_formatINR(ltv - cac), style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Strategic AI Advisor (Gemini integration)
          _buildCard(
            title: 'Strategic AI Audit',
            icon: LucideIcons.sparkles,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Evaluate your capital structure, unit economics efficiency, and startup parameters instantly using Gemini.',
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _isAdvisorLoading ? null : _runStrategicAdvisor,
                  icon: const Icon(LucideIcons.cpu, size: 18),
                  label: _isAdvisorLoading
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)),
                        )
                      : const Text('Run Strategic AI Audit'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0D9488),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                if (_advisorReport != null) ...[
                  const SizedBox(height: 20),
                  const Divider(color: Colors.white10),
                  const SizedBox(height: 10),
                  const Text('SUMMARY OVERVIEW', style: TextStyle(color: Color(0xFF06B6D4), fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text(_advisorReport!['summary'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.4)),
                  const SizedBox(height: 16),
                  const Text('STRENGTHS', style: TextStyle(color: Colors.greenAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  ...(_advisorReport!['strengths'] as List? ?? []).map((s) => Padding(
                        padding: const EdgeInsets.only(bottom: 6.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.check_circle_outline, color: Colors.greenAccent, size: 14),
                            const SizedBox(width: 8),
                            Expanded(child: Text(s.toString(), style: const TextStyle(color: Colors.white70, fontSize: 12))),
                          ],
                        ),
                      )),
                  const SizedBox(height: 16),
                  const Text('CRITICAL WARNINGS', style: TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  ...(_advisorReport!['warnings'] as List? ?? []).map((w) => Padding(
                        padding: const EdgeInsets.only(bottom: 6.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.error_outline, color: Colors.redAccent, size: 14),
                            const SizedBox(width: 8),
                            Expanded(child: Text(w.toString(), style: const TextStyle(color: Colors.white70, fontSize: 12))),
                          ],
                        ),
                      )),
                  const SizedBox(height: 16),
                  const Text('RECOMMENDATIONS', style: TextStyle(color: Colors.amberAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  ...(_advisorReport!['recommendations'] as List? ?? []).map((r) => Padding(
                        padding: const EdgeInsets.only(bottom: 6.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.lightbulb_outline, color: Colors.amberAccent, size: 14),
                            const SizedBox(width: 8),
                            Expanded(child: Text(r.toString(), style: const TextStyle(color: Colors.white70, fontSize: 12))),
                          ],
                        ),
                      )),
                ],
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 2: Cap Table Registry
  // -----------------------------------------------------------------
  Widget _buildCapTableTab(CompanyProfile profile, FirebaseService firebaseService) {
    final shareholders = firebaseService.shareholders;
    final rounds = firebaseService.fundingRounds;

    // founder calculations
    final others = shareholders.where((s) => s.name.toLowerCase() != 'sasitharan').toList();
    final double totalAllocatedToOthers = others.fold(0.0, (acc, s) => acc + s.ownership);
    final double founderPct = (100.0 - totalAllocatedToOthers).clamp(0.0, 100.0);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Cap table summary cards
          Row(
            children: [
              Expanded(
                child: _buildMetricMiniCard('FOUNDER STAKE', '${founderPct.toStringAsFixed(1)}%', 'Sasitharan', Colors.indigoAccent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricMiniCard('TOTAL ALLOCATED', '${totalAllocatedToOthers.toStringAsFixed(1)}%', 'To Partners/ESOP', Colors.blueAccent),
              ),
            ],
          ),
          const SizedBox(height: 20),

          // Registry List Card
          _buildCard(
            title: 'Equity Registry',
            icon: LucideIcons.users,
            child: Column(
              children: [
                // Founder Row (Static/Calculated)
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                  decoration: BoxDecoration(
                    color: Colors.indigoAccent.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.indigoAccent.withOpacity(0.2)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Sasitharan (Founder)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          Text('PRIMARY OWNER', style: TextStyle(color: Colors.indigoAccent, fontSize: 9, fontWeight: FontWeight.bold)),
                        ],
                      ),
                      Text('${founderPct.toStringAsFixed(1)}%', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 16)),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                // Shareholder List
                if (others.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20.0),
                    child: Text('No partners registered yet.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: others.length,
                    itemBuilder: (context, index) {
                      final sh = others[index];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.02),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white.withOpacity(0.05)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(sh.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                                Text('${sh.role.toUpperCase()} • ${sh.preferenceType.replaceAll('_', ' ').toUpperCase()}', style: const TextStyle(color: Colors.grey, fontSize: 9)),
                              ],
                            ),
                            Row(
                              children: [
                                Text('${sh.ownership.toStringAsFixed(1)}%', style: const TextStyle(color: Color(0xFF06B6D4), fontWeight: FontWeight.bold, fontSize: 14)),
                                IconButton(
                                  icon: const Icon(LucideIcons.trash2, color: Colors.redAccent, size: 16),
                                  onPressed: () => firebaseService.deleteShareholder(sh.id),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                const SizedBox(height: 16),

                // Add Shareholder dialog button
                ElevatedButton.icon(
                  onPressed: () => _showAddPartnerDialog(context, firebaseService),
                  icon: const Icon(LucideIcons.userPlus, size: 16),
                  label: const Text('Add Equity Partner'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(0.05),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 44),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    side: BorderSide(color: Colors.white.withOpacity(0.1)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Dilution simulator
          _buildCard(
            title: 'Dilution Simulator',
            icon: LucideIcons.percent,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Simulate the impact of granting new shares on founder control.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: Slider(
                        value: _simGrantPct,
                        min: 0,
                        max: 100,
                        divisions: 100,
                        label: '${_simGrantPct.toStringAsFixed(1)}%',
                        onChanged: (v) => setState(() => _simGrantPct = v),
                      ),
                    ),
                    Text('${_simGrantPct.toStringAsFixed(1)}%', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ],
                ),
                if (_simGrantPct > 0) ...[
                  const SizedBox(height: 16),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.02),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Sasitharan's Diluted Stake:", style: TextStyle(color: Colors.grey, fontSize: 12)),
                        Text('${(founderPct - _simGrantPct).clamp(0.0, 100.0).toStringAsFixed(1)}%', style: TextStyle(color: (founderPct - _simGrantPct) < 50 ? Colors.redAccent : Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Funding History Card
          _buildCard(
            title: 'Funding Rounds History',
            icon: LucideIcons.history,
            child: Column(
              children: [
                if (rounds.isEmpty)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20.0),
                    child: Text('No funding history recorded yet.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  )
                else
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: rounds.length,
                    itemBuilder: (context, index) {
                      final rnd = rounds[index];
                      final amount = (rnd['amountRaised'] ?? 0.0).toDouble();
                      final pct = (rnd['equityOffered'] ?? 0.0).toDouble();
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.02),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white.withOpacity(0.05)),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(rnd['roundName'] ?? 'Round', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                Text(rnd['date'] ?? '', style: const TextStyle(color: Colors.grey, fontSize: 10)),
                              ],
                            ),
                            Row(
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    Text(_formatINR(amount), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                    Text('$pct% equity', style: const TextStyle(color: Colors.indigoAccent, fontSize: 10)),
                                  ],
                                ),
                                IconButton(
                                  icon: const Icon(LucideIcons.trash2, color: Colors.redAccent, size: 16),
                                  onPressed: () => firebaseService.deleteFundingRound(rnd['id']),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: () => _showAddRoundDialog(context, firebaseService),
                  icon: const Icon(LucideIcons.plus, size: 16),
                  label: const Text('Record Funding Round'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white.withOpacity(0.05),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 44),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 3: Exit Simulator
  // -----------------------------------------------------------------
  Widget _buildExitSimulatorTab(CompanyProfile profile, FirebaseService firebaseService) {
    // Determine exit gross pool
    final double exitValue = double.tryParse(_exitValueController.text) ?? 0.0;

    // Use current shareholders
    final shareholders = firebaseService.shareholders;
    final others = shareholders.where((s) => s.name.toLowerCase() != 'sasitharan').toList();
    final double totalAllocatedToOthers = others.fold(0.0, (acc, s) => acc + s.ownership);
    final double founderPct = (100.0 - totalAllocatedToOthers).clamp(0.0, 100.0);

    // Build the list of active shareholders
    final List<Shareholder> activeShareholders = [];
    activeShareholders.add(Shareholder(
      id: 'founder',
      name: 'Sasitharan (Founder)',
      role: 'Founder',
      ownership: founderPct,
      invested: 0.0,
      preferenceType: 'common',
    ));
    activeShareholders.addAll(others);

    // Math for Waterfall Exit proceeds
    final results = _calculateWaterfall(exitValue, activeShareholders);

    // Check if founder is heavily diluted (dilution alert)
    final founderResult = results.firstWhere((r) => r['id'] == 'founder', orElse: () => {});
    final double founderPayout = (founderResult['payout'] ?? 0.0).toDouble();
    final double founderEffectiveYield = exitValue > 0 ? (founderPayout / exitValue) * 100.0 : 0.0;
    final showFounderAlert = founderEffectiveYield < founderPct - 5.0;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Exit Input
          _buildCard(
            title: 'Simulate Exit Valuation',
            icon: LucideIcons.target,
            child: Column(
              children: [
                _buildFieldInput('Gross Exit / Acquisition Value (₹)', _exitValueController, keyboardType: TextInputType.number),
                const SizedBox(height: 8),
                const Text(
                  'Typical tech exit represents 5x-10x ARR. Enter your exit scenario size above.',
                  style: TextStyle(color: Colors.grey, fontSize: 10, fontStyle: FontStyle.italic),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Payout Table
          _buildCard(
            title: 'Waterfall Payout Distribution',
            icon: LucideIcons.pieChart,
            child: Column(
              children: [
                if (exitValue == 0)
                  const Padding(
                    padding: EdgeInsets.symmetric(vertical: 20.0),
                    child: Text('Enter an Exit Value above to simulate the waterfall.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                  )
                else ...[
                  ListView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: results.length,
                    itemBuilder: (context, index) {
                      final res = results[index];
                      final payout = (res['payout'] ?? 0.0).toDouble();
                      final yieldPct = (res['yield'] ?? 0.0).toDouble();
                      final ownership = (res['ownership'] ?? 0.0).toDouble();
                      final String type = res['payoutType'] ?? '';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.02),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white.withOpacity(0.05)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(res['name'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: res['role'] == 'Founder' ? Colors.indigoAccent : Colors.teal.withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    res['role'] ?? '',
                                    style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('CASH PAYOUT', style: TextStyle(color: Colors.grey, fontSize: 9)),
                                    Text(_formatINR(payout), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14)),
                                  ],
                                ),
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.end,
                                  children: [
                                    const Text('EFFECTIVE YIELD', style: TextStyle(color: Colors.grey, fontSize: 9)),
                                    Text('${yieldPct.toStringAsFixed(1)}% (Paper: ${ownership.toStringAsFixed(0)}%)',
                                        style: TextStyle(
                                          color: yieldPct < ownership - 0.1 ? Colors.redAccent : Colors.greenAccent,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        )),
                                  ],
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              'Type: $type',
                              style: const TextStyle(color: Colors.grey, fontSize: 9, fontStyle: FontStyle.italic),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  if (showFounderAlert) ...[
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.redAccent.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.redAccent.withOpacity(0.3)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(LucideIcons.alertTriangle, color: Colors.redAccent, size: 18),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'FOUNDER DILUTION ALERT',
                                  style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold, fontSize: 11),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  "Because of investor liquidation preferences, you are taking home ${founderEffectiveYield.toStringAsFixed(1)}% of the exit proceeds, which is lower than your ${founderPct.toStringAsFixed(0)}% paper equity. Investigate anti-dilution and pref-cap terms.",
                                  style: const TextStyle(color: Colors.white70, fontSize: 11, height: 1.4),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> _calculateWaterfall(double exitPool, List<Shareholder> shareholders) {
    if (exitPool <= 0) return [];

    double remainingPool = exitPool;

    // Step 1: Preferences Demands
    final List<Map<String, dynamic>> demands = shareholders.map((sh) {
      double prefDemand = 0.0;
      if (sh.preferenceType == '1x_non_part' || sh.preferenceType == '1x_part') {
        prefDemand = sh.invested;
      } else if (sh.preferenceType == '2x_part') {
        prefDemand = sh.invested * 2.0;
      }
      return {
        'id': sh.id,
        'name': sh.name,
        'role': sh.role,
        'ownership': sh.ownership,
        'invested': sh.invested,
        'preferenceType': sh.preferenceType,
        'prefDemand': prefDemand,
      };
    }).toList();

    double totalPrefDemand = demands.fold(0.0, (sum, d) => sum + d['prefDemand']);

    // Catch case: Exit doesn't cover preference
    if (remainingPool <= totalPrefDemand && totalPrefDemand > 0) {
      return demands.map((d) {
        double payout = (d['prefDemand'] / totalPrefDemand) * remainingPool;
        return {
          'id': d['id'],
          'name': d['name'],
          'role': d['role'],
          'ownership': d['ownership'],
          'payout': payout,
          'yield': (payout / exitPool) * 100.0,
          'payoutType': 'Liquidation preference pool capped',
        };
      }).toList();
    }

    remainingPool -= totalPrefDemand;

    // Step 2: Determine conversions for Non-Participating
    double commonOwnershipBase = 0.0;
    for (var d in demands) {
      double proRataGross = (d['ownership'] / 100.0) * exitPool;
      bool convertsToCommon = false;

      if (d['preferenceType'] == '1x_non_part') {
        if (proRataGross > d['prefDemand']) {
          convertsToCommon = true;
          remainingPool += d['prefDemand']; // Return pref to pool
          d['prefDemand'] = 0.0;
        }
      }

      d['convertsToCommon'] = convertsToCommon;

      if (d['preferenceType'] == 'common' ||
          d['preferenceType'] == '1x_part' ||
          d['preferenceType'] == '2x_part' ||
          convertsToCommon) {
        commonOwnershipBase += d['ownership'];
      }
    }

    // Step 3: Distribute remaining pool to common and participating
    return demands.map((d) {
      double commonShare = 0.0;
      final bool converts = d['convertsToCommon'] ?? false;

      if (d['preferenceType'] == 'common' ||
          d['preferenceType'] == '1x_part' ||
          d['preferenceType'] == '2x_part' ||
          converts) {
        double adjustedOwnership = commonOwnershipBase > 0 ? (d['ownership'] / commonOwnershipBase) : 0.0;
        commonShare = remainingPool * adjustedOwnership;
      }

      double totalPayout = d['prefDemand'] + commonShare;
      String payoutType = 'Common Pro-Rata';

      if (converts) {
        payoutType = 'Converted to Common (Better Return)';
      } else if (d['preferenceType'].toString().contains('part') && commonShare > 0) {
        payoutType = 'Preference + Participating Pro-Rata';
      } else if (d['prefDemand'] > 0 && commonShare == 0) {
        payoutType = 'Preference Capped';
      }

      return {
        'id': d['id'],
        'name': d['name'],
        'role': d['role'],
        'ownership': d['ownership'],
        'payout': totalPayout,
        'yield': (totalPayout / exitPool) * 100.0,
        'payoutType': payoutType,
      };
    }).toList();
  }

  // -----------------------------------------------------------------
  // Tab 4: Term Sheet AI
  // -----------------------------------------------------------------
  Widget _buildTermSheetAITab(CompanyProfile profile) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Clauses Analyzer Card
          _buildCard(
            title: 'Term Sheet Clauses Auditor',
            icon: LucideIcons.sparkles,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Paste your term sheet clauses or summarize investor proposals below to audit for predatory terms.',
                  style: TextStyle(color: Colors.grey, fontSize: 12),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _clausesController,
                  maxLines: 4,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: InputDecoration(
                    hintText: 'e.g. Investor proposes 2x participating liquidation preference, full-ratchet anti-dilution, and veto rights on operations...',
                    hintStyle: const TextStyle(color: Colors.grey),
                    filled: true,
                    fillColor: Colors.white.withOpacity(0.02),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.white10)),
                    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF4F46E5))),
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _isClauseLoading ? null : _analyzeTermSheet,
                  icon: const Icon(LucideIcons.cpu, size: 16),
                  label: _isClauseLoading
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)),
                        )
                      : const Text('Audit Term Sheet Clauses'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                if (_clauseReport != null) ...[
                  const SizedBox(height: 20),
                  const Divider(color: Colors.white10),
                  const SizedBox(height: 10),
                  const Text('OVERALL ASSESSMENT', style: TextStyle(color: Color(0xFF06B6D4), fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(_clauseReport!['overallAssessment'] ?? '', style: const TextStyle(color: Colors.white, fontSize: 12, height: 1.4)),
                  const SizedBox(height: 16),
                  const Text('KEY NEGOTIATION CLAUSES', style: TextStyle(color: Colors.amberAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  ...(_clauseReport!['keyNegotiationPoints'] as List? ?? []).map((pt) {
                    final p = pt as Map;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.01),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withOpacity(0.05)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(p['clause'] ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                          const SizedBox(height: 6),
                          Text('Friendly structure: ${p['founderFriendlyRecommendation']}', style: const TextStyle(color: Colors.greenAccent, fontSize: 11)),
                          const SizedBox(height: 4),
                          Text('Talking strategy: ${p['negotiationStrategy']}', style: const TextStyle(color: Colors.grey, fontSize: 11)),
                          const SizedBox(height: 4),
                          Text('Watch out: ${p['redFlagsToWatchOutFor']}', style: const TextStyle(color: Colors.redAccent, fontSize: 11)),
                          if (p['feedbackOnCurrentProposedTerms'] != null && p['feedbackOnCurrentProposedTerms'].toString().isNotEmpty) ...[
                            const SizedBox(height: 4),
                            Text('Feedback: ${p['feedbackOnCurrentProposedTerms']}', style: const TextStyle(color: Colors.orangeAccent, fontSize: 11)),
                          ],
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 10),
                  const Text('GENERAL WARNINGS', style: TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(_clauseReport!['generalWarnings'] ?? '', style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.4)),
                ],
              ],
            ),
          ),
          const SizedBox(height: 20),

          // Q&A Chatbot Card
          _buildCard(
            title: 'Term Sheet Q&A Chatbot',
            icon: LucideIcons.messageSquare,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Ask any legal/VC terms question and get instant advice.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                const SizedBox(height: 16),
                Container(
                  height: 240,
                  decoration: BoxDecoration(
                    color: Colors.black12,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.white.withOpacity(0.05)),
                  ),
                  child: _qaChat.isEmpty
                      ? const Center(
                          child: Text('Ask something to start the chatbot.', style: TextStyle(color: Colors.grey, fontSize: 11)),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: _qaChat.length,
                          itemBuilder: (context, index) {
                            final msg = _qaChat[index];
                            final isSelf = msg['role'] == 'user';

                            return Align(
                              alignment: isSelf ? Alignment.centerRight : Alignment.centerLeft,
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 8),
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: isSelf ? const Color(0xFF4F46E5) : Colors.white.withOpacity(0.04),
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (!isSelf) ...[
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(LucideIcons.sparkles, color: Colors.tealAccent, size: 10),
                                          const SizedBox(width: 4),
                                          Text(
                                            'RISK LEVEL: ${msg['riskLevel'] ?? 'LOW'}',
                                            style: TextStyle(
                                              color: msg['riskLevel'] == 'High' ? Colors.redAccent : Colors.tealAccent,
                                              fontSize: 9,
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                    ],
                                    SizedBox(
                                      width: 250,
                                      child: MarkdownBody(
                                        data: msg['text'] ?? '',
                                        styleSheet: MarkdownStyleSheet(
                                          p: const TextStyle(color: Colors.white70, fontSize: 12),
                                          strong: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                          h3: const TextStyle(color: Color(0xFF06B6D4), fontSize: 13, fontWeight: FontWeight.bold),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _qaController,
                        style: const TextStyle(color: Colors.white, fontSize: 13),
                        decoration: InputDecoration(
                          hintText: 'e.g. What is a board observer seat?',
                          hintStyle: const TextStyle(color: Colors.grey),
                          filled: true,
                          fillColor: Colors.white.withOpacity(0.02),
                          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.white10)),
                          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF4F46E5))),
                        ),
                        onSubmitted: (_) => _submitTermSheetQA(),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: _isQaLoading
                          ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.teal)))
                          : const Icon(LucideIcons.send, color: Color(0xFF06B6D4)),
                      onPressed: _isQaLoading ? null : _submitTermSheetQA,
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 5: Glossary
  // -----------------------------------------------------------------
  Widget _buildGlossaryTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(20.0),
      itemCount: _glossary.length,
      itemBuilder: (context, index) {
        final item = _glossary[index];
        return Card(
          color: Colors.white.withOpacity(0.02),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.white.withOpacity(0.05))),
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item['term'] ?? '',
                  style: const TextStyle(color: Color(0xFF06B6D4), fontSize: 15, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  item['definition'] ?? '',
                  style: const TextStyle(color: Colors.grey, fontSize: 13, height: 1.4),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // -----------------------------------------------------------------
  // Dialog: Add Equity Partner
  // -----------------------------------------------------------------
  void _showAddPartnerDialog(BuildContext context, FirebaseService service) {
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              backgroundColor: const Color(0xFF090D16),
              title: const Text('Add Partner Registry', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  TextField(
                    controller: _partnerNameController,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(labelText: 'Partner Name', labelStyle: TextStyle(color: Colors.grey)),
                  ),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    dropdownColor: const Color(0xFF090D16),
                    value: _partnerRole,
                    items: const [
                      DropdownMenuItem(value: 'Partner', child: Text('Partner', style: TextStyle(color: Colors.white))),
                      DropdownMenuItem(value: 'Investor', child: Text('Investor', style: TextStyle(color: Colors.white))),
                      DropdownMenuItem(value: 'ESOP', child: Text('ESOP', style: TextStyle(color: Colors.white))),
                      DropdownMenuItem(value: 'Advisor', child: Text('Advisor', style: TextStyle(color: Colors.white))),
                    ],
                    onChanged: (v) => setStateDialog(() => _partnerRole = v!),
                    decoration: const InputDecoration(labelText: 'Role', labelStyle: TextStyle(color: Colors.grey)),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _partnerOwnershipController,
                    keyboardType: TextInputType.number,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(labelText: 'Ownership (%)', labelStyle: TextStyle(color: Colors.grey)),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  onPressed: () {
                    final name = _partnerNameController.text.trim();
                    final own = double.tryParse(_partnerOwnershipController.text) ?? 0.0;
                    if (name.isNotEmpty && own > 0) {
                      service.addShareholder(Shareholder(
                        id: '',
                        name: name,
                        role: _partnerRole,
                        ownership: own,
                        invested: _partnerRole == 'Investor' ? (service.currentProfile?.investment ?? 0.0) : 0.0,
                        preferenceType: _partnerRole == 'Investor' ? '1x_non_part' : 'common',
                      ));
                      _partnerNameController.clear();
                      _partnerOwnershipController.clear();
                      Navigator.pop(context);
                    }
                  },
                  child: const Text('Add'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // -----------------------------------------------------------------
  // Dialog: Add Round Dialog
  // -----------------------------------------------------------------
  void _showAddRoundDialog(BuildContext context, FirebaseService service) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: const Color(0xFF090D16),
          title: const Text('Record Funding Round', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _roundNameController,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Round Name (e.g. Seed)', labelStyle: TextStyle(color: Colors.grey)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _roundAmountController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Amount Raised (₹)', labelStyle: TextStyle(color: Colors.grey)),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _roundEquityController,
                keyboardType: TextInputType.number,
                style: const TextStyle(color: Colors.white),
                decoration: const InputDecoration(labelText: 'Equity Offered (%)', labelStyle: TextStyle(color: Colors.grey)),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () {
                final name = _roundNameController.text.trim();
                final amt = double.tryParse(_roundAmountController.text) ?? 0.0;
                final eq = double.tryParse(_roundEquityController.text) ?? 0.0;
                if (name.isNotEmpty && amt > 0) {
                  service.addFundingRound({
                    'roundName': name,
                    'amountRaised': amt,
                    'equityOffered': eq,
                    'date': DateFormat('yyyy-MM-dd').format(DateTime.now()),
                  });
                  _roundNameController.clear();
                  _roundAmountController.clear();
                  _roundEquityController.clear();
                  Navigator.pop(context);
                }
              },
              child: const Text('Save'),
            ),
          ],
        );
      },
    );
  }

  // -----------------------------------------------------------------
  // General UI Helper widgets
  // -----------------------------------------------------------------
  Widget _buildMetricMiniCard(String title, String val, String sub, Color accent) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: Colors.grey, fontSize: 8, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
          const SizedBox(height: 4),
          Text(val, style: TextStyle(color: accent, fontSize: 16, fontWeight: FontWeight.w900, fontFamily: 'Inter')),
          const SizedBox(height: 2),
          Text(sub, style: const TextStyle(color: Colors.grey, fontSize: 9)),
        ],
      ),
    );
  }

  Widget _buildCard({required String title, required IconData icon, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.015),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: const Color(0xFF06B6D4), size: 18),
              const SizedBox(width: 8),
              Text(
                title.toUpperCase(),
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1.0),
              ),
            ],
          ),
          const SizedBox(height: 16),
          child,
        ],
      ),
    );
  }

  Widget _buildFieldInput(String label, TextEditingController controller, {TextInputType keyboardType = TextInputType.text}) {
    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white, fontSize: 13),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.grey, fontSize: 12),
        filled: true,
        fillColor: Colors.white.withOpacity(0.01),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white10)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF4F46E5))),
      ),
    );
  }

  Widget _buildDropdown({required String label, required String value, required List<String> items, required void Function(String?) onChanged}) {
    return DropdownButtonFormField<String>(
      dropdownColor: const Color(0xFF090D16),
      value: value,
      items: items.map((i) => DropdownMenuItem(value: i, child: Text(i.toUpperCase(), style: const TextStyle(color: Colors.white, fontSize: 12)))).toList(),
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Colors.grey, fontSize: 12),
        filled: true,
        fillColor: Colors.white.withOpacity(0.01),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Colors.white10)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF4F46E5))),
      ),
    );
  }
}
