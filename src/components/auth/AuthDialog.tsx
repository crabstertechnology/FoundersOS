'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth, initiateEmailSignIn, initiateEmailSignUp } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthDialogProps {
  trigger?: React.ReactNode;
}

export function AuthDialog({ trigger }: AuthDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const auth = useAuth();
  const { toast } = useToast();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;

    setIsLoading(true);

    // First attempt a standard sign-in
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
          <Button variant="outline" className="gap-2 font-bold hover:bg-primary hover:text-white transition-colors">
            <LogIn className="w-4 h-4" />
            Sign In
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Founder Access
          </DialogTitle>
          <DialogDescription>
            Enter your authorized credentials to access the FounderOS dashboard.
          </DialogDescription>
        </DialogHeader>
        
        <div className="pt-4">
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="name@company.com" 
                  className="pl-10" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                  disabled={isLoading}
                  suppressHydrationWarning
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type="password" 
                  className="pl-10" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  disabled={isLoading}
                  suppressHydrationWarning
                />
              </div>
            </div>
            <Button type="submit" className="w-full gap-2 font-bold h-12" disabled={isLoading} suppressHydrationWarning>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In to Dashboard
                </>
              )}
            </Button>
          </form>
          
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 text-center">Access Restricted</p>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              FounderOS access is limited to pre-authorized startup accounts only.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
