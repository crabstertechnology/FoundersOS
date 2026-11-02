import type {Metadata} from 'next';
import './globals.css';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { TooltipProvider } from '@/components/ui/tooltip';

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
        {/* Typography: Google Sans (Display & Headings), Google Sans Text (UI & Body), Roboto, Plus Jakarta Sans */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,700&family=Google+Sans+Text:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,700&family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Inter:ital,opsz,wght@0,14..32,300..900;1,14..32,300..900&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#4f46e5" />
      </head>
      <body
        className="antialiased bg-background text-foreground"
        suppressHydrationWarning
        style={{ fontFamily: "'Google Sans Text', 'Google Sans', 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
      >
        <FirebaseClientProvider>
          <TooltipProvider delayDuration={300}>
            {children}
          </TooltipProvider>
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
