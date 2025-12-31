import { useState } from 'react';

export default function PlateCalculator({ onClose }: { onClose: () => void }) {
  const [weight, setWeight] = useState('');
  
  const calculatePlates = (targetWeight: number) => {
    const barWeight = 20;
    let remaining = (targetWeight - barWeight) / 2;
    const plates: number[] = [];
    
    if (remaining < 0) return []; // Too light

    // Available plates
    [25, 20, 15, 10, 5, 2.5, 1.25].forEach(plate => {
      while (remaining >= plate) {
        plates.push(plate);
        remaining -= plate;
      }
    });
    return plates;
  };

  const plates = weight ? calculatePlates(parseFloat(weight)) : [];

  // Color mapping for plates
  const getColor = (p: number) => {
    if (p === 25) return 'bg-red-600 border-red-800';
    if (p === 20) return 'bg-blue-600 border-blue-800';
    if (p === 15) return 'bg-yellow-500 border-yellow-700';
    if (p === 10) return 'bg-green-600 border-green-800';
    return 'bg-zinc-300 border-zinc-400 text-black';
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 w-full max-w-sm rounded-2xl border border-zinc-800 p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500">✕</button>
        
        <h2 className="text-xl font-bold mb-6 text-center">Plate Math</h2>

        {/* The Bar Visualization */}
        <div className="h-32 flex items-center justify-center relative mb-8">
            {/* The Barbell Shaft */}
            <div className="absolute w-full h-4 bg-zinc-600 rounded-full" />
            
            {/* The Sleeve Stop */}
            <div className="absolute left-4 w-4 h-12 bg-zinc-500" />

            {/* The Plates */}
            <div className="absolute left-8 flex items-center gap-1">
                {plates.map((p, i) => (
                    <div 
                        key={i} 
                        className={`h-${p >= 20 ? '24' : p >= 10 ? '20' : '14'} w-3 ${getColor(p)} border-r-2 rounded-sm flex items-center justify-center`}
                    >
                        {/* Show text only on wider plates if we had space, simplified for now */}
                    </div>
                ))}
            </div>
        </div>

        {/* Text List of Plates */}
        <div className="flex justify-center gap-2 mb-8 flex-wrap">
            {plates.length === 0 ? <span className="text-zinc-600">Enter weight...</span> : plates.map((p, i) => (
                <span key={i} className={`text-xs font-bold px-2 py-1 rounded ${getColor(p)} ${p < 5 ? 'text-black' : 'text-white'}`}>
                    {p}
                </span>
            ))}
        </div>

        {/* Input */}
        <div className="space-y-2">
            <label className="text-xs uppercase font-bold text-zinc-500">Target Weight (kg)</label>
            <input 
                type="number" 
                value={weight} 
                onChange={e => setWeight(e.target.value)}
                placeholder="e.g. 100"
                className="w-full bg-zinc-950 p-4 rounded-xl text-3xl font-bold text-center text-white border border-zinc-800 focus:border-green-500 outline-none" 
                autoFocus
            />
        </div>
      </div>
    </div>
  );
}