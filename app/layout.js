import './globals.css';
import ThemeToggle from '@/components/ThemeToggle';
import EightyTwoBadge from '@/components/EightyTwoBadge';

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
          </div>
        </footer>
      </body>
    </html>
  );
}
