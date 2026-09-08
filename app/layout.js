import './globals.css';
import ThemeToggle from '@/components/ThemeToggle';
import EightyTwoBadge from '@/components/EightyTwoBadge';
import { Database } from 'lucide-react';

export const metadata = {
  title: '82 LIVE FOOTBALL — Real-Time Sports Aggregator',
  description: 'Watch live football matches free on 82 LIVE FOOTBALL. Real-time scores, atomic precision stats, and premium ad-free streams powered by Eighty-Two.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#ff6b35" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const saved = localStorage.getItem('theme');
                if (saved === 'light' || (!saved && window.matchMedia('(prefers-color-scheme: light)').matches)) {
                  document.documentElement.classList.remove('dark');
                } else {
                  document.documentElement.classList.add('dark');
                }
              } catch (_) {}
            `
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.error('SW registration failed:', err);
                  });
                });
              }
            `
          }}
        />
      </head>
      <body className="antialiased min-h-screen relative bg-slate-50 text-slate-900 dark:bg-[#07090f] dark:text-slate-100 flex flex-col items-center transition-colors duration-300 w-full" suppressHydrationWarning>
        {/* 82 Atmosphere Glow Effects */}
        <div className="glow-orb glow-orb-orange w-[600px] h-[600px] -top-[200px] -left-[150px] transition-opacity duration-300" />
        <div className="glow-orb glow-orb-navy w-[600px] h-[600px] top-[30%] -right-[150px] transition-opacity duration-300" />
        <div className="glow-orb glow-orb-orange w-[500px] h-[500px] -bottom-[200px] left-[15%] transition-opacity duration-300" />

        {/* Sticky Glassmorphic Header with 82 Badge */}
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 dark:border-[#1e2e48]/70 dark:bg-[#0a0f1c]/80 backdrop-blur-md transition-colors duration-300 flex justify-center w-full shadow-sm">
          <div className="flex h-16 w-full max-w-6xl mx-auto items-center justify-between px-4 sm:px-6 lg:px-8">
            <a href="/" className="flex items-center gap-3 group transition-all">
              <div className="relative flex items-center justify-center filter drop-shadow-[0_0_10px_rgba(255,107,53,0.35)] group-hover:drop-shadow-[0_0_16px_rgba(255,107,53,0.65)] group-hover:scale-105 transition-all">
                <EightyTwoBadge size={42} speed={1.2} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[17px] font-black tracking-tight text-slate-900 dark:text-white group-hover:text-[#ff6b35] dark:group-hover:text-[#ff6b35] transition-colors">
                    82 <span className="text-[#ff6b35]">LIVE</span> FOOTBALL
                  </span>
                </div>
                <span className="text-[9.5px] text-slate-500 dark:text-[#8a96b8] font-semibold -mt-1 tracking-widest uppercase">
                  Eighty-Two Aggregator
                </span>
              </div>
            </a>
            
            <div className="flex items-center gap-3.5">
              <a 
                href="/multistream" 
                className="text-xs font-extrabold px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#ff6b35] to-[#e0531f] hover:from-[#ff8554] hover:to-[#ff6b35] text-white shadow-[0_0_14px_rgba(255,107,53,0.35)] hover:shadow-[0_0_20px_rgba(255,107,53,0.6)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
              >
                Multi-View
              </a>
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Content wrapper */}
        <main className="relative z-10 w-full flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8 flex-1">
          <div className="w-full max-w-6xl mx-auto flex flex-col items-stretch">
            {children}
          </div>
        </main>

        {/* 82 Footer */}
        <footer className="relative z-10 border-t border-slate-200/80 dark:border-[#1e2e48]/70 py-8 px-4 bg-white/70 dark:bg-[#07090f]/95 transition-all duration-300 flex justify-center w-full">
          <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left text-xs text-slate-500 dark:text-[#8a96b8] px-4">
            <div className="flex items-center gap-2">
              <EightyTwoBadge size={22} isStatic={true} />
              <p>© {new Date().getFullYear()} <strong>82 LIVE FOOTBALL</strong> &middot; Eighty-Two Limited. All streaming feeds aggregated for validation & performance research.</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <a 
                href="/api-hub" 
                className="font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2e48] bg-slate-50/70 dark:bg-[#141c2e]/70 text-slate-700 dark:text-slate-300 hover:text-[#ff6b35] dark:hover:text-[#ff6b35] hover:border-[#ff6b35]/40 dark:hover:border-[#ff6b35]/40 hover:bg-[#ff6b35]/10 dark:hover:bg-[#ff6b35]/10 active:scale-95 transition-all"
              >
                <Database className="h-3.5 w-3.5 text-[#ff6b35]" />
                <span>82 API Hub</span>
              </a>
              <a 
                href="https://github.com/OgBek/footyLive" 
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2e48] bg-slate-50/70 dark:bg-[#141c2e]/70 text-slate-700 dark:text-slate-300 hover:text-[#ff6b35] dark:hover:text-[#ff6b35] hover:border-[#ff6b35]/40 dark:hover:border-[#ff6b35]/40 hover:bg-[#ff6b35]/10 dark:hover:bg-[#ff6b35]/10 active:scale-95 transition-all"
              >
                <svg className="h-3.5 w-3.5 fill-current text-[#ff6b35]" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.43.372.82 1.102.82 2.222v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span>GitHub</span>
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
