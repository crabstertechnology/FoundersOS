import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
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

    final List<Widget> tabs = [
      DashboardTab(onNavigate: (index) {
        setState(() {
          _selectedIndex = index;
        });
      }),
      const FinanceSuiteTab(),
      const SalesSuiteTab(),
      const OperationsSuiteTab(),
      const ProductSuiteTab(),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFF090D16),
      body: SafeArea(
        child: IndexedStack(
          index: _selectedIndex,
          children: tabs,
        ),
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(
              color: Colors.white.withOpacity(0.05),
              width: 1.0,
            ),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedIndex,
          onTap: (index) {
            setState(() {
              _selectedIndex = index;
            });
          },
          backgroundColor: const Color(0xFF090D16),
          type: BottomNavigationBarType.fixed,
          selectedItemColor: const Color(0xFF06B6D4),
          unselectedItemColor: Colors.grey,
          selectedLabelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
          unselectedLabelStyle: const TextStyle(fontSize: 10, letterSpacing: 0.5),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.rocket),
              label: 'Cockpit',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.coins),
              label: 'Finance',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.activity),
              label: 'Sales',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.cpu),
              label: 'Operations',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.lightbulb),
              label: 'Product',
            ),
          ],
        ),
      ),
    );
  }
}
