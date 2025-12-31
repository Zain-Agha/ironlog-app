import { useState, useEffect } from 'react';
import { db, type Exercise } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';
import PlateCalculator from './PlateCalculator';
import { format } from 'date-fns';

interface Props {
  exercise: Exercise;
  onClose: () => void;
  onLog: () => void;
  backlogDate: Date; 
}

export default function ExerciseLogger({ exercise, onClose, onLog, backlogDate }: Props) {
  const [val1, setVal1] = useState(''); 
  const [val2, setVal2] = useState(''); 
  const [calories, setCalories] = useState(''); 
  const [showCalculator, setShowCalculator] = useState(false);

  const isCardio = exercise.category === 'cardio';
  const isIso = exercise.category === 'isometric';

  // Determine if we are logging for a past date
  const isBacklogging = backlogDate.toDateString() !== new Date().toDateString();

  // 1. Get bounds for the SELECTED date (Midnight to Midnight)
  const startOfSelectedDay = new Date(backlogDate);
  startOfSelectedDay.setHours(0, 0, 0, 0);
  const endOfSelectedDay = new Date(backlogDate);
  endOfSelectedDay.setHours(23, 59, 59, 999);

  // 2. Query sets for the SELECTED date
  const visibleSets = useLiveQuery(() => 
    db.sets
      .where('exerciseId')
      .equals(exercise.id!)
      .filter(set => set.timestamp >= startOfSelectedDay.getTime() && set.timestamp <= endOfSelectedDay.getTime())
      .toArray()
  , [backlogDate, exercise.id]);

  // 3. Ghost Sets: Find the last set EVER done
  const lastSet = useLiveQuery(async () => {
    return await db.sets
      .where('exerciseId')
      .equals(exercise.id!)
      .reverse() 
      .first();
  });

  useEffect(() => {
    if (lastSet && val1 === '' && val2 === '') {
      setVal1(lastSet.weight.toString());
      setVal2(lastSet.reps.toString());
    }
  }, [lastSet, val1, val2]);

  const handleSave = async () => {
    if (!val1 && !val2) return;

    const numericWeight = parseFloat(val1) || 0;

    // PR Logic
    if (!isCardio && !isIso && numericWeight > 0) {
        const history = await db.sets.where('exerciseId').equals(exercise.id!).toArray();
        const currentMax = history.reduce((max, s) => s.weight > max ? s.weight : max, 0);

        if (numericWeight > currentMax && history.length > 0) {
            if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]); 
            alert(`🏆 NEW PR! \n\nYou just smashed your record of ${currentMax}kg!`);
        }
    }

    // TIMESTAMP LOGIC
    const now = new Date();
    const targetTimestamp = new Date(backlogDate);
    targetTimestamp.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    await db.sets.add({
      exerciseId: exercise.id!,
      weight: numericWeight,
      reps: parseFloat(val2) || 0,
      calories: isCardio ? parseFloat(calories) : 0,
      isWarmup: false,
      timestamp: targetTimestamp.getTime() 
    });

    onLog(); 
    setCalories(''); 
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const handleDelete = (id: number) => {
    db.sets.delete(id);
  };

  const labels = isCardio 
    ? { v1: 'Distance (km)', v2: 'Time (min)' } 
    : isIso 
    ? { v1: 'Weight', v2: 'Time (sec)' } 
    : { v1: 'Weight', v2: 'Reps' };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-in slide-in-from-bottom duration-300">
      
      {/* HEADER */}
      <div className={`flex items-center justify-between p-4 pt-6 backdrop-blur-md border-b transition-colors duration-500 z-10 ${isBacklogging ? 'bg-blue-950/80 border-blue-500/20' : 'bg-zinc-950/80 border-white/5'}`}>
        <button onClick={onClose} className="text-zinc-400 p-2 text-sm font-bold flex items-center gap-1 hover:text-white transition-colors">
            <span className="text-xs">▼</span> Close
        </button>
        
        <div className="text-center">
            <h2 className="font-black text-xl text-white tracking-tight italic">{exercise.name}</h2>
            <div className={`text-[9px] uppercase font-black tracking-[0.2em] mt-0.5 flex justify-center items-center gap-1 ${isBacklogging ? 'text-blue-400' : 'text-zinc-500'}`}>
              {isBacklogging ? (
                  <><span>LOGGING FOR</span> <span className="text-white bg-blue-500/20 px-1 rounded">{format(backlogDate, 'MMM d').toUpperCase()}</span></>
              ) : (
                  exercise.category
              )}
            </div>
        </div>

        {!isCardio && !isIso ? (
            <button 
                onClick={() => setShowCalculator(true)}
                className="bg-zinc-900 hover:bg-zinc-800 text-zinc-400 text-[10px] font-bold px-3 py-2 rounded-lg border border-zinc-800 flex items-center gap-1 active:scale-95 transition-transform shadow-lg"
            >
                🧮 Calc
            </button>
        ) : (
            <div className="w-16"></div>
        )}
      </div>

      {/* LIST OF SETS */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
        {visibleSets?.length === 0 && (
             <div className="flex flex-col items-center justify-center h-40 text-zinc-700 space-y-2 opacity-50">
                 <span className="text-4xl">⚡</span>
                 <span className="text-xs font-bold uppercase tracking-widest">Start your set</span>
             </div>
        )}
        
        {visibleSets?.map((set, index) => (
          <div key={set.id} className="bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 relative shadow-md group">
            <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1">
                <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Set {index + 1}</span>
                <button onClick={() => handleDelete(set.id!)} className="text-zinc-600 hover:text-red-500 px-2 transition-colors">✕</button>
            </div>
            
            <div className="flex justify-between items-center">
                <div className="flex gap-8">
                    <div>
                      <div className="text-3xl font-black text-white leading-none tracking-tight">
                        {set.weight > 0 ? set.weight : (isCardio ? '0' : 'BW')}
                        <span className="text-xs text-zinc-500 font-bold ml-1 uppercase">
                          {isCardio ? 'km' : (set.weight > 0 ? 'kg' : '')}
                        </span>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-zinc-800"></div>
                    <div>
                      <div className="text-3xl font-black text-white leading-none tracking-tight">
                        {set.reps}
                        <span className="text-xs text-zinc-500 font-bold ml-1 uppercase">
                          {isCardio ? 'min' : isIso ? 'sec' : 'reps'}
                        </span>
                      </div>
                    </div>
                </div>

                {set.calories! > 0 && (
                    <div className="text-orange-400 font-bold text-xs bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20 flex items-center gap-1">
                        <span>🔥</span> {set.calories}
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>

      {/* INPUT AREA (Docked Bottom) */}
      <div className="bg-zinc-950 p-5 pb-safe border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] z-20">
        
        {/* Ghost Set Indicator */}
        {lastSet && (
             <div className="flex justify-center -mt-9 mb-4">
                <div className="text-[10px] text-zinc-400 bg-zinc-900/90 backdrop-blur px-4 py-1.5 rounded-full border border-zinc-700 flex items-center gap-2 shadow-xl animate-in fade-in slide-in-from-bottom-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                   Previous Best: <span className="text-white font-bold">
                     {lastSet.weight > 0 ? lastSet.weight : (isCardio ? '0' : 'BW')} 
                     {isCardio ? 'km' : (lastSet.weight > 0 ? 'kg' : '')} × {lastSet.reps}
                   </span>
                </div>
             </div>
        )}
        
        <div className="flex gap-4 mb-5 items-end">
          {/* Input 1 */}
          <div className="flex-1 group">
            <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest ml-1 mb-2 block group-focus-within:text-emerald-500 transition-colors">
                {labels.v1}
            </label>
            <div className="relative">
                <input 
                  type="number" 
                  value={val1}
                  onChange={e => setVal1(e.target.value)}
                  placeholder="0"
                  className={`w-full bg-zinc-900/50 border rounded-2xl p-5 text-4xl font-black text-center text-white focus:outline-none transition-all duration-300 placeholder:text-zinc-800 ${isBacklogging ? 'border-zinc-800 focus:border-blue-500 focus:bg-blue-900/10' : 'border-zinc-800 focus:border-emerald-500 focus:bg-emerald-900/10'}`}
                />
            </div>
          </div>

          {/* Input 2 */}
          <div className="flex-1 group">
            <label className="text-[9px] text-zinc-500 uppercase font-black tracking-widest ml-1 mb-2 block group-focus-within:text-emerald-500 transition-colors">
                {labels.v2}
            </label>
             <div className="relative">
                <input 
                  type="number" 
                  value={val2}
                  onChange={e => setVal2(e.target.value)}
                  placeholder="0"
                  className={`w-full bg-zinc-900/50 border rounded-2xl p-5 text-4xl font-black text-center text-white focus:outline-none transition-all duration-300 placeholder:text-zinc-800 ${isBacklogging ? 'border-zinc-800 focus:border-blue-500 focus:bg-blue-900/10' : 'border-zinc-800 focus:border-emerald-500 focus:bg-emerald-900/10'}`}
                />
             </div>
          </div>
        </div>

        {isCardio && (
             <div className="flex items-center gap-3 bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800 mb-5 focus-within:border-orange-500/50 transition-colors">
                <span className="text-xl pl-2 grayscale opacity-50">🔥</span>
                <input 
                    type="number" 
                    value={calories}
                    onChange={e => setCalories(e.target.value)}
                    placeholder="Calories burned..."
                    className="flex-1 bg-transparent border-none text-white font-bold text-lg outline-none placeholder:text-zinc-700"
                />
             </div>
        )}

        <button 
          onClick={handleSave}
          className={`w-full text-zinc-950 font-black py-5 rounded-2xl text-lg uppercase tracking-[0.1em] active:scale-[0.98] transition-all shadow-xl hover:shadow-2xl relative overflow-hidden group ${isBacklogging ? 'bg-blue-500 shadow-blue-900/20' : 'bg-emerald-500 shadow-emerald-900/20'}`}
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 backdrop-blur-sm" />
          <span className="relative z-10">
            {isBacklogging ? `LOG TO ${format(backlogDate, 'MMM d')}` : 'LOG SET'}
          </span>
        </button>
      </div>

      {showCalculator && (
        <PlateCalculator onClose={() => setShowCalculator(false)} />
      )}
    </div>
  );
}