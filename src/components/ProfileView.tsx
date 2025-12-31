import { useState, useEffect } from 'react';
import RoutineManager from './RoutineManager';
import ScheduleEditor from './ScheduleEditor';
import ExerciseBuilder from './ExerciseBuilder';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import { QRCodeSVG } from 'qrcode.react';

export default function ProfileView() {
  const routines = useLiveQuery(() => db.routines.toArray());
  const profile = useLiveQuery(() => db.profile.toArray());
  const schedule = useLiveQuery(() => db.schedule.toArray()) ?? [];
  
  const [showRoutineMgr, setShowRoutineMgr] = useState(false);
  const [showScheduleEditor, setShowScheduleEditor] = useState(false);
  const [showExLibrary, setShowExLibrary] = useState(false); 
  
  const [newWeight, setNewWeight] = useState('');
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [showQR, setShowQR] = useState(false);

  // --- PWA INSTALL STATE ---
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const user = profile?.[0];

  // --- PWA LOGIC ---
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
        e.preventDefault();
        setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (installPrompt) {
        installPrompt.prompt();
        installPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === 'accepted') {
                setInstallPrompt(null);
            }
        });
    } else if (isIOS) {
        setShowIOSGuide(true);
    } else {
        alert("To install: Look for the 'Add to Home Screen' icon in your browser menu.");
    }
  };

  const handleWeightCheckin = async () => {
    if (!newWeight || !user?.id) return;
    await db.profile.update(user.id, { currentWeight: parseFloat(newWeight) });
    const dateKey = new Date().toISOString().slice(0, 10);
    const todayLog = await db.dailyLogs.where('date').equals(dateKey).first();
    if (todayLog && todayLog.id) {
        await db.dailyLogs.update(todayLog.id, { loggedWeight: parseFloat(newWeight) });
    } else {
        await db.dailyLogs.add({ date: dateKey, calories: 0, protein: 0, loggedWeight: parseFloat(newWeight) });
    }
    setNewWeight(''); setShowWeightInput(false);
  };

  const handleExport = async () => {
    const data = {
      version: 1,
      timestamp: Date.now(),
      exercises: await db.exercises.toArray(),
      sets: await db.sets.toArray(),
      profile: await db.profile.toArray(),
      routines: await db.routines.toArray(),
      schedule: await db.schedule.toArray(),
      dailyLogs: await db.dailyLogs.toArray()
    };
    
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const file = new File([blob], `ironlog_backup_${new Date().toISOString().slice(0,10)}.json`, { type: 'application/json' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
            await navigator.share({ files: [file], title: 'IronLog Backup', text: 'My IronLog Data' });
            return;
        } catch (err) { console.log('Share cancelled', err); }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ironlog_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const handleImport = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target?.result as string);
            if (!confirm(`Found backup from ${new Date(data.timestamp).toLocaleDateString()}. Overwrite current data?`)) return;
            
             await db.transaction('rw', [db.exercises, db.sets, db.profile, db.routines, db.schedule, db.dailyLogs], async () => {
                await db.exercises.clear(); await db.exercises.bulkAdd(data.exercises);
                await db.sets.clear(); await db.sets.bulkAdd(data.sets);
                await db.profile.clear(); await db.profile.bulkAdd(data.profile);
                await db.routines.clear(); await db.routines.bulkAdd(data.routines);
                await db.schedule.clear(); await db.schedule.bulkAdd(data.schedule);
                await db.dailyLogs.clear(); await db.dailyLogs.bulkAdd(data.dailyLogs);
            });
            alert("Data Restored Successfully!");
            window.location.reload();
        } catch (err) { alert("Invalid Backup File"); }
    };
    reader.readAsText(file);
  };

  const handleFactoryReset = async () => {
    if (confirm("⚠️ FACTORY RESET: Delete EVERYTHING?")) {
      await db.delete();
      window.location.reload();
    }
  };

  if (!user) return null;

  return (
    <div className="p-4 space-y-6 pb-32">
      <header>
        <h1 className="text-3xl font-black text-white italic tracking-tighter">
            COMMAND<span className="text-violet-500">CENTER</span>
        </h1>
      </header>

      {/* 1. PERSONAL STATS */}
      <div className="bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-violet-500/20 p-5 space-y-4 shadow-xl shadow-black/20">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
            <h3 className="font-bold text-white text-lg">Personal Stats</h3>
            <span className="text-xs text-zinc-500 font-mono tracking-widest uppercase">{user.name}</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
             <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="text-[9px] text-zinc-500 uppercase font-black tracking-wider">Start</div>
                <div className="text-lg font-bold text-zinc-400">{user.startingWeight}<span className="text-xs font-normal text-zinc-600">kg</span></div>
             </div>
             <div className="bg-violet-900/10 p-3 rounded-xl border border-violet-500/40 relative overflow-hidden group">
                <div className="absolute inset-0 bg-violet-500/10 blur-xl group-hover:bg-violet-500/20 transition-colors" />
                <div className="relative">
                    <div className="text-[9px] text-violet-400 uppercase font-black tracking-wider">Current</div>
                    <div className="text-xl font-black text-white">{user.currentWeight}<span className="text-xs font-normal text-zinc-400">kg</span></div>
                </div>
             </div>
             <div className="bg-black/40 p-3 rounded-xl border border-white/5">
                <div className="text-[9px] text-zinc-500 uppercase font-black tracking-wider">Goal</div>
                <div className="text-lg font-bold text-zinc-400">{user.goalWeight}<span className="text-xs font-normal text-zinc-600">kg</span></div>
             </div>
        </div>
        {!showWeightInput ? (
            <button onClick={() => setShowWeightInput(true)} className="w-full py-3 bg-zinc-800/50 hover:bg-zinc-800 text-xs font-bold rounded-xl text-zinc-300 border border-white/5 transition-colors">
                + Update Weight
            </button>
        ) : (
            <div className="flex gap-2 animate-in fade-in slide-in-from-top-2">
                <input type="number" value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="New Kg..." className="flex-1 bg-black border border-violet-500/50 rounded-xl px-4 text-white font-bold outline-none focus:ring-2 focus:ring-violet-500/50" autoFocus />
                <button onClick={handleWeightCheckin} className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-6 rounded-xl text-xs shadow-lg shadow-violet-900/20">Save</button>
            </div>
        )}
      </div>

      {/* 2. TARGETS */}
      <div className="bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-white/5 p-5 flex justify-between items-center shadow-lg">
          <div><div className="font-bold text-white">Daily Targets</div><div className="text-xs text-zinc-500">Auto-calculated for <span className="text-white capitalize">{user.goal}</span></div></div>
          <div className="text-right space-y-1"><div className="text-sm font-black text-violet-400 bg-violet-900/10 px-2 py-1 rounded border border-violet-500/20">{user.dailyCalorieTarget} kcal</div><div className="text-[10px] font-bold text-zinc-400">{user.dailyProteinTarget}g protein</div></div>
      </div>

      {/* 3. MANAGEMENT BUTTONS */}
      <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setShowRoutineMgr(true)} className="group relative overflow-hidden p-5 bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl text-white shadow-lg shadow-violet-900/30 active:scale-95 transition-all">
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex flex-col items-center justify-center gap-1 relative z-10"><span className="text-3xl filter drop-shadow-md">⚡</span><span className="text-[10px] font-black uppercase tracking-wider">Routines</span></div>
          </button>
          <button onClick={() => setShowExLibrary(true)} className="group p-5 bg-zinc-900 rounded-2xl text-zinc-300 border border-zinc-800 active:scale-95 transition-all hover:border-violet-500/50 hover:text-white">
            <div className="flex flex-col items-center justify-center gap-1"><span className="text-3xl opacity-50 group-hover:opacity-100 transition-opacity">📚</span><span className="text-[10px] font-black uppercase tracking-wider">Exercises</span></div>
          </button>
      </div>

      <button onClick={() => setShowScheduleEditor(true)} className="w-full p-4 mt-1 bg-zinc-900/80 backdrop-blur rounded-2xl text-zinc-200 font-bold uppercase flex justify-between items-center border border-zinc-800 active:scale-95 transition-transform hover:bg-zinc-800 hover:border-zinc-700">
        <div className="flex items-center gap-3"><span className="text-xl">📅</span><span className="text-xs font-black tracking-wide">Edit Weekly Schedule</span></div><span className="text-zinc-500 text-lg">›</span>
      </button>

      {/* 4. INSTALL APP BANNER */}
      {!isStandalone && (installPrompt || isIOS) && (
        <button onClick={handleInstallClick} className="w-full p-6 bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-900/20 active:scale-95 transition-transform flex items-center justify-center gap-3 animate-pulse">
            <span className="text-2xl">📲</span> Install App
        </button>
      )}

      {/* 5. DATA & SHARE */}
      <div className="grid grid-cols-2 gap-3 pt-6 border-t border-white/5">
        <button onClick={handleExport} className="p-4 bg-black/40 border border-zinc-800/50 rounded-xl font-bold text-xs text-zinc-400 hover:text-white hover:border-violet-500/30 transition-colors flex flex-col items-center gap-2"><span className="text-xl">📤</span> Backup Data</button>
        <label className="p-4 bg-black/40 border border-zinc-800/50 rounded-xl font-bold text-xs text-zinc-400 hover:text-white hover:border-violet-500/30 transition-colors flex flex-col items-center gap-2 cursor-pointer"><span className="text-xl">📥</span> Restore Data<input type="file" accept=".json" onChange={handleImport} className="hidden" /></label>
      </div>

      <button onClick={() => setShowQR(true)} className="w-full p-4 bg-violet-900/10 border border-violet-500/20 rounded-xl font-bold text-xs text-violet-300 flex justify-center items-center gap-2 hover:bg-violet-900/20 transition-colors">
        <span className="text-lg">📱</span> Show Share Code
      </button>

      <button onClick={handleFactoryReset} className="w-full p-4 border border-red-900/30 text-red-500 rounded-xl font-bold text-[10px] uppercase tracking-widest bg-red-950/5 hover:bg-red-950/20 mt-4 transition-colors">Factory Reset App</button>

      {/* MODALS */}
      {showRoutineMgr && <RoutineManager onClose={() => setShowRoutineMgr(false)} />}
      {showScheduleEditor && <ScheduleEditor routines={routines ?? []} schedule={schedule} onClose={() => setShowScheduleEditor(false)} />}
      {showExLibrary && <ExerciseBuilder onClose={() => setShowExLibrary(false)} />}
      
      {showQR && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-6 backdrop-blur-md" onClick={() => setShowQR(false)}>
            <div className="bg-white p-6 rounded-3xl flex flex-col items-center gap-4 shadow-2xl shadow-violet-500/20" onClick={e => e.stopPropagation()}>
                <h3 className="text-black font-black text-xl italic tracking-tighter">IRON<span className="text-violet-600">LOG</span></h3>
                <div className="p-2 bg-white rounded-xl border-2 border-black"><QRCodeSVG value={window.location.href} size={180} /></div>
                <button onClick={() => setShowQR(false)} className="text-zinc-500 font-bold mt-2 text-sm">Close</button>
            </div>
        </div>
      )}

      {/* IOS INSTALL GUIDE (Updated for better fit & 3-Step Process) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-end sm:items-center justify-center p-4 backdrop-blur-md animate-in slide-in-from-bottom duration-300" onClick={() => setShowIOSGuide(false)}>
            <div className="bg-zinc-900 border border-zinc-800 w-full max-w-sm p-6 rounded-3xl space-y-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                
                <button onClick={() => setShowIOSGuide(false)} className="absolute top-4 right-4 p-2 bg-zinc-800 rounded-full text-zinc-400 font-bold text-xs hover:bg-zinc-700">✕</button>

                <div className="text-center">
                    <h3 className="text-white font-black text-xl italic tracking-tighter">INSTALL<span className="text-violet-500">APP</span></h3>
                    <p className="text-zinc-500 text-xs mt-1">Add to Home Screen for the best experience.</p>
                </div>

                <div className="space-y-5">
                    {/* Step 1 */}
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-zinc-800 rounded-full font-bold text-white border border-zinc-700">1</div>
                        <div className="text-sm text-zinc-300">
                            Tap the <strong className="text-white">Share</strong> icon (or <strong className="text-white">•••</strong> on Chrome).
                            <div className="mt-2 flex gap-2 opacity-90">
                                <div className="bg-zinc-800 p-2 rounded border border-zinc-700"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg></div>
                                <div className="bg-zinc-800 p-2 rounded border border-zinc-700 flex items-center justify-center font-bold text-white leading-none tracking-widest text-xs h-[36px] min-w-[36px]">•••</div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-zinc-800 rounded-full font-bold text-white border border-zinc-700">2</div>
                        <div className="text-sm text-zinc-300">
                            Scroll down and tap <strong className="text-white">Add to Home Screen</strong>.
                            <div className="mt-2 bg-zinc-800 p-2 rounded border border-zinc-700 inline-flex items-center gap-2">
                               <span className="text-lg leading-none">⊞</span>
                               <span className="text-xs font-bold text-white">Add to Home Screen</span>
                            </div>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex items-start gap-4">
                        <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-zinc-800 rounded-full font-bold text-white border border-zinc-700">3</div>
                        <div className="text-sm text-zinc-300">
                            Tap <strong className="text-blue-400">Add</strong> in the top right corner.
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}