'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, LayoutDashboard, BookOpen, Loader2, LogOut, User as UserIcon } from 'lucide-react';
import { ValuationCalculator } from '@/components/calculator/ValuationCalculator';
import { CapTableTracker } from '@/components/cap-table/CapTableTracker';
import { GlossarySection } from '@/components/glossary/GlossarySection';
import { AuthDialog } from '@/components/auth/AuthDialog';
import { useUser, useAuth, initiateAnonymousSignIn, initiateSignOut } from '@/firebase';
import { Button } from '@/components/ui/button';

export default function FounderOSPage() {
  const [activeTab, setActiveTab] = useState('calc');
  const { user, isUserLoading } = useUser();
  const auth = useAuth();

  useEffect(() => {
    if (!isUserLoading && !user && auth) {
      initiateAnonymousSignIn(auth);
    }
  }, [user, isUserLoading, auth]);

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground font-code uppercase tracking-widest text-xs">Initializing FounderOS Session...</p>
        </div>
      </div>
    );
  }

  const userId = user?.uid;
  const companyProfileId = 'primary-startup'; // For MVP, we use a single profile per user

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-border h-20 flex items-center px-6">
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-primary text-white font-headline font-bold text-xl px-2 py-0.5 rounded italic">F</div>
          <span className="font-headline font-extrabold text-xl tracking-tight hidden md:inline">FOUNDER<span className="text-primary">OS</span></span>
        </div>
        
        <div className="flex-1 flex justify-center">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mx-auto">
            <TabsList className="bg-transparent border-none gap-1">
              <TabsTrigger value="calc" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2 h-10 px-4">
                <Calculator className="w-4 h-4" />
                <span className="hidden sm:inline">Calculator</span>
              </TabsTrigger>
              <TabsTrigger value="tracker" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2 h-10 px-4">
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:inline">Cap Table</span>
              </TabsTrigger>
              <TabsTrigger value="glossary" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2 h-10 px-4">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Glossary</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {user && !user.isAnonymous ? (
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col items-end text-right">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Founder Account</span>
                <span className="text-xs font-medium truncate max-w-[150px]">{user.email}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => initiateSignOut(auth)} 
                title="Sign Out"
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <AuthDialog />
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        {!userId ? (
          <div className="flex items-center justify-center h-full py-20 italic text-muted-foreground">
            Please wait while we connect your session...
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="calc" className="mt-0 focus-visible:outline-none">
              <div className="mb-12 text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                  Startup <span className="text-primary">Valuation</span> Calculator
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Model your funding rounds, track unit economics, and get AI-powered strategic advice instantly.
                </p>
              </div>
              <ValuationCalculator userId={userId} companyProfileId={companyProfileId} />
            </TabsContent>
            
            <TabsContent value="tracker" className="mt-0 focus-visible:outline-none">
              <div className="mb-12 text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                  Cap <span className="text-primary">Table</span> Tracker
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Track ownership percentages, share types, and board control health checks.
                </p>
              </div>
              <CapTableTracker userId={userId} companyProfileId={companyProfileId} />
            </TabsContent>

            <TabsContent value="glossary" className="mt-0 focus-visible:outline-none">
              <div className="mb-12 text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
                  Founder's <span className="text-primary">Glossary</span>
                </h1>
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                  Master the jargon of VC funding with plain-English explanations and real-world examples.
                </p>
              </div>
              <GlossarySection />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="py-12 border-t mt-20 text-center text-sm text-muted-foreground bg-muted/30">
        <div className="font-code tracking-widest uppercase">FOUNDEROS · Built for Indian Startup Founders · Tamil Nadu Edition</div>
      </footer>
    </div>
  );
}
