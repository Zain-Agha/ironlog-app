import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type SetLog } from '../db';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { 
  format, startOfMonth, endOfMonth, subMonths, addMonths, 
  startOfYear, endOfYear, subYears, addYears, 
  eachMonthOfInterval, subWeeks, getISOWeek
} from 'date-fns';

// --- PLATEAU DETECTOR LOGIC ---
const calculatePlateau = (sets: SetLog[], exId: number | null) => {
  if (!sets || !exId) return null;
  const today = new Date();
  const fourWeeksAgo = subWeeks(today, 4);
  const relevantSets = sets.filter(s => s.exerciseId === exId && s.timestamp >= fourWeeksAgo.getTime());
  if (relevantSets.length === 0) return null;

  const weeklyMax = new Map<number, number>();
  relevantSets.forEach(s => {
    const weekNum = getISOWeek(new Date(s.timestamp));
    const metric = s.weight > 0 ? s.weight : s.reps;
    const currentMax = weeklyMax.get(weekNum) || 0;
    if (metric > currentMax) weeklyMax.set(weekNum, metric);
  });

  const weeks = Array.from(weeklyMax.values());
  if (weeks.length < 3) return null;

  const latest = weeks[weeks.length - 1];
  const first = weeks[0];
  if (latest <= first * 1.01) return { detected: true, metric: weeks[weeks.length - 1], duration: weeks.length };
  return null;
};

// --- HELPER: METRICS ---
const calculateMetrics = (sets: SetLog[], start: Date, end: Date, exercises: any[]) => {
  const rangeSets = sets.filter(s => s.timestamp >= start.getTime() && s.timestamp <= end.getTime());
  const daysWorkedOut = new Set(rangeSets.map(s => new Date(s.timestamp).toDateString())).size;
  
  const now = new Date();
  const isCurrentPeriod = end > now;
  const diffTime = isCurrentPeriod ? Math.abs(now.getTime() - start.getTime()) : Math.abs(end.getTime() - start.getTime());
  const potentialDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
  const attendanceRate = Math.round((daysWorkedOut / potentialDays) * 100);

  let strengthVol = 0;
  let cardioDist = 0;

  if (exercises) {
    rangeSets.forEach(s => {
        const ex = exercises.find(e => e.id === s.exerciseId);
        if (ex?.category === 'cardio') cardioDist += s.weight;
        else strengthVol += s.weight * (s.reps || 1);
    });
  }
  return { daysWorkedOut, attendanceRate, strengthVol, cardioDist };
};

const DeltaBadge = ({ current, previous }: { current: number, previous: number }) => {
  if (previous === 0) return <span className="text-[10px] text-zinc-600 ml-2">-</span>;
  const diff = ((current - previous) / previous) * 100;
  const isPositive = diff > 0;
  const color = isPositive ? 'text-cyan-400' : 'text-rose-500';
  const arrow = isPositive ? '↑' : '↓';
  return <span className={`text-[10px] font-bold ${color} ml-2 bg-black/40 px-1.5 py-0.5 rounded border border-white/5`}>{arrow} {Math.abs(diff).toFixed(0)}%</span>;
};

