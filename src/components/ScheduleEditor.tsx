import { useState } from 'react';
import { db, type Routine, type Schedule } from '../db';

interface Props {
  routines: Routine[];
  schedule: Schedule[];
  onClose: () => void;
}

export default function ScheduleEditor({ routines, schedule, onClose }: Props) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // --- DEFENSIVE HELPER ---
  // We ensure this never returns a "partial" or "undefined" object that could break the UI
  const getRoutineForDay = (dayIndex: number) => {
    if (!schedule || !routines) return null;
    
    const schedEntry = schedule.find(s => s.dayIndex === dayIndex);
    if (!schedEntry || !schedEntry.routineId) return null;

    // Find the routine by ID
    const foundRoutine = routines.find(r => r.id === schedEntry.routineId);
    
    // If the schedule points to a routine that no longer exists, 
    // we return null and (optionally) we could even clean up the DB here.
    return foundRoutine || null;
  };

  const assignRoutine = async (routineId: number | 'rest') => {
    if (selectedDay === null) return;

    // Find if an entry already exists for this day index
    const entry = schedule.find(s => s.dayIndex === selectedDay);
    const rId = routineId === 'rest' ? null : routineId;

    try {
        if (entry && entry.id) {
            // Update the day with the new routine ID (or null for rest)
            await db.schedule.update(entry.id, { routineId: rId });
        } else {
            // Create a new schedule entry if for some reason it's missing
            await db.schedule.add({ dayIndex: selectedDay, routineId: rId });
        }
        
        // Haptic feedback for a successful assignment
        if (navigator.vibrate) navigator.vibrate(30);
        
        // Close the selection drawer
        setSelectedDay(null);
    } catch (err) {
        console.error("Failed to assign routine:", err);
        alert("Schedule update failed. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center p-6 backdrop-blur-md">
      <div className="bg-zinc-900 w-full max-w-sm rounded-3xl p-6 border border-zinc-800 shadow-2xl space-y-6 max-h-[85vh] flex flex-col">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
            <div>
                <h2 className="text-xl font-bold text-white">Weekly Split</h2>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Assign your routines</p>
            </div>
            <button 
                onClick={onClose} 
                className="bg-zinc-800 text-zinc-100 px-4 py-2 rounded-xl font-bold text-sm active:scale-95 transition-transform"
            >
                Done
            </button>
        </div>

        {/* LIST OF DAYS */}
        <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
            
            {/* ALERT IF NO ROUTINES EXIST */}
            {routines.length === 0 && (
                <div className="p-4 bg-amber-900/20 text-amber-500 text-xs rounded-2xl border border-amber-500/20 mb-4 animate-pulse">
                    <strong>Notice:</strong> You haven't created any Routines yet. Go back to "Manage Routines" to create your workouts first.
                </div>
            )}

            {days.map((day, idx) => {
                const activeRoutine = getRoutineForDay(idx);
                const isSelected = selectedDay === idx;

                return (
                    <div 
                        key={day} 
                        className={`flex flex-col rounded-2xl border transition-all duration-300 ${
                            isSelected ? 'bg-zinc-800 border-zinc-600 p-4' : 'bg-zinc-950 border-zinc-800 p-3'
                        }`}
                    >
                        <div className="flex justify-between items-center">
                            <span className={`font-bold transition-colors ${isSelected ? 'text-white' : 'text-zinc-500'}`}>
                                {day}
                            </span>
                            <button 
                                onClick={() => setSelectedDay(isSelected ? null : idx)}
                                className={`text-sm font-black uppercase tracking-tighter px-3 py-1 rounded-lg transition-all ${
                                    activeRoutine 
                                    ? 'text-emerald-400 bg-emerald-500/10' 
                                    : 'text-zinc-600 bg-zinc-900'
                                }`}
                            >
                                {activeRoutine ? activeRoutine.name : 'Rest Day'} {isSelected ? '▾' : '›'}
                            </button>
                        </div>

                        {/* SELECTION DRAWER */}
                        {isSelected && (
                            <div className="pt-4 mt-3 border-t border-zinc-700 space-y-4 animate-in slide-in-from-top-2">
                                <div className="flex flex-wrap gap-2">
                                    {/* Option: Set as Rest */}
                                    <button 
                                        onClick={() => assignRoutine('rest')} 
                                        className="px-4 py-2 bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-600 hover:bg-zinc-600"
                                    >
                                        Set as Rest Day
                                    </button>
                                    
                                    {/* Option: Pick from Routines */}
                                    {routines.map(r => (
                                        <button 
                                            key={r.id} 
                                            onClick={() => assignRoutine(r.id!)} 
                                            className="px-4 py-2 bg-emerald-500 text-black text-xs font-black uppercase rounded-xl shadow-lg shadow-emerald-900/20 active:scale-95 transition-transform"
                                        >
                                            {r.name}
                                        </button>
                                    ))}
                                </div>
                                
                                {routines.length > 0 && (
                                    <p className="text-[9px] text-zinc-500 text-center italic">
                                        Selecting a routine will update your dashboard for every {day}.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
        
        <div className="pt-2 text-center">
            <p className="text-[10px] text-zinc-600 font-medium">
                Changes are saved instantly to your local device.
            </p>
        </div>
      </div>
    </div>
  );
}