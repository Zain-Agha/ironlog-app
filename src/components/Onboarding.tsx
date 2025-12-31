import { useState } from 'react';
import { db } from '../db';
import { calculateTargets } from '../lib/macros';

export default function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    gender: 'male',
    birthYear: '1995',
    height: '', // cm
    weight: '', // current kg
    goalWeight: '', // target kg
  });

  const handleFinish = async () => {
    // 1. Calculate Age
    const currentYear = new Date().getFullYear();
    const age = currentYear - parseInt(formData.birthYear);
    const weight = parseFloat(formData.weight);
    const height = parseFloat(formData.height);

    // 2. Determine Goal (Auto-detect)
    const goalWeight = parseFloat(formData.goalWeight);
    let goal: 'loss' | 'maintain' | 'gain' = 'maintain';
    if (goalWeight < weight) goal = 'loss';
    if (goalWeight > weight) goal = 'gain';

    // 3. Calculate Macros
    const { targetCalories, targetProtein } = calculateTargets(
        weight, height, age, formData.gender as any, goal
    );

    // 4. Save to DB
    await db.profile.clear();
    await db.profile.add({
        name: formData.name,
        gender: formData.gender as any,
        birthYear: parseInt(formData.birthYear),
        height: height,
        startingWeight: weight,
        currentWeight: weight,
        goalWeight: goalWeight,
        goal: goal,
        dailyCalorieTarget: targetCalories,
        dailyProteinTarget: targetProtein,
        onboardingComplete: true
    });

    onComplete();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        
        {/* PROGRESS INDICATOR */}
        <div className="flex justify-between text-xs font-bold text-zinc-600 uppercase">
            <span className={step >= 1 ? 'text-green-500' : ''}>1. Basics</span>
            <span className={step >= 2 ? 'text-green-500' : ''}>2. Body</span>
            <span className={step >= 3 ? 'text-green-500' : ''}>3. Targets</span>
        </div>

        {/* STEP 1: IDENTITY */}
        {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                <h1 className="text-3xl font-black text-white italic">WHO ARE <span className="text-green-500">YOU?</span></h1>
                <input 
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                    placeholder="Your Name" className="w-full bg-zinc-900 p-4 rounded-xl text-white font-bold outline-none focus:border-green-500 border border-transparent"
                />
                <div className="flex gap-4">
                    <select 
                        value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
                        className="flex-1 bg-zinc-900 p-4 rounded-xl text-white font-bold border border-transparent"
                    >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                    </select>
                    <input 
                        type="number" placeholder="Birth Year"
                        value={formData.birthYear} onChange={e => setFormData({...formData, birthYear: e.target.value})}
                        className="flex-1 bg-zinc-900 p-4 rounded-xl text-white font-bold outline-none border border-transparent"
                    />
                </div>
                <button onClick={() => setStep(2)} className="w-full bg-white text-black font-bold py-4 rounded-xl mt-4 active:scale-95 transition-transform">Next</button>
            </div>
        )}

        {/* STEP 2: METRICS */}
        {step === 2 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                <h1 className="text-3xl font-black text-white italic">YOUR <span className="text-green-500">STATS</span></h1>
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-zinc-500">HEIGHT (cm)</label>
                        <input type="number" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} className="w-full bg-zinc-900 p-4 rounded-xl text-white font-bold mt-1 outline-none focus:border-green-500 border border-transparent" placeholder="175" />
                    </div>
                    <div className="flex-1">
                         <label className="text-xs font-bold text-zinc-500">WEIGHT (kg)</label>
                         <input type="number" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full bg-zinc-900 p-4 rounded-xl text-white font-bold mt-1 outline-none focus:border-green-500 border border-transparent" placeholder="75" />
                    </div>
                </div>
                <div className="space-y-2 pt-4">
                    <button onClick={() => setStep(3)} className="w-full bg-white text-black font-bold py-4 rounded-xl active:scale-95 transition-transform">Next</button>
                    <button onClick={() => setStep(1)} className="w-full text-zinc-500 font-bold py-2 text-sm uppercase tracking-widest">← Back</button>
                </div>
            </div>
        )}

        {/* STEP 3: GOAL */}
        {step === 3 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-8">
                <h1 className="text-3xl font-black text-white italic">THE <span className="text-green-500">MISSION</span></h1>
                <div>
                     <label className="text-xs font-bold text-zinc-500">TARGET WEIGHT (kg)</label>
                     <input type="number" value={formData.goalWeight} onChange={e => setFormData({...formData, goalWeight: e.target.value})} className="w-full bg-zinc-900 p-4 rounded-xl text-white font-bold mt-1 outline-none focus:border-green-500 border border-transparent" placeholder="70" />
                </div>
                <p className="text-xs text-zinc-500">
                    We will calculate your daily calories and protein automatically based on this goal.
                </p>
                <div className="space-y-2 pt-4">
                    <button onClick={handleFinish} className="w-full bg-green-500 text-black font-bold py-4 rounded-xl shadow-lg shadow-green-900/50 active:scale-95 transition-transform">
                        Launch IronLog
                    </button>
                    <button onClick={() => setStep(2)} className="w-full text-zinc-500 font-bold py-2 text-sm uppercase tracking-widest">← Back</button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}