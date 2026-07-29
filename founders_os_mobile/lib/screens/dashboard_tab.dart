import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:intl/intl.dart';
import '../main.dart';
import '../services/firebase_service.dart';
import '../services/gemini_service.dart';

class DashboardTab extends StatefulWidget {
  final Function(int) onNavigate;
  const DashboardTab({super.key, required this.onNavigate});

  @override
  State<DashboardTab> createState() => _DashboardTabState();
}

class _DashboardTabState extends State<DashboardTab> {
  // --- AI Planner state ---
  bool _isGeneratingPlan = false;
  bool _isGeneratingReport = false;
  String _weeklyReport = '';
  bool _showReport = false;

  final _goalController = TextEditingController();
  final _progressController = TextEditingController();
  final _gemini = GeminiService();

  String _formatINR(double val) {
    final format = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return format.format(val);
  }

  @override
  void dispose() {
    _goalController.dispose();
    _progressController.dispose();
    super.dispose();
  }

  Future<void> _generatePlan(FirebaseService svc) async {
    if (_goalController.text.trim().isEmpty) return;
    setState(() => _isGeneratingPlan = true);
    try {
      await _gemini.generateExecutionPlan(
        goal: _goalController.text.trim(),
        profile: svc.currentProfile!,
        shareholders: svc.shareholders,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Strategic plan generated!'), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: AppColors.danger),
        );
      }
    } finally {
      if (mounted) setState(() => _isGeneratingPlan = false);
    }
  }

  Future<void> _generateWeeklyReport(FirebaseService svc) async {
    setState(() => _isGeneratingReport = true);
    try {
      final report = await _gemini.generateWeeklyReport(
        profile: svc.currentProfile!,
        tasks: svc.tasks,
        weeklyProgress: _progressController.text.trim(),
      );
      if (mounted) {
        setState(() {
          _weeklyReport = report;
          _showReport = true;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _weeklyReport = 'Could not generate report. Please try again.';
          _showReport = true;
        });
      }
    } finally {
      if (mounted) setState(() => _isGeneratingReport = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final svc = Provider.of<FirebaseService>(context);
    final profile = svc.currentProfile;

    if (profile == null) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    // — KPI calculations —
    final double ltv = profile.profitPerOrder * profile.ordersPerCustomer;
    final double ltvCac = profile.cac > 0 ? ltv / profile.cac : 0.0;
    final double runway = profile.burnRate > 0 ? profile.cashBank / profile.burnRate : (profile.cashBank > 0 ? 999.0 : 0.0);
    final double arr = profile.mRevenue * 12;

    final others = svc.shareholders.where((s) => s.name.toLowerCase() != 'sasitharan').toList();
    final double totalAllocatedToOthers = others.fold(0.0, (acc, s) => acc + s.ownership);
    final double founderEq = (100.0 - totalAllocatedToOthers).clamp(0.0, 100.0);
    final double postMoney = profile.postMoneyValuation > 0 ? profile.postMoneyValuation : profile.latestValuation;
    final double paperNetWorth = postMoney * founderEq / 100;

    final warnings = <String>[];
    if (runway > 0 && runway < 6) warnings.add('Runway critical: ${runway.toStringAsFixed(1)} months left');
    if (ltvCac > 0 && ltvCac < 3) warnings.add('LTV:CAC low (${ltvCac.toStringAsFixed(1)}x) — optimize CAC');
    if (founderEq < 50) warnings.add('Founder equity below 50% (${founderEq.toStringAsFixed(1)}%)');

    final completedTasks = svc.tasks.where((t) => t.status == 'done' || t.status == 'completed').length;
    final pendingTasks = svc.tasks.where((t) => t.status != 'done' && t.status != 'completed').length;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            backgroundColor: AppColors.surface,
            elevation: 0,
            scrolledUnderElevation: 1,
            title: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Center(
                    child: Text('F', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 18)),
                  ),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      profile.companyName,
                      style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    Text(
                      '${profile.stage.toUpperCase()} · ${profile.industry.toUpperCase()}',
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 0.8,
                      ),
                    ),
                  ],
                ),
              ],
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: CircleAvatar(
                  radius: 16,
                  backgroundColor: AppColors.primaryLight,
                  child: const Icon(LucideIcons.user, size: 16, color: AppColors.primary),
                ),
              ),
            ],
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [

                  // ── Warnings ──────────────────────────────────────────
                  if (warnings.isNotEmpty) ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.warningLight,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFFEF08A)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Row(children: [
                            Icon(LucideIcons.alertTriangle, size: 14, color: AppColors.warning),
                            SizedBox(width: 6),
                            Text('Alerts', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 12, color: AppColors.warning)),
                          ]),
                          const SizedBox(height: 6),
                          ...warnings.map((w) => Padding(
                            padding: const EdgeInsets.only(bottom: 2),
                            child: Text('• $w', style: const TextStyle(fontSize: 12, color: Color(0xFF92400E))),
                          )),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // ── KPI Row 1: Finance ─────────────────────────────────
                  _SectionHeader(title: 'Finance Pillar', icon: LucideIcons.wallet, onTap: () => widget.onNavigate(1)),
                  const SizedBox(height: 10),
                  _KPIRow(children: [
                    _KPICard(label: 'Valuation', value: _formatINR(postMoney), icon: LucideIcons.trendingUp, color: AppColors.primary),
                    _KPICard(label: 'Paper Net Worth', value: _formatINR(paperNetWorth), icon: LucideIcons.pieChart, color: AppColors.purple),
                  ]),
                  const SizedBox(height: 10),
                  _KPIRow(children: [
                    _KPICard(label: 'Cash in Bank', value: _formatINR(profile.cashBank), icon: LucideIcons.building2, color: AppColors.success),
                    _KPICard(label: 'Runway', value: runway >= 999 ? '∞' : '${runway.toStringAsFixed(1)} mo',
                        icon: LucideIcons.calendar, color: runway < 6 ? AppColors.danger : AppColors.warning),
                  ]),
                  const SizedBox(height: 10),
                  _KPIRow(children: [
                    _KPICard(label: 'Founder Equity', value: '${founderEq.toStringAsFixed(1)}%', icon: LucideIcons.shield, color: AppColors.secondary),
                    _KPICard(label: 'Investment', value: _formatINR(profile.investment), icon: LucideIcons.coins, color: AppColors.orange),
                  ]),
                  const SizedBox(height: 20),

                  // ── KPI Row 2: Sales ───────────────────────────────────
                  _SectionHeader(title: 'Sales Pillar', icon: LucideIcons.trendingUp, onTap: () => widget.onNavigate(2)),
                  const SizedBox(height: 10),
                  _KPIRow(children: [
                    _KPICard(label: 'MRR', value: _formatINR(profile.mRevenue), icon: LucideIcons.dollarSign, color: AppColors.success),
                    _KPICard(label: 'ARR', value: _formatINR(arr), icon: LucideIcons.barChart2, color: AppColors.primary),
                  ]),
                  const SizedBox(height: 10),
                  _KPIRow(children: [
                    _KPICard(label: 'LTV', value: _formatINR(ltv), icon: LucideIcons.users, color: AppColors.purple),
                    _KPICard(label: 'LTV:CAC', value: '${ltvCac.toStringAsFixed(1)}x',
                        icon: LucideIcons.activity, color: ltvCac >= 3 ? AppColors.success : AppColors.danger),
                  ]),
                  const SizedBox(height: 20),

                  // ── KPI Row 3: Operations ──────────────────────────────
                  _SectionHeader(title: 'Operations Pillar', icon: LucideIcons.cpu, onTap: () => widget.onNavigate(3)),
                  const SizedBox(height: 10),
                  _KPIRow(children: [
                    _KPICard(label: 'Burn Rate', value: _formatINR(profile.burnRate), icon: LucideIcons.flame, color: AppColors.danger),
                    _KPICard(label: 'Customers', value: profile.customers.toStringAsFixed(0), icon: LucideIcons.smile, color: AppColors.secondary),
                  ]),
                  const SizedBox(height: 10),
                  _KPIRow(children: [
                    _KPICard(label: 'Tasks Done', value: completedTasks.toString(), icon: LucideIcons.checkCircle2, color: AppColors.success),
                    _KPICard(label: 'Tasks Pending', value: pendingTasks.toString(), icon: LucideIcons.clock, color: AppColors.warning),
                  ]),
                  const SizedBox(height: 24),

                  // ── AI Strategic Planner ───────────────────────────────
                  _SectionHeader(title: 'AI Strategic Planner', icon: LucideIcons.brain, onTap: null),
                  const SizedBox(height: 12),
                  _LightCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Yearly Goal', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary, letterSpacing: 0.5)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _goalController,
                          maxLines: 2,
                          decoration: const InputDecoration(
                            hintText: 'e.g. Achieve ₹50L ARR, optimize runway to 18 months…',
                            hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 13),
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text('Weekly Progress Notes', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary, letterSpacing: 0.5)),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: _progressController,
                          maxLines: 2,
                          decoration: const InputDecoration(
                            hintText: 'What did you accomplish this week?',
                            hintStyle: TextStyle(color: AppColors.textMuted, fontSize: 13),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: _ActionButton(
                                label: 'Generate Plan',
                                icon: LucideIcons.sparkles,
                                color: AppColors.primary,
                                isLoading: _isGeneratingPlan,
                                onTap: () => _generatePlan(svc),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _ActionButton(
                                label: 'Weekly Report',
                                icon: LucideIcons.fileText,
                                color: AppColors.secondary,
                                isLoading: _isGeneratingReport,
                                onTap: () => _generateWeeklyReport(svc),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // ── Weekly Report Output ───────────────────────────────
                  if (_showReport && _weeklyReport.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    _LightCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Row(children: [
                                Icon(LucideIcons.fileText, size: 16, color: AppColors.primary),
                                SizedBox(width: 8),
                                Text('Weekly Progress Report', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: AppColors.textPrimary)),
                              ]),
                              GestureDetector(
                                onTap: () => setState(() => _showReport = false),
                                child: const Icon(LucideIcons.x, size: 16, color: AppColors.textMuted),
                              ),
                            ],
                          ),
                          const Divider(height: 20),
                          Text(_weeklyReport, style: const TextStyle(fontSize: 13, color: AppColors.textSecondary, height: 1.6)),
                        ],
                      ),
                    ),
                  ],

                  // ── Goal Presets ───────────────────────────────────────
                  const SizedBox(height: 20),
                  const Text('Quick Goal Presets', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary, letterSpacing: 0.5)),
                  const SizedBox(height: 10),
                  ...[
                    'Achieve ₹50L ARR, optimize runway to 18 months, hire 3 core team members',
                    'Launch MVP, secure 10 pilot customers, close ₹30L seed investment',
                    'Double conversion rate from 10% to 20%, reduce burn by 15% via SaaS audit',
                  ].map((preset) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: GestureDetector(
                      onTap: () => setState(() => _goalController.text = preset),
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        decoration: BoxDecoration(
                          color: AppColors.primaryLight,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFFC7D2FE)),
                        ),
                        child: Row(
                          children: [
                            const Icon(LucideIcons.sparkles, size: 14, color: AppColors.primary),
                            const SizedBox(width: 10),
                            Expanded(child: Text(preset, style: const TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600))),
                            const Icon(LucideIcons.chevronRight, size: 14, color: AppColors.primary),
                          ],
                        ),
                      ),
                    ),
                  )),
                  const SizedBox(height: 80),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ─── Shared Light Widgets ───────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final VoidCallback? onTap;
  const _SectionHeader({required this.title, required this.icon, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(children: [
          Icon(icon, size: 16, color: AppColors.primary),
          const SizedBox(width: 8),
          Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
        ]),
        if (onTap != null)
          GestureDetector(
            onTap: onTap,
            child: const Row(children: [
              Text('View', style: TextStyle(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.w600)),
              SizedBox(width: 2),
              Icon(LucideIcons.chevronRight, size: 12, color: AppColors.primary),
            ]),
          ),
      ],
    );
  }
}

class _KPIRow extends StatelessWidget {
  final List<Widget> children;
  const _KPIRow({required this.children});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: children
          .expand((w) => [Expanded(child: w), const SizedBox(width: 10)])
          .toList()
        ..removeLast(),
    );
  }
}

class _KPICard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;
  const _KPICard({required this.label, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 14, color: color),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(value, style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: color, letterSpacing: -0.5)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textMuted, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }
}

class _LightCard extends StatelessWidget {
  final Widget child;
  const _LightCard({required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.cardBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: child,
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final bool isLoading;
  final VoidCallback onTap;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.isLoading,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isLoading ? null : onTap,
      child: Container(
        height: 44,
        decoration: BoxDecoration(
          color: isLoading ? color.withOpacity(0.6) : color,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: isLoading
              ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Row(mainAxisSize: MainAxisSize.min, children: [
                  Icon(icon, size: 14, color: Colors.white),
                  const SizedBox(width: 6),
                  Text(label, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 13)),
                ]),
        ),
      ),
    );
  }
}
