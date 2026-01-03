import { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ExerciseLogger from './components/ExerciseLogger';
import AnalyticsView from './components/AnalyticsView'; 
import ProfileView from './components/ProfileView';
import Onboarding from './components/Onboarding';
import ExerciseBuilder from './components/ExerciseBuilder';
import DailyTracker from './components/DailyTracker';
import RestTimer from './components/RestTimer';
import { db, type Exercise, type Routine, type Schedule } from './db';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card } from './components/ui/Card'; 
import { motion, AnimatePresence } from 'framer-motion';

// --- SCHEDULE MODAL ---
function ScheduleModal({ onClose, routines, schedule }: { onClose: () => void, routines: Routine[], schedule: Schedule[] }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return (
    <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center p-6 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 w-full max-w-sm rounded-2xl p-6 space-y-4 border border-zinc-800 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-white">Weekly Schedule</h2><button onClick={onClose} className="text-zinc-500 font-bold">✕</button></div>
        <div className="space-y-2 mt-4">{days.map((day, idx) => {const s=schedule?.find(x=>x.dayIndex===idx); const r=s?.routineId?routines?.find(x=>x.id===s.routineId):null; const isToday=new Date().getDay()===idx; return (<div key={day} className={`flex justify-between items-center p-3 rounded-xl border ${isToday?'bg-green-900/20 border-green-500/30':'bg-zinc-950 border-zinc-800'}`}><span className={`font-bold w-12 text-sm ${isToday?'text-green-500':'text-zinc-500'}`}>{day}</span><span className={`text-sm font-medium ${r?'text-white':'text-zinc-600 italic'}`}>{r?r.name:'Rest Day'}</span></div>)})}</div>
        <div className="pt-2 border-t border-zinc-800/50 mt-4"><p className="text-[10px] text-zinc-500 text-center">Edit this in <b>Command Center</b></p></div>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('workout');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  
  const [activeDate, setActiveDate] = useState(new Date()); 
  const [recalibratedRoutine, setRecalibratedRoutine] = useState<Routine | null>(null);
  const [showMissedAlert, setShowMissedAlert] = useState(false);

  // Queries
  const profile = useLiveQuery(() => db.profile.toArray());
  const allExercises = useLiveQuery(() => db.exercises.toArray());
  const routines = useLiveQuery(() => db.routines.toArray());
  const schedule = useLiveQuery(() => db.schedule.toArray());

  const selectedDateSets = useLiveQuery(async () => {
    const start = new Date(activeDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(activeDate);
    end.setHours(23, 59, 59, 999);
    return await db.sets.where('timestamp').between(start.getTime(), end.getTime()).toArray();
  }, [activeDate]);

  useEffect(() => {
    const checkMissed = async () => {
        if (!routines || !schedule) return;
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayIdx = yesterday.getDay();
        const yesterdaySched = schedule.find(s => s.dayIndex === yesterdayIdx);
        
        if (yesterdaySched?.routineId) {
            const yesterdayRoutine = routines.find(r => r.id === yesterdaySched.routineId);
            if (yesterdayRoutine) {
                const start = new Date(yesterday).setHours(0,0,0,0);
                const end = new Date(yesterday).setHours(23,59,59,999);
                const logs = await db.sets.where('timestamp').between(start, end).count();
                if (logs === 0) {
                    setRecalibratedRoutine(yesterdayRoutine);
                    setShowMissedAlert(true);
                }
            }
        }
    };
    checkMissed();
  }, [routines, schedule]);

  if (!profile || !allExercises) return <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-500">Loading...</div>;
  if (profile.length === 0 || !profile[0].onboardingComplete) return <Onboarding onComplete={() => window.location.reload()} />;

  const isToday = activeDate.toDateString() === new Date().toDateString();
  
  const activeRoutine = (!isToday && recalibratedRoutine) 
    ? recalibratedRoutine 
    : (schedule?.find(s => s.dayIndex === activeDate.getDay())?.routineId 
        ? routines?.find(r => r.id === schedule?.find(s => s.dayIndex === activeDate.getDay())?.routineId) 
        : null);

  const displayExercises = activeRoutine
    ? allExercises.filter(ex => activeRoutine.elements?.some(el => el.exerciseId === ex.id))
    : allExercises;

  // --- NEW LOGIC: CHECK IF ALL EXERCISES ARE COMPLETE ---
  const allComplete = displayExercises && displayExercises.length > 0 && displayExercises.every(exercise => {
      const target = activeRoutine?.elements?.find(el => el.exerciseId === exercise.id);
      const setsDone = selectedDateSets?.filter(s => s.exerciseId === exercise.id).length || 0;
      return target && setsDone >= target.targetSets;
  });

  const pageVariants = { initial: { opacity: 0, x: -20 }, enter: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 20 } };

  return (
    <>
      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        <AnimatePresence mode="wait">
          {activeTab === 'workout' && (
            <motion.div key="workout" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="pb-32">
              
              <header className="px-4 pt-16 pb-4">
                <div className="flex justify-between items-start">
                    <h1 className="text-4xl font-black tracking-tighter text-white italic">PULSE<span className="text-emerald-500">.</span></h1>
                    <button onClick={() => setShowSchedule(true)} className="flex flex-col items-center bg-zinc-900 border border-zinc-800 p-2 rounded-lg active:scale-95 transition-transform"><span className="text-xl">📅</span><span className="text-[9px] font-bold text-zinc-400 uppercase">Week</span></button>
                </div>
                
                {showMissedAlert && (
                    <div className="mt-4 bg-amber-900/20 border border-amber-600/30 p-4 rounded-xl flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-amber-500 font-bold"><span>🕒</span> <span>Forgot to log yesterday?</span></div>
                        <div className="flex gap-2">
                            <button onClick={() => { setShowMissedAlert(false); setRecalibratedRoutine(null); }} className="flex-1 bg-zinc-900 py-3 rounded-lg text-xs font-bold text-zinc-400">Skip</button>
                            <button onClick={() => { 
                                const yesterday = new Date();
                                yesterday.setDate(yesterday.getDate() - 1);
                                setActiveDate(yesterday);
                                setShowMissedAlert(false);
                            }} className="flex-1 bg-amber-600 text-black py-3 rounded-lg text-xs font-bold">Yes, log it now</button>
                        </div>
                    </div>
                )}

                {!isToday && (
                    <div className="mt-4 flex justify-between items-center bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl">
                        <span className="text-blue-400 text-xs font-bold uppercase">Editing: {activeDate.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                        <button onClick={() => setActiveDate(new Date())} className="text-xs bg-blue-500 text-white px-2 py-1 rounded font-bold">Back to Today</button>
                    </div>
                )}

                <div className="flex items-center gap-2 mt-4">
                    <div className={`w-2 h-2 rounded-full ${activeRoutine ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
                    <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">{activeRoutine ? `Plan: ${activeRoutine.name}` : 'Free Training Mode'}</span>
                </div>
              </header>

              <DailyTracker customDate={activeDate} />

              {/* --- NEW: COMPLETION BANNER --- */}
              <AnimatePresence>
                {allComplete && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20, scale: 0.9 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="mx-4 mt-2 p-6 bg-gradient-to-br from-emerald-900/50 to-emerald-600/20 border border-emerald-500/30 rounded-3xl flex flex-col items-center text-center shadow-lg shadow-emerald-900/20 backdrop-blur-sm"
                    >
                        <div className="text-4xl mb-2 filter drop-shadow-lg">🎉</div>
                        <h3 className="text-xl font-black text-white italic tracking-tighter">MISSION <span className="text-emerald-400">COMPLETE</span></h3>
                        <p className="text-emerald-200/80 text-[10px] font-bold uppercase tracking-widest mt-1">Day Conquered. Good recovery.</p>
                    </motion.div>
                )}
              </AnimatePresence>

              <div className="p-4 grid gap-3">
                <button onClick={() => setIsBuilderOpen(true)} className="p-4 rounded-2xl border border-zinc-800 border-dashed text-zinc-500 flex items-center justify-center gap-2 hover:bg-zinc-900/50 transition-colors"><span className="text-xl font-bold">+</span><span className="font-bold text-sm">Add Custom Exercise</span></button>

                {displayExercises?.length === 0 ? <div className="text-center text-zinc-600 py-10">No exercises found.</div> : 
                    displayExercises?.map((exercise, index) => {
                        const target = activeRoutine?.elements?.find(el => el.exerciseId === exercise.id);
                        const setsDone = selectedDateSets?.filter(s => s.exerciseId === exercise.id).length || 0;
                        const isComplete = target && setsDone >= target.targetSets;

                        let goalText = '';
                        if (target) {
                             if (exercise.category === 'cardio') {
                                 const speed = (target as any).targetSpeed ? `@ ${(target as any).targetSpeed}km/h` : '';
                                 const incline = target.targetWeight > 0 ? `(Inc ${target.targetWeight})` : '';
                                 goalText = `Goal: ${target.targetReps} min ${speed} ${incline}`;
                             } else if (exercise.category === 'isometric') {
                                 goalText = `Goal: ${target.targetReps}s Hold`;
                             } else {
                                 goalText = `Goal: ${target.targetWeight > 0 ? `${target.targetWeight}kg` : 'BW'} × ${target.targetReps}`;
                             }
                        }

                        return (
                            <Card 
                                key={exercise.id} 
                                delay={index} 
                                onClick={() => setSelectedExercise(exercise)} 
                                className={`flex items-center justify-between group transition-colors cursor-pointer ${isComplete ? 'border-emerald-500/50 bg-emerald-900/10' : 'active:border-emerald-500/50'}`}
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className={`font-bold text-lg transition-colors ${isComplete ? 'text-emerald-400' : 'text-zinc-100 group-hover:text-emerald-400'}`}>
                                            {exercise.name}
                                        </h3>
                                        {isComplete && <span className="text-emerald-500 text-sm">✅</span>}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        <span className="text-xs bg-zinc-900 text-zinc-500 font-bold px-2 py-1 rounded border border-zinc-800">{exercise.targetMuscle}</span>
                                        {target && (
                                            <>
                                                <span className="text-xs bg-zinc-800 text-zinc-300 font-bold px-2 py-1 rounded border border-zinc-700">{goalText}</span>
                                                <span className={`text-xs font-bold px-2 py-1 rounded border ${isComplete ? 'border-emerald-500 text-emerald-500' : 'border-zinc-700 text-zinc-500'}`}>{setsDone} / {target.targetSets} Sets</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="pl-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isComplete ? 'bg-emerald-500 text-black' : 'bg-zinc-800/50 text-zinc-400 group-hover:bg-emerald-500 group-hover:text-black'}`}>
                                        <span className="text-xl">{exercise.category === 'cardio' ? '🏃' : exercise.category === 'isometric' ? '⏱️' : '⚡'}</span>
                                    </div>
                                </div>
                            </Card>
                        )
                    })
                }
              </div>
            </motion.div>
          )}
          {activeTab === 'history' && <motion.div key="history" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="h-full"><AnalyticsView /></motion.div>}
          {activeTab === 'profile' && <motion.div key="profile" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="h-full"><ProfileView /></motion.div>}
        </AnimatePresence>
      </Layout>

      <AnimatePresence>
        {selectedExercise && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed inset-0 z-50">
            <ExerciseLogger 
              exercise={selectedExercise} 
              onClose={() => setSelectedExercise(null)} 
              onLog={() => setTimerStart(Date.now())} 
              backlogDate={activeDate}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {isBuilderOpen && <ExerciseBuilder onClose={() => setIsBuilderOpen(false)} />}
      {showSchedule && <ScheduleModal onClose={() => setShowSchedule(false)} routines={routines ?? []} schedule={schedule ?? []} />}
      <RestTimer startTime={isToday ? timerStart : null} /> 
    </>
  );
}

export default App;