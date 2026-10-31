'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, UserPlus, Mail, Lock, Loader2, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth, initiateEmailSignIn, initiateEmailSignUp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthDialogProps {
  trigger?: React.ReactNode;
}

export function AuthDialog({ trigger }: AuthDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsLoading(true);

    if (mode === 'signup') {
      initiateEmailSignUp(auth, email, password)
        .then(() => {
          setIsOpen(false);
          setIsLoading(false);
          toast({
            title: "Account Created",
            description: "Welcome to FounderOS! Your account has been created successfully.",
          });
        })
        .catch((signUpErr: any) => {
          setIsLoading(false);
          toast({
            variant: "destructive",
            title: "Sign Up Error",
            description: signUpErr.message || "Failed to create account. Please check your details and try again.",
          });
        });
      return;
    }

    // Standard Sign In
    initiateEmailSignIn(auth, email, password)
      .then(() => {
        setIsOpen(false);
        setIsLoading(false);
      })
      .catch((signInErr: any) => {
        // Fallback to auto-signup for authorized founder email
        const isUserNotFound = signInErr.code === 'auth/user-not-found' || 
                             signInErr.code === 'auth/invalid-credential';

        if (isUserNotFound && email === 'crabstertechnology@gmail.com') {
          initiateEmailSignUp(auth, email, password)
            .then(() => {
              setIsOpen(false);
              setIsLoading(false);
              toast({
                title: "Welcome, Founder",
                description: "Your authorized account has been initialized successfully.",
              });
            })
            .catch((signUpErr: any) => {
              setIsLoading(false);
              toast({
                variant: "destructive",
                title: "Access Denied",
                description: signUpErr.message || "Failed to initialize authorized account.",
              });
            });
        } else {
          setIsLoading(false);
          toast({
            variant: "destructive",
            title: "Sign In Error",
            description: signInErr.message || "Please check your credentials and try again.",
          });
        }
      });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2 font-bold rounded-full px-5 h-10 border-slate-200 hover:bg-primary hover:text-white transition-all shadow-xs">
            <LogIn className="w-4 h-4" />
            Sign In
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[440px] rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-2xl bg-white overflow-hidden">
        <DialogHeader className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto shadow-xs">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
          </div>
          <DialogTitle className="font-headline text-2xl font-black text-slate-900 tracking-tight">
            {mode === 'signin' ? 'Welcome Back' : 'Create Founder Account'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 font-medium">
            {mode === 'signin' 
              ? 'Enter your credentials to access the FounderOS console.' 
              : 'Sign up to build, scale, and manage your startup roadmap.'}
          </DialogDescription>
        </DialogHeader>

        {/* Curvy Tab Switcher */}
        <div className="flex p-1 bg-slate-100 rounded-full mt-2">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
              mode === 'signin'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 text-xs font-bold rounded-full transition-all ${
              mode === 'signup'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
        </div>
        
        <div className="pt-2">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-700">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  className="pl-11 h-12 rounded-full bg-slate-50/70 border-slate-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  disabled={isLoading}
                  suppressHydrationWarning
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-bold text-slate-700">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  className="pl-11 h-12 rounded-full bg-slate-50/70 border-slate-200 text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  disabled={isLoading}
                  suppressHydrationWarning
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full gap-2 font-black text-sm h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25 transition-all mt-2" 
              disabled={isLoading} 
              suppressHydrationWarning
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {mode === 'signin' ? 'Authenticating...' : 'Creating Account...'}
                </>
              ) : mode === 'signin' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to Dashboard
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create My Account
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-5 p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100/70 text-center space-y-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-indigo-950 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-indigo-600" /> Secure Founder Workspace
            </p>
            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
              Equipped with automated 12-month roadmaps, equity modeling, and live CRM feeds.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
