import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../main.dart';
import '../services/firebase_service.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _isSignUp = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  void _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final svc = Provider.of<FirebaseService>(context, listen: false);
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final name = _nameController.text.trim();
    bool success;
    if (_isSignUp) {
      success = await svc.registerWithEmail(email, password, name);
    } else {
      success = await svc.signInWithEmail(email, password);
    }
    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(svc.errorMessage ?? 'Authentication failed'),
        backgroundColor: AppColors.danger,
      ));
    }
  }

  void _bypass() async {
    final svc = Provider.of<FirebaseService>(context, listen: false);
    await svc.signInAnonymously();
  }

  @override
  Widget build(BuildContext context) {
    final svc = Provider.of<FirebaseService>(context);
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // — Brand Header —
                Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [AppColors.primary, AppColors.secondary],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 20, spreadRadius: 2)],
                  ),
                  child: const Center(
                    child: Text('F', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 36)),
                  ),
                ),
                const SizedBox(height: 20),
                const Text('FounderOS', style: TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: AppColors.textPrimary, letterSpacing: -0.5)),
                const Text('Strategic Command Console', style: TextStyle(fontSize: 12, color: AppColors.textMuted, letterSpacing: 1.2, fontWeight: FontWeight.w500)),
                const SizedBox(height: 36),

                // — Auth Card —
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: AppColors.cardBg,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.border),
                    boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 4))],
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          _isSignUp ? 'Create Workspace' : 'Welcome Back',
                          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: AppColors.textPrimary),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _isSignUp ? 'Set up your founder account' : 'Sign in to your console',
                          style: const TextStyle(fontSize: 13, color: AppColors.textMuted),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 24),
                        if (_isSignUp) ...[
                          _FieldLabel('Full Name'),
                          TextFormField(
                            controller: _nameController,
                            decoration: _dec('e.g. Sasitharan', LucideIcons.user),
                            validator: (v) => v == null || v.isEmpty ? 'Name required' : null,
                          ),
                          const SizedBox(height: 14),
                        ],
                        _FieldLabel('Email Address'),
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          decoration: _dec('you@startup.com', LucideIcons.mail),
                          validator: (v) => v == null || !v.contains('@') ? 'Invalid email' : null,
                        ),
                        const SizedBox(height: 14),
                        _FieldLabel('Password'),
                        TextFormField(
                          controller: _passwordController,
                          obscureText: _obscurePassword,
                          decoration: _dec('Min 6 characters', LucideIcons.lock, suffix: IconButton(
                            icon: Icon(_obscurePassword ? LucideIcons.eyeOff : LucideIcons.eye, size: 18, color: AppColors.textMuted),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          )),
                          validator: (v) => v == null || v.length < 6 ? 'Min 6 characters' : null,
                        ),
                        const SizedBox(height: 22),
                        SizedBox(
                          height: 48,
                          child: ElevatedButton(
                            onPressed: svc.isLoading ? null : _submit,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                            child: svc.isLoading
                                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                : Text(_isSignUp ? 'Create Account' : 'Sign In',
                                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                          ),
                        ),
                        const SizedBox(height: 14),
                        Center(
                          child: TextButton(
                            onPressed: () => setState(() => _isSignUp = !_isSignUp),
                            child: Text(
                              _isSignUp ? 'Already have an account? Sign In' : 'New founder? Create workspace',
                              style: const TextStyle(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.w600),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                // — Demo bypass —
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: OutlinedButton.icon(
                    onPressed: svc.isLoading ? null : _bypass,
                    icon: const Icon(LucideIcons.zap, size: 16, color: AppColors.warning),
                    label: const Text('Bypass — Demo Mode', style: TextStyle(fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.border),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      backgroundColor: AppColors.cardBg,
                    ),
                  ),
                ),
                const SizedBox(height: 32),
                const Text('FounderOS · Built for Indian Founders', style: TextStyle(fontSize: 11, color: AppColors.textMuted, letterSpacing: 0.5)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _dec(String hint, IconData icon, {Widget? suffix}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: AppColors.textMuted, fontSize: 13),
      prefixIcon: Icon(icon, size: 17, color: AppColors.textMuted),
      suffixIcon: suffix,
    );
  }
}

class _FieldLabel extends StatelessWidget {
  final String text;
  const _FieldLabel(this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(text, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: AppColors.textSecondary)),
  );
}
