import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:intl/intl.dart';
import '../services/firebase_service.dart';

class DashboardTab extends StatelessWidget {
  final Function(int) onNavigate;

  const DashboardTab({super.key, required this.onNavigate});

  String _formatINR(double val) {
    final format = NumberFormat.currency(locale: 'en_IN', symbol: '₹', decimalDigits: 0);
    return format.format(val);
  }

  @override
  Widget build(BuildContext context) {
    final firebaseService = Provider.of<FirebaseService>(context);
    final profile = firebaseService.currentProfile;

    if (profile == null) {
      return const Scaffold(
        backgroundColor: Color(0xFF090D16),
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF4F46E5)),
        ),
      );
    }

    // Calculations
    final double ltv = profile.profitPerOrder * profile.ordersPerCustomer;
    final double ltvCac = profile.cac > 0 ? ltv / profile.cac : 0.0;
    final double runway = profile.burnRate > 0 ? profile.cashBank / profile.burnRate : (profile.cashBank > 0 ? 999.0 : 0.0);
    final double arr = profile.mRevenue * 12;

    // Calculate founder equity
    final others = firebaseService.shareholders.where((s) => s.name.toLowerCase() != 'sasitharan').toList();
    final double totalAllocatedToOthers = others.fold(0.0, (acc, s) => acc + s.ownership);
    final double founderEq = (100.0 - totalAllocatedToOthers).clamp(0.0, 100.0);

    // Warnings list
    final warnings = <String>[];
    if (runway > 0 && runway < 6) {
      warnings.add("Runway is critically low (${runway.toStringAsFixed(1)} mos). Secure capital.");
    }
    if (ltvCac > 0 && ltvCac < 3) {
      warnings.add("LTV:CAC ratio is low (${ltvCac.toStringAsFixed(1)}x). Optimize customer acquisition cost.");
    }
    if (founderEq < 50) {
      warnings.add("Founder voting majority at risk (${founderEq.toStringAsFixed(1)}% ownership).");
    }

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090D16),
        elevation: 0,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              profile.companyName.toUpperCase(),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w900,
                letterSpacing: 2.0,
              ),
            ),
            Text(
              '${profile.stage.toUpperCase()} • ${profile.industry.toUpperCase()}',
              style: const TextStyle(
                color: Colors.grey,
                fontSize: 10,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.0,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.logOut, color: Colors.grey, size: 20),
            onPressed: () => firebaseService.signOut(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          // Firebase listeners will auto-update, but give a small feedback
          await Future.delayed(const Duration(milliseconds: 500));
        },
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome Widget
              const Text(
                'Welcome Sasitharan,',
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const Text(
                'Startup Dashboard',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 24,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(height: 20),

              // KPI Grid
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                mainAxisSpacing: 16,
                crossAxisSpacing: 16,
                childAspectRatio: 1.25,
                children: [
                  _kpiCard(
                    title: 'CASH RUNWAY',
                    value: runway == 999 ? '∞' : '${runway.toStringAsFixed(1)} mo',
                    subtext: '${_formatINR(profile.cashBank)} in bank',
                    icon: LucideIcons.hourglass,
                    color: runway < 6 ? Colors.redAccent : Colors.teal,
                  ),
                  _kpiCard(
                    title: 'ARR RUN-RATE',
                    value: _formatINR(arr),
                    subtext: '${_formatINR(profile.mRevenue)} / month',
                    icon: LucideIcons.trendingUp,
                    color: Colors.indigoAccent,
                  ),
                  _kpiCard(
                    title: 'FOUNDER STAKE',
                    value: '${founderEq.toStringAsFixed(1)}%',
                    subtext: 'Diluted by others',
                    icon: LucideIcons.shieldCheck,
                    color: founderEq < 50 ? Colors.amber : Colors.blueAccent,
                  ),
                  _kpiCard(
                    title: 'LTV : CAC RATIO',
                    value: '${ltvCac.toStringAsFixed(1)}x',
                    subtext: 'Target: 3.0x+',
                    icon: LucideIcons.target,
                    color: ltvCac < 3 ? Colors.amber : Colors.teal,
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Chart Card (Runway Projector)
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.02),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.white.withOpacity(0.05)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'CASH BALANCE FORECAST',
                          style: TextStyle(
                            color: Colors.grey,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 1.0,
                          ),
                        ),
                        Text(
                          'Burn: ${_formatINR(profile.burnRate)} / mo',
                          style: const TextStyle(
                            color: Colors.redAccent,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      height: 160,
                      child: LineChart(
                        _getChartData(profile.cashBank, profile.burnRate),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Warnings/Alerts
              if (warnings.isNotEmpty) ...[
                const Text(
                  'RED FLAG NOTIFICATIONS',
                  style: TextStyle(
                    color: Colors.redAccent,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5,
                  ),
                ),
                const SizedBox(height: 8),
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: warnings.length,
                  itemBuilder: (context, index) {
                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.redAccent.withOpacity(0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.redAccent.withOpacity(0.2)),
                      ),
                      child: Row(
                        children: [
                          const Icon(LucideIcons.alertTriangle, color: Colors.redAccent, size: 18),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              warnings[index],
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
                const SizedBox(height: 24),
              ],

              // Navigation Links
              const Text(
                'STRATEGIC COMPASS SUITES',
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: 10,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.5,
                ),
              ),
              const SizedBox(height: 12),
              _suiteNavigationCard(
                title: 'Finance Suite',
                subtitle: 'Valuation, dilution simulation, term sheets & Q&A',
                icon: LucideIcons.coins,
                gradientColors: [const Color(0xFF1E3A8A), const Color(0xFF3B82F6)],
                onTap: () => onNavigate(1),
              ),
              const SizedBox(height: 12),
              _suiteNavigationCard(
                title: 'Sales & Activity Tracker',
                subtitle: 'CRM Lead tracking, value scripts & B2B roleplay',
                icon: LucideIcons.activity,
                gradientColors: [const Color(0xFF0F766E), const Color(0xFF0D9488)],
                onTap: () => onNavigate(2),
              ),
              const SizedBox(height: 12),
              _suiteNavigationCard(
                title: 'Operations Hub',
                subtitle: 'Runway simulation, task manager, secure chat',
                icon: LucideIcons.cpu,
                gradientColors: [const Color(0xFF581C87), const Color(0xFF7C3AED)],
                onTap: () => onNavigate(3),
              ),
              const SizedBox(height: 12),
              _suiteNavigationCard(
                title: 'Product & Marketing Suite',
                subtitle: 'PRD generator, feature roadmap & growth ideas',
                icon: LucideIcons.rocket,
                gradientColors: [const Color(0xFF78350F), const Color(0xFFD97706)],
                onTap: () => onNavigate(4),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _kpiCard({
    required String title,
    required String value,
    required String subtext,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.white.withOpacity(0.05)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(
                  color: Colors.grey,
                  fontSize: 9,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                ),
              ),
              Icon(icon, color: color, size: 16),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  fontFamily: 'Inter',
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtext,
                style: const TextStyle(
                  color: Colors.grey,
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _suiteNavigationCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required List<Color> gradientColors,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: gradientColors,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: gradientColors[0].withOpacity(0.3),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.15),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.7),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(LucideIcons.chevronRight, color: Colors.white, size: 20),
          ],
        ),
      ),
    );
  }

  LineChartData _getChartData(double cashBank, double burnRate) {
    if (burnRate <= 0) {
      // flat forecast
      return LineChartData(
        gridData: const FlGridData(show: false),
        titlesData: const FlTitlesData(show: false),
        borderData: FlBorderData(show: false),
        lineBarsData: [
          LineChartBarData(
            spots: [const FlSpot(0, 1), const FlSpot(5, 1)],
            isCurved: false,
            color: Colors.teal,
            barWidth: 3,
            isStrokeCapRound: true,
            dotData: const FlDotData(show: true),
            belowBarData: BarAreaData(
              show: true,
              color: Colors.teal.withOpacity(0.1),
            ),
          ),
        ],
      );
    }

    final spots = <FlSpot>[];
    for (int i = 0; i <= 5; i++) {
      double forecast = cashBank - (burnRate * i);
      spots.add(FlSpot(i.toDouble(), forecast.clamp(0.0, double.infinity)));
    }

    return LineChartData(
      gridData: const FlGridData(show: false),
      titlesData: FlTitlesData(
        bottomTitles: AxisTitles(
          sideTitles: SideTitles(
            showTitles: true,
            getTitlesWidget: (val, meta) {
              return Text(
                'M${val.toInt()}',
                style: const TextStyle(color: Colors.grey, fontSize: 10, fontWeight: FontWeight.bold),
              );
            },
            interval: 1,
          ),
        ),
        leftTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
        topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      ),
      borderData: FlBorderData(show: false),
      lineBarsData: [
        LineChartBarData(
          spots: spots,
          isCurved: true,
          color: Colors.indigoAccent,
          barWidth: 3,
          isStrokeCapRound: true,
          dotData: const FlDotData(show: true),
          belowBarData: BarAreaData(
            show: true,
            color: Colors.indigoAccent.withOpacity(0.1),
          ),
        ),
      ],
    );
  }
}
