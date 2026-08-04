import type {Metadata} from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { TooltipProvider } from '@/components/ui/tooltip';
import { StrategicCopilotWidget } from '@/components/ai-advisor/StrategicCopilotWidget';

export const metadata: Metadata = {
  title: 'FounderOS — AI-Powered Startup Command Center',
  description: 'The complete operating system for Indian founders — AI strategic planning, valuation calculators, cap table management, and sales operations. Built for modern startups.',
  keywords: 'startup, founder, valuation, cap table, AI strategy, India startup, FounderOS',
  openGraph: {
    title: 'FounderOS — AI-Powered Startup Command Center',
    description: 'The complete operating system for Indian founders.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inter — primary typeface */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;0,14..32,900;1,14..32,400&family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#4f46e5" />
      </head>
      <body
        className="antialiased bg-background text-foreground"
        suppressHydrationWarning
        style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}
      >
        <FirebaseClientProvider>
          <TooltipProvider delayDuration={300}>
            {children}
            <StrategicCopilotWidget />
          </TooltipProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