export default function AnalyticsView() {
  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedExId, setSelectedExId] = useState<number | null>(null);

  const sets = useLiveQuery(() => db.sets.toArray());
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const dailyLogs = useLiveQuery(() => db.dailyLogs.toArray());
  const profile = useLiveQuery(() => db.profile.toArray());
  const user = profile?.[0];

  // --- ACTIONS ---
  const handleDeleteSet = async (id: number) => {
    if (confirm("Are you sure you want to delete this log entry?")) {
        try {
            await db.sets.delete(id);
        } catch (error) {
            console.error("Failed to delete set:", error);
            alert("Could not delete log.");
        }
    }
  };

  // --- DATES & RANGES ---
  const currentRange = useMemo(() => {
    if (viewMode === 'month') return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
    return { start: startOfYear(currentDate), end: endOfYear(currentDate) };
  }, [viewMode, currentDate]);

  const prevRange = useMemo(() => {
    if (viewMode === 'month') {
        const prev = subMonths(currentDate, 1);
        return { start: startOfMonth(prev), end: endOfMonth(prev) };
    }
    const prev = subYears(currentDate, 1);
    return { start: startOfYear(prev), end: endOfYear(prev) };
  }, [viewMode, currentDate]);

  // --- STATS CALCULATION ---
  const currentStats = useMemo(() => {
    if (!sets || !exercises) return { daysWorkedOut: 0, attendanceRate: 0, strengthVol: 0, cardioDist: 0 };
    return calculateMetrics(sets, currentRange.start, currentRange.end, exercises);
  }, [sets, currentRange, exercises]);

  const prevStats = useMemo(() => {
    if (!sets || !exercises) return { daysWorkedOut: 0, attendanceRate: 0, strengthVol: 0, cardioDist: 0 };
    return calculateMetrics(sets, prevRange.start, prevRange.end, exercises);
  }, [sets, prevRange, exercises]);

  // --- ADAPTIVE NUTRITION LOGIC ---
  const nutritionStats = useMemo(() => {
    if (!dailyLogs || !user) return { calorieWins: 0, proteinWins: 0 };
    const logsInPeriod = dailyLogs.filter(l => {
        const d = new Date(l.date);
        return d >= currentRange.start && d <= currentRange.end;
    });

    const calorieWins = logsInPeriod.filter(l => {
        if (user.goal === 'loss') {
            return l.calories > 0 && l.calories <= user.dailyCalorieTarget; 
        }
        return l.calories >= user.dailyCalorieTarget; 
    }).length;

    const proteinWins = logsInPeriod.filter(l => l.protein >= user.dailyProteinTarget).length;

    return { calorieWins, proteinWins };
  }, [dailyLogs, currentRange, user]);

  // --- CHART LOGIC ---
  const chartData = useMemo(() => {
    if (!sets || !selectedExId) return [];
    const rangeSets = sets.filter(s => s.exerciseId === selectedExId && s.timestamp >= currentRange.start.getTime() && s.timestamp <= currentRange.end.getTime());
    const dataMap = new Map<string, number>();

    if (viewMode === 'month') {
        rangeSets.forEach(set => {
            const dateStr = format(set.timestamp, 'd MMM');
            const current = dataMap.get(dateStr) || 0;
            const metric = set.weight > 0 ? set.weight : set.reps; 
            if (metric > current) dataMap.set(dateStr, metric);
        });
        return Array.from(dataMap.entries()).map(([date, value]) => ({ date, value }));
    } else {
        const months = eachMonthOfInterval({ start: currentRange.start, end: currentRange.end });
        return months.map(month => {
            const mStart = startOfMonth(month).getTime();
            const mEnd = endOfMonth(month).getTime();
            const mSets = rangeSets.filter(s => s.timestamp >= mStart && s.timestamp <= mEnd);
            let maxMetric = 0;
            mSets.forEach(s => {
                const metric = s.weight > 0 ? s.weight : s.reps;
                if (metric > maxMetric) maxMetric = metric;
            });
            return { date: format(month, 'MMM'), value: maxMetric > 0 ? maxMetric : null };
        });
    }
  }, [sets, selectedExId, currentRange, viewMode]);

  if (!selectedExId && exercises && exercises.length > 0) setSelectedExId(exercises[0].id!);
  const plateau = useMemo(() => calculatePlateau(sets || [], selectedExId), [sets, selectedExId]);
  const selectedExercise = exercises?.find(e => e.id === selectedExId);
  const unitLabel = selectedExercise?.category === 'cardio' ? 'km' : selectedExercise?.category === 'isometric' ? 'sec' : 'kg';

  // Navigation
  const handlePrev = () => setCurrentDate(viewMode === 'month' ? subMonths(currentDate, 1) : subYears(currentDate, 1));
  const handleNext = () => setCurrentDate(viewMode === 'month' ? addMonths(currentDate, 1) : addYears(currentDate, 1));

  // --- THEME CONSTANTS ---
  const glassCard = "bg-zinc-900/60 backdrop-blur-md border border-cyan-900/20 shadow-lg shadow-cyan-900/5";
  const activeBtn = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.15)]";
  const inactiveBtn = "text-zinc-500 hover:text-zinc-300";

  return (
    // FIX: CHANGED from 'p-4' to 'p-4 pt-16' to clear Dynamic Island/Notch
    <div className="p-4 pt-16 space-y-6 pb-32">
      {/* HEADER & TOGGLE */}
      <header className="flex flex-col gap-4 pt-4">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-black text-white italic tracking-tighter">DATA<span className="text-cyan-400">LAB</span></h1>
            <div className="flex bg-black/40 rounded-lg p-1 border border-zinc-800">
                <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'month' ? activeBtn : inactiveBtn}`}>Month</button>
                <button onClick={() => setViewMode('year')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'year' ? activeBtn : inactiveBtn}`}>Year</button>
            </div>
        </div>
        <div className={`flex items-center justify-between p-3 rounded-2xl border border-white/5 ${glassCard}`}>
            <button onClick={handlePrev} className="p-2 text-zinc-400 hover:text-cyan-400 transition-colors">←</button>
            <span className="font-bold text-white uppercase tracking-widest text-sm">{viewMode === 'month' ? format(currentDate, 'MMMM yyyy') : format(currentDate, 'yyyy')}</span>
            <button onClick={handleNext} className="p-2 text-zinc-400 hover:text-cyan-400 transition-colors">→</button>
        </div>
      </header>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-2 gap-3">
        {/* Attendance Card */}
        <div className={`${glassCard} p-4 rounded-2xl col-span-1 group`}>
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Attendance</div>
            <div className="flex items-end gap-1 mt-2">
                <span className="text-3xl font-black text-white">{currentStats.daysWorkedOut}</span>
                <span className="text-xs text-zinc-500 mb-1 font-bold">days</span>
                <DeltaBadge current={currentStats.daysWorkedOut} previous={prevStats.daysWorkedOut} />
            </div>
            <div className="w-full h-1.5 bg-zinc-800 mt-3 rounded-full overflow-hidden">
                <div className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)] transition-all duration-1000" style={{ width: `${currentStats.attendanceRate}%` }} />
            </div>
        </div>

        {/* Period Progress Card */}
        <div className={`${glassCard} p-4 rounded-2xl col-span-1 flex flex-col justify-center relative overflow-hidden`}>
            <div className="absolute top-0 right-0 p-3 opacity-20"><span className="text-4xl">📉</span></div>
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider relative z-10">Period Rate</div>
            <div className="text-2xl font-black text-white mt-1 relative z-10">
                {currentStats.attendanceRate}% <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Consistency</span>
            </div>
        </div>

        {/* CALORIE CARD (Adaptive) */}
        <div className={`${glassCard} p-4 rounded-2xl col-span-1`}>
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Calorie Target</div>
            <div className="flex items-end gap-1 mt-1">
                <span className="text-3xl font-black text-white">{nutritionStats.calorieWins}</span>
                <span className="text-xs text-zinc-500 mb-1 font-bold">wins</span>
            </div>
            <div className="mt-2 text-[10px] text-zinc-600 truncate border-t border-white/5 pt-2">
                Mode: <span className="text-emerald-400 font-bold uppercase">{user?.goal}</span>
            </div>
        </div>

        {/* PROTEIN CARD */}
        <div className={`${glassCard} p-4 rounded-2xl col-span-1`}>
            <div className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Protein Target</div>
            <div className="flex items-end gap-1 mt-1">
                <span className="text-3xl font-black text-white">{nutritionStats.proteinWins}</span>
                <span className="text-xs text-zinc-500 mb-1 font-bold">wins</span>
            </div>
            <div className="mt-2 text-[10px] text-zinc-600 border-t border-white/5 pt-2">Hit {user?.dailyProteinTarget}g Floor</div>
        </div>

        {/* SPLIT VOLUME CARD */}
        <div className={`${glassCard} p-5 rounded-2xl col-span-2 flex justify-between items-center bg-gradient-to-r from-zinc-900/80 to-zinc-900/40`}>
            <div className="flex-1 border-r border-zinc-700/50 pr-4">
                <div className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-2"><span>🏋️</span> Iron Moved</div>
                <div className="text-2xl font-black text-white mt-1 flex items-end">
                    {(currentStats.strengthVol / 1000).toFixed(1)}k <span className="text-xs text-zinc-600 ml-1 mb-1 font-bold">kg</span>
                    <DeltaBadge current={currentStats.strengthVol} previous={prevStats.strengthVol} />
                </div>
            </div>
            <div className="flex-1 pl-4">
                <div className="text-[10px] uppercase font-bold text-zinc-500 flex items-center gap-2"><span>🏃</span> Cardio</div>
                <div className="text-2xl font-black text-white mt-1 flex items-end">
                    {currentStats.cardioDist.toFixed(1)} <span className="text-xs text-zinc-600 ml-1 mb-1 font-bold">km</span>
                    <DeltaBadge current={currentStats.cardioDist} previous={prevStats.cardioDist} />
                </div>
            </div>
        </div>
      </div>

      {/* PLATEAU ALERT */}
      {plateau && (
        <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-2xl flex items-start gap-3 animate-in slide-in-from-bottom shadow-[0_0_15px_rgba(249,115,22,0.1)]">
            <div className="text-2xl">🚧</div>
            <div>
                <h4 className="font-bold text-orange-400 text-sm uppercase tracking-tighter">Plateau Detected</h4>
                <p className="text-xs text-orange-200/80 mt-1 leading-relaxed">
                    Your <b>{selectedExercise?.name}</b> hasn't increased in {plateau.duration} weeks.
                    Time to change reps or increase volume?
                </p>
            </div>
        </div>
      )}

      {/* CHART */}
      <div className={`${glassCard} p-4 rounded-2xl h-80 flex flex-col border-cyan-500/10`}>
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                {viewMode} Trend
            </h3>
            <select className="bg-black text-white text-xs font-bold p-2 rounded-lg border border-zinc-800 outline-none max-w-[150px] focus:border-cyan-500/50" onChange={(e) => setSelectedExId(Number(e.target.value))} value={selectedExId || ''}>
                {exercises?.map(ex => (<option key={ex.id} value={ex.id}>{ex.name}</option>))}
            </select>
        </div>
        {chartData.length > 0 ? (
            <div className="flex-1 w-full -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis dataKey="date" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} tickMargin={10} interval={viewMode === 'year' ? 0 : 'preserveStartEnd'} />
                        <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(value) => `${value}`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '12px', color: '#fff', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} 
                            itemStyle={{ color: '#22d3ee', fontWeight: 'bold', fontSize: '12px' }} 
                            formatter={(value: any) => [`${value} ${unitLabel}`, viewMode === 'month' ? 'Best' : 'Peak']} 
                            labelStyle={{ color: '#a1a1aa', marginBottom: '4px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}
                            cursor={{ stroke: '#22d3ee', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" connectNulls={true} activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', stroke: '#22d3ee' }} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 text-xs gap-2"><span className="text-3xl opacity-30 grayscale">📊</span><span>No data available</span></div>
        )}
      </div>

      {/* LOGS with DELETE FUNCTIONALITY */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest pl-1">Recent Logs</h3>
        {(sets || []).filter(s => s.timestamp >= currentRange.start.getTime() && s.timestamp <= currentRange.end.getTime()).reverse().slice(0, 10).map(set => {
            const ex = exercises?.find(e => e.id === set.exerciseId);
            const isCardio = ex?.category === 'cardio';
            const isIso = ex?.category === 'isometric';
            return (
                <div key={set.id} className={`flex justify-between items-center p-4 rounded-xl ${glassCard} border-white/5 hover:border-cyan-500/20 transition-colors group relative pr-12`}>
                    <div>
                        <div className="text-sm font-bold text-white">{ex?.name || 'Unknown'}</div>
                        <div className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{new Date(set.timestamp).toDateString().slice(0, 10)}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-lg font-black text-cyan-400">
                            {set.weight > 0 ? set.weight : (isCardio ? '0' : 'BW')} 
                            <span className="text-zinc-500 text-xs font-bold ml-1">{isCardio ? 'km' : (set.weight > 0 ? 'kg' : '')}</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-bold">{set.reps} {isCardio ? 'min' : isIso ? 'sec' : 'reps'}</div>
                    </div>

                    {/* DELETE BUTTON (Absolute Positioned) */}
                    <button 
                        onClick={() => handleDeleteSet(set.id!)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-zinc-800/50 hover:bg-red-900/50 text-zinc-500 hover:text-red-500 rounded-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        title="Delete Log"
                    >
                        <span className="text-xs font-bold">✕</span>
                    </button>
                </div>
            )
        })}
      </div>
    </div>
  );
}