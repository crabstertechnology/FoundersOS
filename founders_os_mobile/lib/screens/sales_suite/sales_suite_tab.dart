import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import 'package:flutter_markdown/flutter_markdown.dart';
import '../../services/firebase_service.dart';
import '../../services/gemini_service.dart';
import '../../models/models.dart';

class SalesSuiteTab extends StatefulWidget {
  const SalesSuiteTab({super.key});

  @override
  State<SalesSuiteTab> createState() => _SalesSuiteTabState();
}

class _SalesSuiteTabState extends State<SalesSuiteTab> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _geminiService = GeminiService();

  // CRM States
  String _selectedStatusFilter = 'all';
  final _orgController = TextEditingController();
  final _contactController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _reqController = TextEditingController();
  final _nextActionController = TextEditingController();
  final _expRevController = TextEditingController();
  final _actRevController = TextEditingController();
  final _remarksController = TextEditingController();
  String _leadType = 'other';
  String _source = 'other';
  String _status = 'new-lead';
  DateTime? _followUpDate;

  // Cold Call Generator States
  final _scriptProductController = TextEditingController();
  final _scriptAudienceController = TextEditingController();
  final _scriptProblemController = TextEditingController();
  String _buyerType = 'quality';
  bool _isScriptLoading = false;
  Map<String, dynamic>? _generatedScript;

  // Roleplay Simulator States
  String _coachingArea = 'Customer Understanding';
  String _difficulty = 'beginner';
  bool _isRoleplayLoading = false;
  Map<String, dynamic>? _activeScenario;
  bool _roleplayStarted = false;
  final _chatInputController = TextEditingController();
  final List<Map<String, String>> _roleplayHistory = [];
  bool _isProspectReplying = false;
  String _coachTip = 'Ask an open-ended question to understand their operational bottlenecks.';
  bool _isWon = false;

  // Syllabus States
  int _activeStep = 1;
  bool _isExplainingStep = false;
  Map<String, dynamic>? _stepExplanation;

  final List<Map<String, dynamic>> _syllabusSteps = [
    {'num': 1, 'title': 'Know Customer Persona'},
    {'num': 2, 'title': 'Discover Operation Pain'},
    {'num': 3, 'title': 'Reframe the Bottleneck'},
    {'num': 4, 'title': 'Pitch Core Value ROI'},
    {'num': 5, 'title': 'Prove Concrete Results'},
    {'num': 6, 'title': 'Objections Resolution'},
    {'num': 7, 'title': 'Propose Structured Pilot'},
    {'num': 8, 'title': 'Close Commercial Deal'},
    {'num': 9, 'title': 'Follow Up & Retain'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      final profile = Provider.of<FirebaseService>(context, listen: false).currentProfile;
      if (profile != null) {
        _scriptProductController.text = profile.companyName;
        _scriptAudienceController.text = "B2B Clients in ${profile.industry}";
        _scriptProblemController.text = "Operational bottlenecks and lack of automation.";
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    _orgController.dispose();
    _contactController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _reqController.dispose();
    _nextActionController.dispose();
    _expRevController.dispose();
    _actRevController.dispose();
    _remarksController.dispose();
    _scriptProductController.dispose();
    _scriptAudienceController.dispose();
    _scriptProblemController.dispose();
    _chatInputController.dispose();
    super.dispose();
  }

  String _formatINR(double val) {
    final format = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return format.format(val);
  }

  // -----------------------------------------------------------------
  // CRM Lead Mutations
  // -----------------------------------------------------------------
  void _addLead(FirebaseService service) async {
    final newLead = EZLead(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      date: DateTime.now(),
      leadType: _leadType,
      organization: _orgController.text.trim(),
      contactPerson: _contactController.text.trim(),
      phone: _phoneController.text.trim(),
      email: _emailController.text.trim(),
      source: _source,
      requirement: _reqController.text.trim(),
      status: _status,
      nextAction: _nextActionController.text.trim(),
      followUpDate: _followUpDate,
      expectedRevenue: double.tryParse(_expRevController.text) ?? 0.0,
      actualRevenue: double.tryParse(_actRevController.text) ?? 0.0,
      remarks: _remarksController.text.trim(),
      history: [
        HistoryEntry(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          timestamp: DateTime.now(),
          changedBy: service.currentUser?.displayName ?? 'Founder',
          note: 'Lead created in pipeline.',
        )
      ],
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    final currentLeads = List<EZLead>.from(service.currentProfile?.ezLeads ?? []);
    currentLeads.add(newLead);
    await service.saveLeads(currentLeads);

    _clearLeadForm();
    if (mounted) {
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lead recorded in pipeline!'), backgroundColor: Colors.teal),
      );
    }
  }

  void _updateLeadStatus(FirebaseService service, EZLead lead, String newStatus) async {
    final currentLeads = List<EZLead>.from(service.currentProfile?.ezLeads ?? []);
    final idx = currentLeads.indexWhere((l) => l.id == lead.id);
    if (idx != -1) {
      final updatedHistory = List<HistoryEntry>.from(currentLeads[idx].history);
      updatedHistory.add(HistoryEntry(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        timestamp: DateTime.now(),
        changedBy: service.currentUser?.displayName ?? 'Founder',
        note: 'Status transitioned from ${lead.status} to $newStatus.',
      ));

      currentLeads[idx] = EZLead(
        id: lead.id,
        date: lead.date,
        leadType: lead.leadType,
        organization: lead.organization,
        contactPerson: lead.contactPerson,
        phone: lead.phone,
        email: lead.email,
        source: lead.source,
        requirement: lead.requirement,
        status: newStatus,
        nextAction: lead.nextAction,
        followUpDate: lead.followUpDate,
        expectedRevenue: lead.expectedRevenue,
        actualRevenue: newStatus == 'closed-won' ? lead.expectedRevenue : lead.actualRevenue,
        remarks: lead.remarks,
        history: updatedHistory,
        createdAt: lead.createdAt,
        updatedAt: DateTime.now(),
      );

      await service.saveLeads(currentLeads);
    }
  }

  void _deleteLead(FirebaseService service, EZLead lead) async {
    final currentLeads = List<EZLead>.from(service.currentProfile?.ezLeads ?? []);
    currentLeads.removeWhere((l) => l.id == lead.id);
    await service.saveLeads(currentLeads);
  }

  void _clearLeadForm() {
    _orgController.clear();
    _contactController.clear();
    _phoneController.clear();
    _emailController.clear();
    _reqController.clear();
    _nextActionController.clear();
    _expRevController.clear();
    _actRevController.clear();
    _remarksController.clear();
    setState(() {
      _leadType = 'other';
      _source = 'other';
      _status = 'new-lead';
      _followUpDate = null;
    });
  }

  // -----------------------------------------------------------------
  // AI Script Actions
  // -----------------------------------------------------------------
  void _generateScriptAction() async {
    setState(() {
      _isScriptLoading = true;
      _generatedScript = null;
    });

    final res = await _geminiService.generateColdCallScript(
      productName: _scriptProductController.text.trim(),
      targetAudience: _scriptAudienceController.text.trim(),
      problemSolved: _scriptProblemController.text.trim(),
      buyerType: _buyerType,
    );

    setState(() {
      _generatedScript = res;
      _isScriptLoading = false;
    });
  }

  // -----------------------------------------------------------------
  // B2B Roleplay Simulator
  // -----------------------------------------------------------------
  void _initializeRoleplay() async {
    final profile = Provider.of<FirebaseService>(context, listen: false).currentProfile;
    if (profile == null) return;

    setState(() {
      _isRoleplayLoading = true;
      _activeScenario = null;
      _roleplayStarted = false;
      _roleplayHistory.clear();
      _isWon = false;
    });

    final scenario = await _geminiService.generateCoachingScenario(
      areaToCoach: _coachingArea,
      difficulty: _difficulty,
      productName: profile.companyName,
      targetAudience: "B2B Decision Makers in ${profile.industry}",
      problemSolved: "Manual operations bottlenecks",
    );

    setState(() {
      _activeScenario = scenario;
      _isRoleplayLoading = false;
      _roleplayStarted = true;
      _coachTip = 'Acknowledge the opening line and probe their pain points.';

      // Add the opening line to history
      _roleplayHistory.add({
        'role': 'model',
        'text': scenario['openingLine'] ?? 'Hello, who is this?'
      });
    });
  }

  void _sendRoleplayMessage() async {
    if (_chatInputController.text.isEmpty || _activeScenario == null) return;

    final userMsg = _chatInputController.text.trim();
    _chatInputController.clear();

    setState(() {
      _roleplayHistory.add({'role': 'user', 'text': userMsg});
      _isProspectReplying = true;
    });

    // Send history to model
    final res = await _geminiService.simulateProspectResponse(
      scenarioName: _activeScenario!['scenarioName'] ?? '',
      prospectName: _activeScenario!['prospectName'] ?? '',
      companyContext: _activeScenario!['companyContext'] ?? '',
      triggerEvent: _activeScenario!['triggerEvent'] ?? '',
      scenarioRules: List<String>.from(_activeScenario!['scenarioRules'] ?? []),
      objectionsToRaise: List<String>.from(_activeScenario!['objectionsToRaise'] ?? []),
      chatHistory: _roleplayHistory,
      userMessage: userMsg,
    );

    setState(() {
      _roleplayHistory.add({
        'role': 'model',
        'text': res['reply'] ?? 'Interesting...'
      });
      _coachTip = res['coachFeedbackHint'] ?? 'Keep guiding the talk towards booking a demo.';
      _isWon = res['ended'] ?? false;
      _isProspectReplying = false;
    });
  }

  // -----------------------------------------------------------------
  // Sales Syllabus Explainer
  // -----------------------------------------------------------------
  void _runSyllabusExplainer() async {
    final profile = Provider.of<FirebaseService>(context, listen: false).currentProfile;
    if (profile == null) return;

    setState(() {
      _isExplainingStep = true;
      _stepExplanation = null;
    });

    final stepData = _syllabusSteps.firstWhere((s) => s['num'] == _activeStep);

    final res = await _geminiService.explainMethodologyStep(
      stepNumber: _activeStep,
      stepTitle: stepData['title'],
      productName: profile.companyName,
      targetAudience: "B2B Clients in ${profile.industry}",
      problemSolved: "Operational efficiency and CRM bottlenecks",
    );

    setState(() {
      _stepExplanation = res;
      _isExplainingStep = false;
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
          'SALES SUITE',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 1.5),
        ),
        bottom: TabBar(
          controller: _tabController,
          labelColor: const Color(0xFF06B6D4),
          unselectedLabelColor: Colors.grey,
          indicatorColor: const Color(0xFF06B6D4),
          tabs: const [
            Tab(text: 'CRM Tracker', icon: Icon(LucideIcons.listTodo)),
            Tab(text: 'Cold Scripts', icon: Icon(LucideIcons.phoneCall)),
            Tab(text: 'B2B Roleplay', icon: Icon(LucideIcons.messageSquare)),
            Tab(text: 'Syllabus', icon: Icon(LucideIcons.graduationCap)),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildCRMTab(profile, firebaseService),
          _buildScriptGeneratorTab(),
          _buildRoleplayTab(),
          _buildSyllabusTab(),
        ],
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 1: CRM Lead Tracker
  // -----------------------------------------------------------------
  Widget _buildCRMTab(CompanyProfile profile, FirebaseService service) {
    final leads = profile.ezLeads;

    // Filter leads
    final filteredLeads = leads.where((l) {
      if (_selectedStatusFilter == 'all') return true;
      return l.status == _selectedStatusFilter;
    }).toList();

    // Summaries
    final totalExpected = leads.fold(0.0, (acc, l) => acc + l.expectedRevenue);
    final totalClosedWon = leads.where((l) => l.status == 'closed-won').fold(0.0, (acc, l) => acc + l.actualRevenue);

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      floatingActionButton: FloatingActionButton(
        backgroundColor: const Color(0xFF4F46E5),
        child: const Icon(LucideIcons.plus, color: Colors.white),
        onPressed: () => _showAddLeadDialog(context, service),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // KPI metrics row
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.02),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('PIPELINE VALUE', style: TextStyle(color: Colors.grey, fontSize: 8, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text(_formatINR(totalExpected), style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.02),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.05)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('REVENUE REALIZED', style: TextStyle(color: Colors.grey, fontSize: 8, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 4),
                        Text(_formatINR(totalClosedWon), style: const TextStyle(color: Colors.greenAccent, fontSize: 14, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Pipeline filter chips
            SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _filterChip('all', 'All Leads (${leads.length})'),
                  _filterChip('new-lead', 'New'),
                  _filterChip('contacting', 'Contacting'),
                  _filterChip('demo-scheduled', 'Demo'),
                  _filterChip('proposal-sent', 'Proposal'),
                  _filterChip('negotiating', 'Negotiating'),
                  _filterChip('closed-won', 'Won'),
                  _filterChip('closed-lost', 'Lost'),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Leads list
            Expanded(
              child: filteredLeads.isEmpty
                  ? const Center(child: Text('No leads match the status filter.', style: TextStyle(color: Colors.grey, fontSize: 12)))
                  : ListView.builder(
                      itemCount: filteredLeads.length,
                      itemBuilder: (context, index) {
                        final lead = filteredLeads[index];
                        return Card(
                          color: Colors.white.withOpacity(0.015),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: BorderSide(color: Colors.white.withOpacity(0.05))),
                          margin: const EdgeInsets.only(bottom: 12),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () => _showLeadDetailSheet(context, service, lead),
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(lead.organization, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${lead.contactPerson} • Source: ${lead.source}',
                                          style: const TextStyle(color: Colors.grey, fontSize: 11),
                                        ),
                                        if (lead.nextAction.isNotEmpty) ...[
                                          const SizedBox(height: 6),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                            decoration: BoxDecoration(color: Colors.white.withOpacity(0.05), borderRadius: BorderRadius.circular(6)),
                                            child: Text('Next Action: ${lead.nextAction}', style: const TextStyle(color: Colors.amberAccent, fontSize: 10)),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        _formatINR(lead.expectedRevenue),
                                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                                      ),
                                      const SizedBox(height: 6),
                                      _statusBadge(lead.status),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _filterChip(String status, String label) {
    final isSelected = _selectedStatusFilter == status;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: ChoiceChip(
        selected: isSelected,
        label: Text(label),
        labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.grey, fontSize: 11, fontWeight: FontWeight.bold),
        backgroundColor: Colors.white.withOpacity(0.02),
        selectedColor: const Color(0xFF4F46E5),
        onSelected: (val) {
          if (val) setState(() => _selectedStatusFilter = status);
        },
      ),
    );
  }

  Widget _statusBadge(String status) {
    Color badgeColor = Colors.grey;
    if (status == 'new-lead') badgeColor = Colors.blueAccent;
    if (status == 'closed-won') badgeColor = Colors.greenAccent;
    if (status == 'closed-lost') badgeColor = Colors.redAccent;
    if (status == 'negotiating' || status == 'proposal-sent') badgeColor = Colors.orangeAccent;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: badgeColor.withOpacity(0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: badgeColor.withOpacity(0.2)),
      ),
      child: Text(
        status.toUpperCase().replaceAll('-', ' '),
        style: TextStyle(color: badgeColor, fontSize: 8, fontWeight: FontWeight.bold),
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 2: Cold Call Script Generator
  // -----------------------------------------------------------------
  Widget _buildScriptGeneratorTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildCard(
            title: 'Value Scripts Builder',
            icon: LucideIcons.phoneCall,
            child: Column(
              children: [
                _buildFieldInput('Product Name', _scriptProductController),
                const SizedBox(height: 12),
                _buildFieldInput('Target Client Profile', _scriptAudienceController),
                const SizedBox(height: 12),
                _buildFieldInput('Core Pain Point Solved', _scriptProblemController),
                const SizedBox(height: 12),
                _buildDropdown(
                  label: 'Buyer Archetype focus',
                  value: _buyerType,
                  items: ['price', 'quality', 'urgent', 'curious'],
                  onChanged: (v) => setState(() => _buyerType = v!),
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: _isScriptLoading ? null : _generateScriptAction,
                  icon: const Icon(LucideIcons.sparkles, size: 16),
                  label: _isScriptLoading
                      ? const SizedBox(
                          height: 16,
                          width: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)),
                        )
                      : const Text('Generate 30-Second Script'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ],
            ),
          ),
          if (_generatedScript != null) ...[
            const SizedBox(height: 20),
            _buildCard(
              title: 'Ad Script Flow Output',
              icon: LucideIcons.fileText,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('THE OPENING HOOK', style: TextStyle(color: Color(0xFF06B6D4), fontSize: 9, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(_generatedScript!['hook'] ?? '', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  const SizedBox(height: 12),
                  const Text('PROBLEM INTENSIFIER', style: TextStyle(color: Colors.redAccent, fontSize: 9, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(_generatedScript!['problem'] ?? '', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  const SizedBox(height: 12),
                  const Text('SOLUTION PROPOSITION', style: TextStyle(color: Colors.greenAccent, fontSize: 9, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(_generatedScript!['solution'] ?? '', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  const SizedBox(height: 12),
                  const Text('OUTCOME CTA', style: TextStyle(color: Colors.amberAccent, fontSize: 9, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(_generatedScript!['outcome'] ?? '', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                  const SizedBox(height: 16),
                  const Divider(color: Colors.white10),
                  const SizedBox(height: 10),
                  const Text('COMPLETE 30S COLD CALL DRAFT', style: TextStyle(color: Colors.indigoAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.02), borderRadius: BorderRadius.circular(12)),
                    child: Text(
                      _generatedScript!['fullDraftScript'] ?? '',
                      style: const TextStyle(color: Colors.white, fontSize: 13, height: 1.4, fontStyle: FontStyle.italic),
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('OBJECTION HANDLING STRATEGY', style: TextStyle(color: Colors.orangeAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Text(_generatedScript!['objectionHandlingStrategy'] ?? '', style: const TextStyle(color: Colors.white70, fontSize: 12)),
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
  // Tab 3: B2B Roleplay Simulator
  // -----------------------------------------------------------------
  Widget _buildRoleplayTab() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!_roleplayStarted) ...[
            _buildCard(
              title: 'Roleplay Setup',
              icon: LucideIcons.messageSquare,
              child: Column(
                children: [
                  _buildDropdown(
                    label: 'Target Skill Area',
                    value: _coachingArea,
                    items: ['Customer Understanding', 'Pain Discovery', 'Value Pitch', 'Objection Handling', 'Closing', 'Follow-Up'],
                    onChanged: (v) => setState(() => _coachingArea = v!),
                  ),
                  const SizedBox(height: 12),
                  _buildDropdown(
                    label: 'Prospect Difficulty',
                    value: _difficulty,
                    items: ['beginner', 'advanced'],
                    onChanged: (v) => setState(() => _difficulty = v!),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton.icon(
                    onPressed: _isRoleplayLoading ? null : _initializeRoleplay,
                    icon: const Icon(LucideIcons.sparkles, size: 16),
                    label: _isRoleplayLoading
                        ? const SizedBox(
                            height: 16,
                            width: 16,
                            child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.white)),
                          )
                        : const Text('Start Roleplay Simulation'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F766E),
                      foregroundColor: Colors.white,
                      minimumSize: const Size(double.infinity, 48),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ),
            ),
          ] else ...[
            // Score Board / Rules header
            Container(
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
                      Text(
                        'Prospect: ${_activeScenario?['prospectName'] ?? 'VP Operations'}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _isWon ? Colors.greenAccent.withOpacity(0.2) : Colors.amber.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          _isWon ? 'WON (Meeting Booked)' : 'ACTIVE ROLEPLAY',
                          style: TextStyle(color: _isWon ? Colors.greenAccent : Colors.amber, fontSize: 8, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Company: ${_activeScenario?['companyContext'] ?? ''}',
                    style: const TextStyle(color: Colors.grey, fontSize: 10),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Live Chat window
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.black12,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                ),
                child: ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _roleplayHistory.length,
                  itemBuilder: (context, index) {
                    final msg = _roleplayHistory[index];
                    final isSelf = msg['role'] == 'user';
                    return Align(
                      alignment: isSelf ? Alignment.centerRight : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 10),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: isSelf ? const Color(0xFF0F766E) : Colors.white.withOpacity(0.04),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Container(
                          constraints: const BoxConstraints(maxWidth: 240),
                          child: Text(
                            msg['text'] ?? '',
                            style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.3),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Private Coach Panel
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: Colors.amber.withOpacity(0.05),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.amber.withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.lightbulb, color: Colors.amber, size: 16),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'COACH TIP: $_coachTip',
                      style: const TextStyle(color: Colors.white70, fontSize: 10, fontStyle: FontStyle.italic),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Input Row
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _chatInputController,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: _isWon ? 'Roleplay completed successfully' : 'Type your pitch response...',
                      hintStyle: const TextStyle(color: Colors.grey),
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.02),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Colors.white10)),
                      focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF0F766E))),
                    ),
                    enabled: !_isWon && !_isProspectReplying,
                    onSubmitted: (_) => _sendRoleplayMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton(
                  icon: _isProspectReplying
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, valueColor: AlwaysStoppedAnimation(Colors.teal)))
                      : const Icon(LucideIcons.send, color: Color(0xFF06B6D4)),
                  onPressed: (_isProspectReplying || _isWon) ? null : _sendRoleplayMessage,
                ),
                IconButton(
                  icon: const Icon(LucideIcons.refreshCw, color: Colors.grey, size: 20),
                  onPressed: _initializeRoleplay,
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  // -----------------------------------------------------------------
  // Tab 4: Sales Syllabus
  // -----------------------------------------------------------------
  Widget _buildSyllabusTab() {
    return Row(
      children: [
        // Sidebar list
        Container(
          width: 80,
          decoration: BoxDecoration(
            border: Border(right: BorderSide(color: Colors.white.withOpacity(0.05))),
          ),
          child: ListView.builder(
            itemCount: _syllabusSteps.length,
            itemBuilder: (context, index) {
              final step = _syllabusSteps[index];
              final isSelected = _activeStep == step['num'];
              return InkWell(
                onTap: () {
                  setState(() => _activeStep = step['num']);
                  _runSyllabusExplainer();
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  color: isSelected ? Colors.white.withOpacity(0.03) : Colors.transparent,
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 12,
                        backgroundColor: isSelected ? const Color(0xFF06B6D4) : Colors.white10,
                        child: Text(
                          step['num'].toString(),
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        step['title'].toString().split(' ')[0],
                        style: TextStyle(color: isSelected ? Colors.white : Colors.grey, fontSize: 8),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),

        // Detail View
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Step $_activeStep: ${_syllabusSteps[_activeStep - 1]['title']}',
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),
                if (_isExplainingStep)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 40.0),
                      child: CircularProgressIndicator(color: Color(0xFF06B6D4)),
                    ),
                  )
                else if (_stepExplanation != null) ...[
                  MarkdownBody(
                    data: _stepExplanation!['explanation'] ?? '',
                    styleSheet: MarkdownStyleSheet(
                      p: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                      strong: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      h3: const TextStyle(color: Color(0xFF06B6D4), fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text('CONCRETE DIALOGUE EXAMPLE', style: TextStyle(color: Colors.amberAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.02), borderRadius: BorderRadius.circular(12)),
                    child: Text(
                      _stepExplanation!['concreteExample'] ?? '',
                      style: const TextStyle(color: Colors.white70, fontSize: 12, height: 1.4, fontStyle: FontStyle.italic),
                    ),
                  ),
                  const SizedBox(height: 20),
                  const Text('ACTIONABLE TASKS', style: TextStyle(color: Colors.greenAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  ...(_stepExplanation!['actionableTasks'] as List? ?? []).map((t) => Padding(
                        padding: const EdgeInsets.only(bottom: 6.0),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(Icons.check_box_outline_blank, color: Colors.greenAccent, size: 14),
                            const SizedBox(width: 8),
                            Expanded(child: Text(t.toString(), style: const TextStyle(color: Colors.white70, fontSize: 12))),
                          ],
                        ),
                      )),
                ] else ...[
                  ElevatedButton(
                    onPressed: _runSyllabusExplainer,
                    child: const Text('Generate Syllabus Guide'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  // -----------------------------------------------------------------
  // Sheets and dialog wrappers
  // -----------------------------------------------------------------
  void _showAddLeadDialog(BuildContext context, FirebaseService service) {
    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setStateDialog) {
            return AlertDialog(
              backgroundColor: const Color(0xFF090D16),
              title: const Text('Add Pipeline Lead', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    _buildFieldInput('Organization / Lead Name', _orgController),
                    const SizedBox(height: 12),
                    _buildFieldInput('Contact Person', _contactController),
                    const SizedBox(height: 12),
                    _buildFieldInput('Phone Number', _phoneController, keyboardType: TextInputType.phone),
                    const SizedBox(height: 12),
                    _buildFieldInput('Email Address', _emailController, keyboardType: TextInputType.emailAddress),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            dropdownColor: const Color(0xFF090D16),
                            value: _leadType,
                            items: const [
                              DropdownMenuItem(value: 'school', child: Text('School', style: TextStyle(color: Colors.white, fontSize: 12))),
                              DropdownMenuItem(value: 'college', child: Text('College', style: TextStyle(color: Colors.white, fontSize: 12))),
                              DropdownMenuItem(value: 'student', child: Text('Student', style: TextStyle(color: Colors.white, fontSize: 12))),
                              DropdownMenuItem(value: 'other', child: Text('Other', style: TextStyle(color: Colors.white, fontSize: 12))),
                            ],
                            onChanged: (v) => setStateDialog(() => _leadType = v!),
                            decoration: const InputDecoration(labelText: 'Lead Type', labelStyle: TextStyle(color: Colors.grey, fontSize: 10)),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            dropdownColor: const Color(0xFF090D16),
                            value: _source,
                            items: const [
                              DropdownMenuItem(value: 'cold-call', child: Text('Cold Call', style: TextStyle(color: Colors.white, fontSize: 12))),
                              DropdownMenuItem(value: 'referral', child: Text('Referral', style: TextStyle(color: Colors.white, fontSize: 12))),
                              DropdownMenuItem(value: 'instagram', child: Text('Instagram', style: TextStyle(color: Colors.white, fontSize: 12))),
                              DropdownMenuItem(value: 'whatsapp', child: Text('WhatsApp', style: TextStyle(color: Colors.white, fontSize: 12))),
                              DropdownMenuItem(value: 'website', child: Text('Website', style: TextStyle(color: Colors.white, fontSize: 12))),
                              DropdownMenuItem(value: 'other', child: Text('Other', style: TextStyle(color: Colors.white, fontSize: 12))),
                            ],
                            onChanged: (v) => setStateDialog(() => _source = v!),
                            decoration: const InputDecoration(labelText: 'Source', labelStyle: TextStyle(color: Colors.grey, fontSize: 10)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildFieldInput('Core Requirement', _reqController),
                    const SizedBox(height: 12),
                    _buildFieldInput('Next Action', _nextActionController),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(child: _buildFieldInput('Exp Revenue (₹)', _expRevController, keyboardType: TextInputType.number)),
                        const SizedBox(width: 12),
                        Expanded(
                          child: OutlinedButton(
                            child: Text(
                              _followUpDate == null ? 'Set Follow Up' : DateFormat('MM/dd').format(_followUpDate!),
                              style: const TextStyle(color: Colors.white, fontSize: 11),
                            ),
                            onPressed: () async {
                              final d = await showDatePicker(
                                context: context,
                                initialDate: DateTime.now(),
                                firstDate: DateTime.now(),
                                lastDate: DateTime.now().add(const Duration(days: 365)),
                              );
                              if (d != null) {
                                setStateDialog(() => _followUpDate = d);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
                ),
                ElevatedButton(
                  onPressed: () => _addLead(service),
                  child: const Text('Add Lead'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showLeadDetailSheet(BuildContext context, FirebaseService service, EZLead lead) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF090D16),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.8,
          maxChildSize: 0.95,
          expand: false,
          builder: (context, scrollController) {
            return SingleChildScrollView(
              controller: scrollController,
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(lead.organization, style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                          Text('${lead.contactPerson} • Contact Details', style: const TextStyle(color: Colors.grey, fontSize: 12)),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.trash2, color: Colors.redAccent),
                        onPressed: () {
                          _deleteLead(service, lead);
                          Navigator.pop(context);
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Divider(color: Colors.white10),
                  const SizedBox(height: 10),

                  // Data fields
                  _buildDetailRow('Email', lead.email),
                  _buildDetailRow('Phone', lead.phone),
                  _buildDetailRow('Source', lead.source.toUpperCase()),
                  _buildDetailRow('Type', lead.leadType.toUpperCase()),
                  _buildDetailRow('Expected Revenue', _formatINR(lead.expectedRevenue)),
                  _buildDetailRow('Actual Revenue', _formatINR(lead.actualRevenue)),
                  _buildDetailRow('Follow-up Date', lead.followUpDate != null ? DateFormat('yyyy-MM-dd').format(lead.followUpDate!) : 'None set'),
                  const SizedBox(height: 16),

                  // Change status
                  const Text('PIPELINE STAGE', style: TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  DropdownButtonFormField<String>(
                    dropdownColor: const Color(0xFF090D16),
                    value: lead.status,
                    items: const [
                      DropdownMenuItem(value: 'new-lead', child: Text('New Lead', style: TextStyle(color: Colors.white))),
                      DropdownMenuItem(value: 'contacting', child: Text('Contacting', style: TextStyle(color: Colors.white))),
                      DropdownMenuItem(value: 'demo-scheduled', child: Text('Demo Scheduled', style: TextStyle(color: Colors.white))),
                      DropdownMenuItem(value: 'proposal-sent', child: Text('Proposal Sent', style: TextStyle(color: Colors.white))),
                      DropdownMenuItem(value: 'negotiating', child: Text('Negotiating', style: TextStyle(color: Colors.white))),
                      DropdownMenuItem(value: 'closed-won', child: Text('Closed Won (Success)', style: TextStyle(color: Colors.greenAccent))),
                      DropdownMenuItem(value: 'closed-lost', child: Text('Closed Lost', style: TextStyle(color: Colors.redAccent))),
                    ],
                    onChanged: (v) {
                      if (v != null) {
                        _updateLeadStatus(service, lead, v);
                        Navigator.pop(context);
                      }
                    },
                    decoration: InputDecoration(
                      filled: true,
                      fillColor: Colors.white.withOpacity(0.02),
                      enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // History Log
                  const Text('LEAD HISTORY & AUDIT LOG', style: TextStyle(color: Colors.indigoAccent, fontSize: 10, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  ...lead.history.map((h) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(color: Colors.white.withOpacity(0.01), borderRadius: BorderRadius.circular(8)),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Icon(LucideIcons.history, color: Colors.grey, size: 14),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(h.note, style: const TextStyle(color: Colors.white70, fontSize: 11)),
                                  const SizedBox(height: 2),
                                  Text('By ${h.changedBy} on ${DateFormat('MM/dd HH:mm').format(h.timestamp)}', style: const TextStyle(color: Colors.grey, fontSize: 9)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String val) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
          Text(val, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
        ],
      ),
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
      items: items.map((i) => DropdownMenuItem(value: i, child: Text(i, style: const TextStyle(color: Colors.white, fontSize: 12)))).toList(),
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
