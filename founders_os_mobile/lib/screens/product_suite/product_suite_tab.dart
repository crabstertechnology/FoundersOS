import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../../services/firebase_service.dart';
import '../../services/gemini_service.dart';

class ProductSuiteTab extends StatefulWidget {
  const ProductSuiteTab({super.key});

  @override
  State<ProductSuiteTab> createState() => _ProductSuiteTabState();
}

class _ProductSuiteTabState extends State<ProductSuiteTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _geminiService = GeminiService();

  // PRD States
  final _prdTitleController = TextEditingController();
  final _prdUserRoleController = TextEditingController();
  final _prdBenefitController = TextEditingController();
  final _prdCriteriaController = TextEditingController();
  bool _isPrdLoading = false;
  Map<String, dynamic>? _generatedPrd;

  // Growth Marketing States
  String _growthObjective = 'Viral Loop';
  final _growthValueController = TextEditingController();
  bool _isGrowthLoading = false;
  Map<String, dynamic>? _generatedCampaign;

  // Roadmap State (Mocked interactive Now-Next-Later items)
  final List<Map<String, String>> _roadmapItems = [
    {'timeframe': 'now', 'title': 'Core Mobile App Launch', 'desc': 'Deliver auth, finance dashboard, cap table to iOS & Android.'},
    {'timeframe': 'now', 'title': 'Firebase Firestore sync', 'desc': 'Sync CRM and chat data streams in real time.'},
    {'timeframe': 'next', 'title': 'Push Notification alerts', 'desc': 'Notify founders of cap table dilution, messages, runway drops.'},
    {'timeframe': 'next', 'title': 'B2B Sales Audio Roleplay', 'desc': 'Leverage Gemini live voice API for spoken cold calling practice.'},
    {'timeframe': 'later', 'title': 'Global VC Investor Matchmaking', 'desc': 'Match founders with seed/Series A funds automatically.'},
  ];
  final _roadmapTitleController = TextEditingController();
  final _roadmapDescController = TextEditingController();
  String _roadmapTimeframe = 'now';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final profile = Provider.of<FirebaseService>(context, listen: false).currentProfile;
      if (profile != null) {
        _prdUserRoleController.text = "Early-stage startup founder";
        _growthValueController.text = "${profile.companyName} helps founders model cap tables, practice cold calling with AI, and track leads.";
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _prdTitleController.dispose();
    _prdUserRoleController.dispose();
    _prdBenefitController.dispose();
    _prdCriteriaController.dispose();
    _growthValueController.dispose();
    _roadmapTitleController.dispose();
    _roadmapDescController.dispose();
    super.dispose();
  }

  // -----------------------------------------------------------------
  // PRD Generator Action
  // -----------------------------------------------------------------
  void _runPrdGenerator() async {
    if (_prdTitleController.text.isEmpty) return;

    setState(() {
      _isPrdLoading = true;
      _generatedPrd = null;
    });

    final res = await _geminiService.generatePRD(
      featureTitle: _prdTitleController.text.trim(),
      targetUserRole: _prdUserRoleController.text.trim(),
      benefitGoal: _prdBenefitController.text.trim(),
      acceptanceCriteria: _prdCriteriaController.text.trim(),
    );

    setState(() {
      _generatedPrd = res;
      _isPrdLoading = false;
    });
  }

  // -----------------------------------------------------------------
  // Growth Campaign Action
  // -----------------------------------------------------------------
  void _runGrowthGenerator() async {
    if (_growthValueController.text.isEmpty) return;

    setState(() {
      _isGrowthLoading = true;
      _generatedCampaign = null;
    });

    final res = await _geminiService.generateMarketingCampaign(
      objective: _growthObjective,
      productValueProposition: _growthValueController.text.trim(),
    );

    setState(() {
      _generatedCampaign = res;
      _isGrowthLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF8FAFC),
        title: const Text(
          'PRODUCT & MARKETING',
          style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.w900, letterSpacing: 1.5),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF06B6D4),
          unselectedLabelColor: Color(0xFF64748B),
          indicatorColor: const Color(0xFF06B6D4),
          tabs: const [
            Tab(text: 'PRD Creator', icon: Icon(LucideIcons.fileText)),
            Tab(text: 'Roadmap', icon: Icon(LucideIcons.map)),
            Tab(text: 'Growth Hub', icon: Icon(LucideIcons.trendingUp)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildPRDTab(),
          _buildRoadmapTab(),
          _buildGrowthTab(),
        ],
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 1: PRD Generator
  // -----------------------------------------------------------------
  Widget _buildPRDTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildCard(
            title: 'User Story & PRD Generator',
            icon: LucideIcons.fileText,
            child: Column(
              children: [
                _buildFieldInput('Feature Title', _prdTitleController),
                const SizedBox(height: 12),
                _buildFieldInput('Target User Role', _prdUserRoleController),
                const SizedBox(height: 12),
                _buildFieldInput('Core Benefit / Goal', _prdBenefitController),
                const SizedBox(height: 12),
                _buildFieldInput('Acceptance Rules (Comma separated)', _prdCriteriaController),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: _isPrdLoading ? null : _runPrdGenerator,
                  icon: const Icon(LucideIcons.sparkles, size: 16),
                  label: _isPrdLoading
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)),
                        )
                      : const Text('Generate User Stories & Scope'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Color(0xFF0F172A),
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
          if (_generatedPrd != null) ...[
            const SizedBox(height: 20),
            _buildCard(
              title: 'Generated Product Requirement Document',
              icon: LucideIcons.checkSquare,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('USER STORIES', style: TextStyle(color: Color(0xFF06B6D4), fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  ...(_generatedPrd!['userStories'] as List? ?? []).map((us) => Padding(
                        padding: const EdgeInsets.only(bottom: 8.0),
                        child: Text("• As a ${us['role']}, I want to ${us['action']} so that ${us['benefit']}.", style: const TextStyle(color: Color(0xFF475569), fontSize: 12, height: 1.4)),
                      )),
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 10),
                  const Text('ACCEPTANCE CRITERIA (GIVEN-WHEN-THEN)', style: TextStyle(color: Colors.amberAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  ...(_generatedPrd!['acceptanceCriteria'] as List? ?? []).map((ac) => Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: const Color(0xFF64748B).withOpacity(0.04), borderRadius: BorderRadius.circular(8)),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(ac['scenario'] ?? 'Scenario', style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 11)),
                            const SizedBox(height: 4),
                            Text("Given: ${ac['given']}\nWhen: ${ac['when']}\nThen: ${ac['then']}", style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, height: 1.3)),
                          ],
                        ),
                      )),
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 10),
                  const Text('TECHNICAL IMPLEMENTATION SCOPE', style: TextStyle(color: Colors.greenAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text(_generatedPrd!['techImplementationNotes'] ?? '', style: const TextStyle(color: Color(0xFF475569), fontSize: 12, height: 1.4)),
                  const SizedBox(height: 16),
                  const Text('RISKS & MITIGATION STRATEGIES', style: TextStyle(color: Colors.redAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text(_generatedPrd!['risksAndMitigation'] ?? '', style: const TextStyle(color: Color(0xFF475569), fontSize: 12, height: 1.4)),
                ],
              ),
            ),
          ],
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 2: Roadmap Planner
  // -----------------------------------------------------------------
  Widget _buildRoadmapTab() {
    final nowItems = _roadmapItems.where((i) => i['timeframe'] == 'now').toList();
    final nextItems = _roadmapItems.where((i) => i['timeframe'] == 'next').toList();
    final laterItems = _roadmapItems.where((i) => i['timeframe'] == 'later').toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Timeline cards
          const Text('NOW (Active Quarter Sprint)', style: TextStyle(color: Colors.tealAccent, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
          const SizedBox(height: 8),
          ...nowItems.map((item) => _buildRoadmapCard(item)),

          const SizedBox(height: 20),
          const Text('NEXT (Subsequent Quarter Planning)', style: TextStyle(color: Colors.amberAccent, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
          const SizedBox(height: 8),
          ...nextItems.map((item) => _buildRoadmapCard(item)),

          const SizedBox(height: 20),
          const Text('LATER (Future Vision & Backlog)', style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
          const SizedBox(height: 8),
          ...laterItems.map((item) => _buildRoadmapCard(item)),

          const SizedBox(height: 24),
          ElevatedButton.icon(
            onPressed: () => _showAddRoadmapDialog(context),
            icon: const Icon(LucideIcons.plus, size: 16),
            label: const Text('Add Product Milestone'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF64748B).withOpacity(0.08),
              foregroundColor: Color(0xFF0F172A),
              minimumSize: const Size(double.infinity, 44),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildRoadmapCard(Map<String, String> item) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.015),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF64748B).withOpacity(0.08)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['title'] ?? '', style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 4),
                Text(item['desc'] ?? '', style: const TextStyle(color: Color(0xFF64748B), fontSize: 11)),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(LucideIcons.trash2, color: Colors.redAccent, size: 14),
            onPressed: () {
              setState(() {
                _roadmapItems.remove(item);
              });
            },
          ),
        ],
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 3: Growth Marketing Hub
  // -----------------------------------------------------------------
  Widget _buildGrowthTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildCard(
            title: 'Growth Marketing Architect',
            icon: LucideIcons.trendingUp,
            child: Column(
              children: [
                _buildDropdown(
                  label: 'Marketing Objective',
                  value: _growthObjective,
                  items: ['Viral Loop', 'Retention Engine', 'Paid Acquisition', 'SEO Engine'],
                  onChanged: (v) => setState(() => _growthObjective = v!),
                ),
                const SizedBox(height: 12),
                _buildFieldInput('Product Value & Audience', _growthValueController),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: _isGrowthLoading ? null : _runGrowthGenerator,
                  icon: const Icon(LucideIcons.sparkles, size: 16),
                  label: _isGrowthLoading
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)),
                        )
                      : const Text('Generate Marketing Campaign'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F766E),
                    foregroundColor: Color(0xFF0F172A),
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
          if (_generatedCampaign != null) ...[
            const SizedBox(height: 20),
            _buildCard(
              title: 'Growth Campaign Tactics',
              icon: LucideIcons.rocket,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('VIRAL LOOP MECHANIC', style: TextStyle(color: Color(0xFF06B6D4), fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(_generatedCampaign!['viralLoopMechanic'] ?? '', style: const TextStyle(color: Color(0xFF475569), fontSize: 12, height: 1.4)),
                  const SizedBox(height: 16),
                  const Text('RECOMMENDED SEO KEYWORDS', style: TextStyle(color: Colors.greenAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text((_generatedCampaign!['seoKeywords'] as List? ?? []).join(', '), style: const TextStyle(color: Color(0xFF475569), fontSize: 12)),
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 10),
                  const Text('AD COPY SAMPLES', style: TextStyle(color: Colors.amberAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  ...(_generatedCampaign!['adCopies'] as List? ?? []).map((ad) {
                    final a = ad as Map;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF64748B).withOpacity(0.04),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF64748B).withOpacity(0.08)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text("Channel: ${a['channel']}", style: const TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold, fontSize: 12)),
                          const SizedBox(height: 4),
                          Text("Hook: ${a['hook']}", style: const TextStyle(color: Colors.amberAccent, fontSize: 11)),
                          const SizedBox(height: 4),
                          Text("Body: ${a['body']}", style: const TextStyle(color: Color(0xFF475569), fontSize: 11, height: 1.3)),
                          const SizedBox(height: 4),
                          Text("CTA: ${a['cta']}", style: const TextStyle(color: Colors.greenAccent, fontSize: 11)),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 10),
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 10),
                  const Text('CAMPAIGN EXECUTION CHECKLIST', style: TextStyle(color: Colors.orangeAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  ...(_generatedCampaign!['executionChecklist'] as List? ?? []).map((chk) => Padding(
                        padding: const EdgeInsets.only(bottom: 6.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.check_box_outline_blank, color: Colors.orangeAccent, size: 14),
                            const SizedBox(width: 8),
                            Expanded(child: Text(chk.toString(), style: const TextStyle(color: Color(0xFF475569), fontSize: 12))),
                          ],
                        ),
                      )),
                ],
              ),
            ),
          ],
          const SizedBox(height: 40),
        ],
      ),
    );
  }

  // -----------------------------------------------------------------
  // Dialogs
  // -----------------------------------------------------------------
  void _showAddRoadmapDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              backgroundColor: const Color(0xFFF8FAFC),
              title: const Text('Add Roadmap Milestone', style: TextStyle(color: Color(0xFF0F172A), fontWeight: FontWeight.bold)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  _buildFieldInput('Milestone Title', _roadmapTitleController),
                  const SizedBox(height: 12),
                  _buildFieldInput('Description', _roadmapDescController),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    dropdownColor: const Color(0xFFF8FAFC),
                    value: _roadmapTimeframe,
                    items: const [
                      DropdownMenuItem(value: 'now', child: Text('NOW (Active Quarter)', style: TextStyle(color: Colors.white))),
                      DropdownMenuItem(value: 'next', child: Text('NEXT (Future Quarter)', style: TextStyle(color: Colors.white))),
                      DropdownMenuItem(value: 'later', child: Text('LATER (Backlog)', style: TextStyle(color: Colors.white))),
                    ],
                    onChanged: (v) => setStateDialog(() => _roadmapTimeframe = v!),
                    decoration: const InputDecoration(labelText: 'Timeframe', labelStyle: TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: const Color(0xFF64748B))),
                ),
                ElevatedButton(
                  onPressed: () {
                    final title = _roadmapTitleController.text.trim();
                    final desc = _roadmapDescController.text.trim();
                    if (title.isNotEmpty) {
                      setState(() {
                        _roadmapItems.add({
                          'timeframe': _roadmapTimeframe,
                          'title': title,
                          'desc': desc,
                        });
                      });
                      _roadmapTitleController.clear();
                      _roadmapDescController.clear();
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
  // General UI Helper widgets
  // -----------------------------------------------------------------
  Widget _buildCard({required String title, required IconData icon, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.015),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF64748B).withOpacity(0.08)),
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
                style: const TextStyle(color: Color(0xFF0F172A), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1.0),
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
      style: const TextStyle(color: Color(0xFF0F172A), fontSize: 13),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
        filled: true,
        fillColor: const Color(0xFF64748B).withOpacity(0.04),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF4F46E5))),
      ),
    );
  }

  Widget _buildDropdown({required String label, required String value, required List<String> items, required void Function(String?) onChanged}) {
    return DropdownButtonFormField<String>(
      dropdownColor: const Color(0xFFF8FAFC),
      value: value,
      items: items.map((i) => DropdownMenuItem(value: i, child: Text(i, style: const TextStyle(color: Color(0xFF0F172A), fontSize: 12)))).toList(),
      onChanged: onChanged,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
        filled: true,
        fillColor: const Color(0xFF64748B).withOpacity(0.04),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: Color(0xFF4F46E5))),
      ),
    );
  }
}





