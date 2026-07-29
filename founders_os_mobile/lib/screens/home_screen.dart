import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../main.dart';
import '../services/firebase_service.dart';
import 'dashboard_tab.dart';
import 'finance_suite/finance_suite_tab.dart';
import 'sales_suite/sales_suite_tab.dart';
import 'operations_suite/operations_suite_tab.dart';
import 'product_suite/product_suite_tab.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _selectedIndex = 0;

  final _navItems = const [
    _NavItem(icon: LucideIcons.layoutDashboard, label: 'Cockpit'),
    _NavItem(icon: LucideIcons.coins,           label: 'Finance'),
    _NavItem(icon: LucideIcons.trendingUp,      label: 'Sales'),
    _NavItem(icon: LucideIcons.cpu,             label: 'Ops'),
    _NavItem(icon: LucideIcons.lightbulb,       label: 'Product'),
  ];

  @override
  Widget build(BuildContext context) {
    final firebaseService = Provider.of<FirebaseService>(context);
    final profile = firebaseService.currentProfile;

    if (profile == null) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }

    final tabs = [
      DashboardTab(onNavigate: (index) => setState(() => _selectedIndex = index)),
      const FinanceSuiteTab(),
      const SalesSuiteTab(),
      const OperationsSuiteTab(),
      const ProductSuiteTab(),
    ];

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: IndexedStack(index: _selectedIndex, children: tabs),
      ),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          color: AppColors.surface,
          border: Border(top: BorderSide(color: AppColors.border, width: 1)),
        ),
        child: SafeArea(
          top: false,
          child: SizedBox(
            height: 60,
            child: Row(
              children: List.generate(_navItems.length, (i) {
                final item = _navItems[i];
                final selected = _selectedIndex == i;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _selectedIndex = i),
                    behavior: HitTestBehavior.opaque,
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                            decoration: BoxDecoration(
                              color: selected ? AppColors.primaryLight : Colors.transparent,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Icon(
                              item.icon,
                              size: 20,
                              color: selected ? AppColors.primary : AppColors.textMuted,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            item.label,
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
                              color: selected ? AppColors.primary : AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;
  const _NavItem({required this.icon, required this.label});
}
