import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils'; 

interface LayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface NavTabProps {
  id: string;
  label: string;
  activeTab: string;
  onClick: (id: string) => void;
  icon: (active: boolean) => ReactNode; 
  themeColor: string; 
}

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  
  // 1. Dynamic Background Logic
  const getTheme = () => {
    switch(activeTab) {
      case 'history': return 'bg-gradient-to-b from-cyan-950/30 via-zinc-950 to-zinc-950'; 
      case 'profile': return 'bg-gradient-to-b from-violet-950/30 via-zinc-950 to-zinc-950'; 
      default: return 'bg-gradient-to-b from-emerald-950/30 via-zinc-950 to-zinc-950'; 
    }
  };

  // 2. Dynamic Dock Glow
  const getDockTint = () => {
    switch(activeTab) {
      case 'history': return 'shadow-cyan-500/10 border-cyan-500/20';
      case 'profile': return 'shadow-violet-500/10 border-violet-500/20';
      default: return 'shadow-emerald-500/10 border-emerald-500/20';
    }
  };

  return (
    <div className={cn(
      "flex flex-col h-screen font-sans overflow-hidden transition-colors duration-1000 ease-in-out bg-zinc-950",
      getTheme()
    )}>
      
      {/* Main Content 
          FIX APPLIED: Increased padding to pb-36. 
          This ensures the last item in your list can be scrolled UP past the floating notch.
      */}
      <main className="flex-1 overflow-y-auto pb-36 scrollbar-hide z-10 relative">
        {children}
      </main>

      {/* Premium Glass Dock 
          FIX APPLIED: 'pointer-events-none' on the wrapper. 
          This allows you to click buttons/items that are visually "behind" the empty spaces of the dock row.
      */}
      <nav className="fixed bottom-0 w-full z-40 px-4 pb-6 pt-2 pointer-events-none">
        <div className={cn(
          "mx-auto max-w-md bg-zinc-900/80 backdrop-blur-xl border rounded-2xl shadow-2xl transition-all duration-500 pointer-events-auto", // <--- pointer-events-auto re-enables clicks ONLY on the dock itself
          getDockTint()
        )}>
          <div className="flex justify-around items-center h-16 relative">
            
            {/* JOURNAL TAB */}
            <NavTab 
              id="history" 
              label="Journal" 
              activeTab={activeTab} 
              onClick={onTabChange}
              themeColor="text-cyan-400"
              icon={(active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              )}
            />

            {/* TRAIN BUTTON (Center Notch) */}
            <div className="relative -top-5 group">
              <div className={cn(
                "absolute inset-0 rounded-full blur-xl opacity-40 transition-all duration-500",
                activeTab === 'workout' ? "bg-emerald-500 scale-150" : "bg-transparent scale-100"
              )} />
              
              <button 
                onClick={() => onTabChange('workout')}
                className={cn(
                  "relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl border-4 border-zinc-950",
                  activeTab === 'workout' 
                    ? "bg-emerald-500 text-black shadow-emerald-500/40 scale-110 rotate-0" 
                    : "bg-zinc-800 text-zinc-400 border-zinc-900 hover:bg-zinc-700 -rotate-12 hover:rotate-0"
                )}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path d="M4 7a1 1 0 011-1h1a1 1 0 011 1v1h10V7a1 1 0 011-1h1a1 1 0 011 1v10a1 1 0 01-1 1h-1a1 1 0 01-1-1v-1H7v1a1 1 0 01-1 1H5a1 1 0 01-1-1V7z" opacity="0.3" />
                  <path fillRule="evenodd" d="M5.5 6a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h2a.5.5 0 00.5-.5V12h8v5.5a.5.5 0 00.5.5h2a.5.5 0 00.5-.5v-11a.5.5 0 00-.5-.5h-2a.5.5 0 00-.5.5V11H8V6.5a.5.5 0 00-.5-.5h-2z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* YOU TAB */}
            <NavTab 
              id="profile" 
              label="You" 
              activeTab={activeTab} 
              onClick={onTabChange}
              themeColor="text-violet-400"
              icon={(active: boolean) => (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? 0 : 2} className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              )}
            />

          </div>
        </div>
      </nav>
    </div>
  );
}

// Sub-component for individual tabs
function NavTab({ id, label, activeTab, onClick, icon, themeColor }: NavTabProps) {
  const isActive = activeTab === id;

  const getGlowColor = () => {
    switch(id) {
        case 'history': return 'bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.6)]';
        case 'profile': return 'bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.6)]';
        default: return 'bg-emerald-500 shadow-emerald-500/50';
    }
  };

  return (
    <button 
      onClick={() => onClick(id)}
      className="relative flex flex-col items-center justify-center w-16 h-full cursor-pointer outline-none group"
    >
      {isActive && (
        <motion.div 
          layoutId="nav-highlight"
          className={cn(
            "absolute -top-1 w-8 h-1 rounded-full",
            getGlowColor()
          )}
          initial={false}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      )}

      <span className={cn(
        "transition-colors duration-300 mb-1",
        isActive ? themeColor : "text-zinc-500 group-hover:text-zinc-300"
      )}>
        {icon(isActive)}
      </span>

      <span className={cn(
        "text-[10px] font-bold tracking-wide transition-colors duration-300",
        isActive ? "text-white" : "text-zinc-600"
      )}>
        {label}
      </span>
    </button>
  );
}