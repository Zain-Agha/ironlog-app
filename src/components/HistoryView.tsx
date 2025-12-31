import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SetLog } from '../db';

export default function HistoryView() {
  // 1. Fetch data
  const sets = useLiveQuery(() => db.sets.orderBy('timestamp').reverse().toArray());
  const exercises = useLiveQuery(() => db.exercises.toArray());

  // Safety check: Loading state
  if (!sets || !exercises) {
    return <div className="p-10 text-center text-zinc-500">Loading your history...</div>;
  }

  // 2. Map IDs to Names
  const exerciseMap = new Map(exercises.map(e => [e.id, e.name]));

  // 3. Group by Date
  const historyByDate: Record<string, SetLog[]> = {};

  sets.forEach(set => {
    // Safety check: Ensure timestamp exists
    if (!set.timestamp) return;
    
    const dateKey = new Date(set.timestamp).toDateString();
    if (!historyByDate[dateKey]) {
      historyByDate[dateKey] = [];
    }
    historyByDate[dateKey].push(set);
  });

  const historyEntries = Object.entries(historyByDate);

  return (
    <div className="p-4 space-y-6 pb-24">
      <header>
        <h1 className="text-3xl font-bold">History</h1>
        <p className="text-zinc-400">Your iron journey so far.</p>
      </header>

      {historyEntries.length === 0 && (
        <div className="p-8 text-center text-zinc-500 bg-zinc-900 rounded-xl border border-zinc-800 border-dashed">
          <p>No workouts recorded yet.</p>
          <p className="text-sm mt-2">Go to the main tab and log a set!</p>
        </div>
      )}

      {historyEntries.map(([date, daySets]) => {
        const totalVolume = daySets.reduce((acc, s) => acc + (s.weight * s.reps), 0);

        // Get unique exercises for this day
        // We use a safe filtering method to avoid crashes
        const uniqueExerciseIds = Array.from(new Set(daySets.map(s => s.exerciseId)));

        return (
          <div key={date} className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            {/* Card Header */}
            <div className="bg-zinc-800/50 p-4 border-b border-zinc-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-zinc-100">{date}</h3>
                <span className="text-xs text-zinc-500">{daySets.length} Sets • {Math.round(totalVolume)}kg Volume</span>
              </div>
            </div>

            {/* List of Exercises */}
            <div className="p-4 space-y-3">
               {uniqueExerciseIds.map(exId => {
                 // Get all sets for this specific exercise on this day
                 const exSets = daySets.filter(s => s.exerciseId === exId);
                 const exName = exerciseMap.get(exId!) || "Unknown Exercise";
                 
                 return (
                   <div key={exId} className="flex flex-col gap-1">
                     <div className="text-sm font-medium text-green-400 mb-1">{exName}</div>
                     <div className="flex flex-wrap gap-2">
                       {exSets.map((s, i) => (
                         <div key={s.id || i} className="text-xs bg-zinc-950 px-2 py-1 rounded text-zinc-400 border border-zinc-800">
                           {s.weight}kg × {s.reps}
                         </div>
                       ))}
                     </div>
                   </div>
                 )
               })}
            </div>
          </div>
        )
      })}
    </div>
  );
}