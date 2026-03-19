'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LogIn, Mail, Lock } from 'lucide-react';
import { useAuth, initiateEmailSignIn } from '@/firebase';

interface AuthDialogProps {
  trigger?: React.ReactNode;
}

export function AuthDialog({ trigger }: AuthDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  // Pre-filling the credentials as requested for the prototype
  const [email, setEmail] = useState('crabstertechnology@gmail.com');
  const [password, setPassword] = useState('Sasipriya2118&');
  const auth = useAuth();

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (auth) {
      initiateEmailSignIn(auth, email, password);
    }
    setIsOpen(false);
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
          <DialogTitle className="font-headline text-2xl font-bold">Founder Access</DialogTitle>
          <DialogDescription>
            Enter your credentials to access the FounderOS dashboard.
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
                />
              </div>
            </div>
            <Button type="submit" className="w-full gap-2 font-bold">
              <LogIn className="w-4 h-4" />
              Sign In to Dashboard
            </Button>
          </form>
          
          <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 text-center">Security Notice</p>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              New account registration is currently restricted to authorized founders only.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
