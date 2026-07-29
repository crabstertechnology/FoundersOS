import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'services/firebase_service.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';

void main() async {
  await FirebaseService.initialize();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));
  runApp(const MyApp());
}

// ─── Global Design Tokens ──────────────────────────────────────────────────
class AppColors {
  static const primary = Color(0xFF4F46E5);      // Indigo
  static const secondary = Color(0xFF06B6D4);    // Cyan
  static const surface = Color(0xFFFFFFFF);
  static const background = Color(0xFFF8FAFC);   // Slate-50
  static const cardBg = Color(0xFFFFFFFF);
  static const border = Color(0xFFE2E8F0);       // Slate-200
  static const textPrimary = Color(0xFF0F172A);  // Slate-900
  static const textSecondary = Color(0xFF64748B); // Slate-500
  static const textMuted = Color(0xFF94A3B8);    // Slate-400
  static const success = Color(0xFF10B981);
  static const warning = Color(0xFFF59E0B);
  static const danger = Color(0xFFEF4444);
  static const purple = Color(0xFF8B5CF6);
  static const orange = Color(0xFFF97316);
  static const pink = Color(0xFFEC4899);
  static const primaryLight = Color(0xFFEEF2FF);  // Indigo-50
  static const successLight = Color(0xFFD1FAE5);
  static const warningLight = Color(0xFFFEF3C7);
  static const dangerLight = Color(0xFFFEE2E2);
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => FirebaseService()),
      ],
      child: MaterialApp(
        title: 'FounderOS',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.light,
          primaryColor: AppColors.primary,
          scaffoldBackgroundColor: AppColors.background,
          colorScheme: const ColorScheme.light(
            primary: AppColors.primary,
            secondary: AppColors.secondary,
            surface: AppColors.surface,
            error: AppColors.danger,
          ),
          fontFamily: 'Inter',
          appBarTheme: const AppBarTheme(
            backgroundColor: AppColors.surface,
            elevation: 0,
            scrolledUnderElevation: 0,
            iconTheme: IconThemeData(color: AppColors.textPrimary),
            titleTextStyle: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 17,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.3,
            ),
            systemOverlayStyle: SystemUiOverlayStyle(
              statusBarColor: Colors.transparent,
              statusBarIconBrightness: Brightness.dark,
            ),
          ),
          bottomNavigationBarTheme: const BottomNavigationBarThemeData(
            backgroundColor: AppColors.surface,
            selectedItemColor: AppColors.primary,
            unselectedItemColor: AppColors.textMuted,
            elevation: 0,
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: AppColors.background,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: AppColors.primary, width: 1.5),
            ),
            labelStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14),
            ),
          ),
          cardTheme: const CardTheme(
            color: AppColors.cardBg,
            elevation: 0,
          ),
          dividerColor: AppColors.border,
          dividerTheme: const DividerThemeData(color: AppColors.border, space: 1),
        ),
        home: const AuthStateWrapper(),
      ),
    );
  }
}

class AuthStateWrapper extends StatelessWidget {
  const AuthStateWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final firebaseService = Provider.of<FirebaseService>(context);

    if (firebaseService.isLoading && firebaseService.currentUser == null) {
      return const Scaffold(
        backgroundColor: AppColors.background,
        body: Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
    }

    if (firebaseService.isAuthenticated) {
      return const HomeScreen();
    } else {
      return const AuthScreen();
    }
  }
}
