import { useState, useEffect } from 'react';
import { db } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

interface Props {
  customDate?: Date; // New prop from App.tsx
}

export default function DailyTracker({ customDate }: Props) {
  // Use customDate if provided, otherwise default to now
  const activeDate = customDate || new Date();
  const dateKey = activeDate.toISOString().slice(0, 10); 
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  const profile = useLiveQuery(() => db.profile.toArray());
  const todayLog = useLiveQuery(() => db.dailyLogs.where('date').equals(dateKey).first(), [dateKey]);
  
  const [cals, setCals] = useState('');
  const [prot, setProt] = useState('');

  const user = profile?.[0];

  // Sync inputs with the selected date's data
  useEffect(() => {
    if (todayLog) {
        setCals(todayLog.calories.toString());
        setProt(todayLog.protein.toString());
    } else {
        setCals('');
        setProt('');
    }
  }, [todayLog, dateKey]); // Reset when dateKey changes

  const handleSave = async () => {
    const data = {
        date: dateKey,
        calories: Number(cals) || 0,
        protein: Number(prot) || 0,
        loggedWeight: todayLog?.loggedWeight
    };

    if (todayLog && todayLog.id) {
        await db.dailyLogs.update(todayLog.id, data);
    } else {
        await db.dailyLogs.add(data);
    }
    setIsExpanded(false);
  };

  if (!user) return null;

  const currentCals = todayLog?.calories || 0;
  const targetCals = user.dailyCalorieTarget || 2000;
  const calRatio = currentCals / targetCals;
  const calPct = Math.min(calRatio * 100, 100);

  const currentProt = todayLog?.protein || 0;
  const targetProt = user.dailyProteinTarget || 150;
  const protRatio = currentProt / targetProt;
  const protPct = Math.min(protRatio * 100, 100);

  let calColor = 'bg-zinc-700';
  let protColor = 'bg-zinc-700';

  if (protRatio < 0.5) protColor = 'bg-rose-500';
  else if (protRatio < 1.0) protColor = 'bg-amber-500';
  else protColor = 'bg-emerald-500';

  if (user.goal === 'loss') {
    if (calRatio < 0.5) calColor = 'bg-emerald-500';
    else if (calRatio < 1.0) calColor = 'bg-amber-500';
    else calColor = 'bg-rose-500';
  } else {
    if (calRatio < 0.5) calColor = 'bg-rose-500';
    else if (calRatio < 1.0) calColor = 'bg-amber-500';
    else calColor = 'bg-emerald-500';
  }

  if (!isExpanded) {
    return (
        <div onClick={() => setIsExpanded(true)} className="mx-4 mb-2 bg-zinc-900/60 backdrop-blur-md rounded-xl border border-zinc-800 p-4 cursor-pointer active:scale-98 transition-transform">
            <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-tighter">Fuel Status ({dateKey})</span>
            </div>
            
            <div className="mb-3">
                <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-white">{currentCals} kcal</span>
                    <span className="text-zinc-500">MAX {targetCals}</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-700 ${calColor}`} style={{ width: `${calPct}%` }} />
                </div>
            </div>

            <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-white">{currentProt}g Prot</span>
                    <span className="text-zinc-500">GOAL {targetProt}g</span>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div className={`h-full transition-all duration-700 ${protColor}`} style={{ width: `${protPct}%` }} />
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="mx-4 mb-2 bg-zinc-900 rounded-xl border border-zinc-800 p-4 space-y-4 animate-in slide-in-from-top-2">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <h3 className="font-bold text-white">Log for {dateKey}</h3>
            <button onClick={() => setIsExpanded(false)} className="text-xs text-zinc-500 font-bold">Close</button>
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500">Calories</label>
                <div className="relative">
                    <input type="number" value={cals} onChange={e => setCals(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white font-bold outline-none focus:border-emerald-500" placeholder="0" />
                </div>
            </div>
            <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500">Protein (g)</label>
                <div className="relative">
                    <input type="number" value={prot} onChange={e => setProt(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white font-bold outline-none focus:border-blue-500" placeholder="0" />
                </div>
            </div>
        </div>
        <button onClick={handleSave} className="w-full py-3 bg-white text-black font-bold rounded-lg">Save Log</button>
    </div>
  );
}