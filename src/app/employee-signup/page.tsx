'use client';

import React, { useState } from 'react';
import { useAuth } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Loader2, UserPlus, ShieldCheck, Building2, Lock, Mail, User, Hash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// The admin's UID — this is the founder account (crabstertechnology@gmail.com)
// When an employee signs up with the correct invite code, their profile is linked to this admin.
const ADMIN_COMPANY_PROFILE_ID = 'primary-startup';

export default function EmployeeSignupPage() {
  const auth = useAuth();
  const [step, setStep] = useState<'invite' | 'details' | 'success'>('invite');
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [adminUid, setAdminUid] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [inviteRole, setInviteRole] = useState('Employee');
  const [inviteCompanyProfileId, setInviteCompanyProfileId] = useState(ADMIN_COMPANY_PROFILE_ID);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        setInviteCode(code.toUpperCase());
      }
    }
  }, []);

  const handleVerifyInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError('');
    setLoading(true);
    try {
      const db = getFirestore();
      const inviteRef = doc(db, 'inviteCodes', inviteCode.trim().toUpperCase());
      const snap = await getDoc(inviteRef);
      if (!snap.exists() || snap.data().used) {
        setInviteError('This invite link has already been used or is invalid. Please request a new invite from your admin.');
      } else {
        const data = snap.data();
        setAdminUid(data.adminUid);
        setCompanyName(data.companyName || 'EZCirkit');
        setInviteRole(data.role || 'Employee');
        setInviteCompanyProfileId(data.companyProfileId || ADMIN_COMPANY_PROFILE_ID);
        setStep('details');
      }
    } catch (err: any) {
      setInviteError('Failed to verify invite code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      const db = getFirestore();
      // Create Firebase Auth account
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      // Write employee profile to Firestore
      await setDoc(doc(db, 'employees', cred.user.uid), {
        uid: cred.user.uid,
        name,
        email,
        adminUid,
        companyProfileId: inviteCompanyProfileId,
        role: inviteRole,
        department: '',
        joinedAt: serverTimestamp(),
        isActive: true,
      });

      // Mark invite code as used
      await setDoc(doc(db, 'inviteCodes', inviteCode.trim().toUpperCase()), {
        used: true,
        usedBy: cred.user.uid,
        usedAt: serverTimestamp(),
      }, { merge: true });

      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-teal-50/30 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="bg-teal-600 text-white font-black text-xl w-10 h-10 flex items-center justify-center rounded-xl shadow">F</div>
          <span className="font-black text-2xl tracking-tighter">FOUNDER<span className="text-teal-600">OS</span></span>
        </div>

        {step === 'invite' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto">
                <Hash className="w-6 h-6 text-teal-600" />
              </div>
              <h1 className="text-2xl font-black text-slate-900">Join Your Team</h1>
              <p className="text-sm text-muted-foreground">Enter the invite code provided by your admin.</p>
            </div>
            <form onSubmit={handleVerifyInvite} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-xs uppercase tracking-widest">Invite Code</Label>
                <Input
                  placeholder="e.g. EZC-2026-XKQR"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  className="text-center font-mono text-lg tracking-widest h-12 uppercase"
                  required
                />
              </div>
              {inviteError && <p className="text-sm text-rose-500 font-semibold text-center">{inviteError}</p>}
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Verify Invite Code
              </Button>
            </form>
            <div className="text-center">
              <a href="/" className="text-xs text-muted-foreground hover:text-teal-600 font-semibold transition-colors">
                Already have an account? Sign In →
              </a>
            </div>
          </div>
        )}

        {step === 'details' && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto">
                <Building2 className="w-6 h-6 text-teal-600" />
              </div>
              <h1 className="text-2xl font-black text-slate-900">Create Your Account</h1>
              <p className="text-sm text-muted-foreground">
                You're joining <span className="font-bold text-teal-700">{companyName}</span>
              </p>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3" /> Invite Verified
                </div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                  inviteRole.toLowerCase() === 'manager'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                    : inviteRole.toLowerCase() === 'visitor'
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}>
                  Role: {inviteRole}
                </div>
              </div>
            </div>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-bold text-xs">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="e.g. Arun Kumar" value={name} onChange={e => setName(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs">Work Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} className="pl-10" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-bold text-xs">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input type="password" placeholder="Repeat password" value={confirm} onChange={e => setConfirm(e.target.value)} className="pl-10" required />
                </div>
              </div>
              {error && <p className="text-sm text-rose-500 font-semibold text-center">{error}</p>}
              <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold h-12 gap-2" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                {loading ? 'Creating Account...' : 'Create Employee Account'}
              </Button>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="bg-white border border-emerald-200 rounded-2xl shadow-lg p-10 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">You're In! 🎉</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your employee account has been created and linked to <span className="font-bold text-teal-700">{companyName}</span>.
              Your admin will assign tasks to you shortly.
            </p>
            <a href="/">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2 w-full h-12">
                Go to Dashboard →
              </Button>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
