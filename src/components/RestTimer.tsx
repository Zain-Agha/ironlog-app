import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RestTimer({ startTime }: { startTime: number | null }) {
  const [elapsed, setElapsed] = useState(0);
  const [notified, setNotified] = useState(false);
  const [isVisible, setIsVisible] = useState(true); // Can user close it?

  useEffect(() => {
    if (!startTime) return;
    
    // Reset Logic
    setElapsed(0);
    setNotified(false);
    setIsVisible(true);

    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - startTime) / 1000);
      setElapsed(seconds);

      // ALERT LOGIC: At 120 seconds (2 mins)
      if (seconds === 120 && !notified) {
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]); // Long buzz
        setNotified(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!startTime || !isVisible) return null;

  // Color Phases
  // 0-60s: Resting (Gray)
  // 60-120s: Ready (Green)
  // 120s+: Overtime (Red - Get back to work!)
  let statusColor = 'bg-zinc-800 text-zinc-400 border-zinc-700';
  let dotColor = 'bg-zinc-500';

  if (elapsed >= 60 && elapsed < 120) {
    statusColor = 'bg-green-900/80 text-green-500 border-green-500/50';
    dotColor = 'bg-green-500';
  } else if (elapsed >= 120) {
    statusColor = 'bg-red-900/80 text-red-500 border-red-500/50 animate-pulse'; // Urgent!
    dotColor = 'bg-red-500';
  }

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -50, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-4 right-4 z-[60]" 
      >
        <div className={`backdrop-blur-md border pl-4 pr-2 py-2 rounded-full shadow-2xl flex items-center gap-3 transition-colors duration-500 ${statusColor}`}>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${dotColor}`} />
            <span className="font-mono font-bold text-sm tracking-widest min-w-[3rem]">
                {formatTime(elapsed)}
            </span>
          </div>

          {/* CLOSE BUTTON */}
          <button 
            onClick={() => setIsVisible(false)}
            className="w-6 h-6 flex items-center justify-center rounded-full bg-black/20 hover:bg-black/40 text-xs"
          >
            ✕
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}