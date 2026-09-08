'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MatchCountdown({ timestamp, status }) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    let refreshed = false;
    function update() {
      const diff = timestamp - Date.now();
      if (diff <= 0) {
        setTimeLeft({ label: 'Starting soon', isSoon: true });
        if (!refreshed) {
          refreshed = true;
          router.refresh();
        }
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds, isSoon: false });
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timestamp, router]);

  if (!timeLeft || status === 'live') return null;

  if (timeLeft.isSoon) {
    return (
      <div className="rounded-xl border border-[#ff6b35]/30 bg-white dark:bg-[#0a0f1c] px-5 py-4 shadow-md text-center">
        <span className="text-sm font-black text-[#ff6b35] animate-pulse">📢 Match Kickoff: Starting Soon</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#1e2e48] bg-white dark:bg-[#0a0f1c]/80 backdrop-blur-md px-5 py-4 shadow-md">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-2">
          <Clock className="h-4.5 w-4.5 text-[#ff6b35]" />
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">82 Kickoff Countdown</span>
        </div>

        <div className="flex items-center gap-2">
          {timeLeft.days > 0 && (
            <div className="flex items-center">
              <div className="bg-slate-100 dark:bg-[#141c2e] border border-slate-200 dark:border-[#1e2e48] px-3 py-1.5 rounded-lg text-sm font-bold text-slate-800 dark:text-white font-mono tabular-nums shadow-inner">
                {timeLeft.days}
              </div>
              <span className="text-[10px] text-slate-400 font-black uppercase ml-1 mr-2">d</span>
            </div>
          )}
          
          <div className="flex items-center">
            <div className="bg-slate-100 dark:bg-[#141c2e] border border-slate-200 dark:border-[#1e2e48] px-3 py-1.5 rounded-lg text-sm font-bold text-slate-800 dark:text-white font-mono tabular-nums shadow-inner">
              {String(timeLeft.hours).padStart(2, '0')}
            </div>
            <span className="text-[10px] text-slate-400 font-black uppercase ml-1 mr-2">h</span>
          </div>

          <div className="flex items-center">
            <div className="bg-slate-100 dark:bg-[#141c2e] border border-slate-200 dark:border-[#1e2e48] px-3 py-1.5 rounded-lg text-sm font-bold text-slate-800 dark:text-white font-mono tabular-nums shadow-inner">
              {String(timeLeft.minutes).padStart(2, '0')}
            </div>
            <span className="text-[10px] text-slate-400 font-black uppercase ml-1 mr-2">m</span>
          </div>

          <div className="flex items-center">
            <div className="bg-slate-100 dark:bg-[#141c2e] border border-slate-200 dark:border-[#1e2e48] px-3 py-1.5 rounded-lg text-sm font-bold text-[#ff6b35] font-mono tabular-nums shadow-inner ring-1 ring-[#ff6b35]/25">
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
            <span className="text-[10px] text-slate-400 font-black uppercase ml-1">s</span>
          </div>
        </div>

      </div>
    </div>
  );
}
