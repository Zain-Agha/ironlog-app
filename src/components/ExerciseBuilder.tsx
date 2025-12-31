import { useState } from 'react';
import { createPortal } from 'react-dom'; // <--- THE MAGIC FIX
import { db, type Exercise } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

export default function ExerciseBuilder({ onClose }: { onClose: () => void }) {
  const exercises = useLiveQuery(() => db.exercises.toArray());
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form Data
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState('Chest');
  const [category, setCategory] = useState<'strength' | 'cardio' | 'isometric'>('strength');

  const handleSave = async () => {
    if (!name) return;
    
    try {
        if (editingId) {
            await db.exercises.update(editingId, { name, targetMuscle: muscle, category });
        } else {
            await db.exercises.add({ name, targetMuscle: muscle, category, isCustom: true });
        }
        resetForm();
    } catch (error: any) {
        console.error("Save Failed:", error);
        alert("Failed to save. check console.");
    }
  };

  const handleEdit = (ex: Exercise) => {
    setEditingId(ex.id!);
    setName(ex.name);
    setMuscle(ex.targetMuscle);
    setCategory(ex.category);
    setMode('form');
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this exercise?")) await db.exercises.delete(id);
  };

  const resetForm = () => {
    setName('');
    setMuscle('Chest');
    setCategory('strength');
    setEditingId(null);
    setMode('list');
  };

  const filtered = exercises?.filter(ex => 
    ex.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    ex.targetMuscle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // WE USE A PORTAL TO BREAK OUT OF THE LAYOUT STACKING CONTEXT
  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-zinc-950 flex flex-col p-4 animate-in fade-in">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-white italic">
            {mode === 'list' ? 'EXERCISE' : (editingId ? 'EDIT' : 'NEW')}<span className="text-green-500">LIB</span>
        </h2>
        <button onClick={onClose} className="text-zinc-500 font-bold p-2">Done</button>
      </div>

      {mode === 'list' && (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex gap-2 mb-4">
                <input 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 p-3 rounded-xl text-white outline-none focus:border-green-500"
                />
                <button 
                    onClick={() => { resetForm(); setMode('form'); }}
                    className="bg-green-500 text-black font-bold px-4 rounded-xl text-xl"
                >
                    +
                </button>
            </div>

            {/* Added pb-32 to ensure the bottom item is NEVER behind the chin of the phone */}
            <div className="flex-1 overflow-y-auto space-y-2 pb-32">
                {filtered?.map(ex => (
                    <div key={ex.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                        <div>
                            <div className="font-bold text-white flex items-center gap-2">
                                {ex.name}
                                {ex.isCustom && <span className="text-[9px] bg-zinc-800 px-1 rounded text-zinc-500">CUSTOM</span>}
                            </div>
                            <div className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">
                                {ex.category} • {ex.targetMuscle}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(ex)} className="p-2 bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">✏️</button>
                            <button onClick={() => handleDelete(ex.id!)} className="p-2 bg-red-900/20 rounded-lg text-red-500 hover:bg-red-900/40">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {mode === 'form' && (
        <div className="flex-1 flex flex-col">
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Name</label>
                    <input 
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="e.g. Bulgarian Split Squat"
                        className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl mt-1 text-white text-lg font-bold outline-none focus:border-green-500"
                    />
                </div>

                <div>
                    <label className="text-xs font-bold text-zinc-500 uppercase">Type</label>
                    <div className="flex gap-2 mt-1">
                        {(['strength', 'cardio', 'isometric'] as const).map(c => (
                            <button
                                key={c}
                                onClick={() => setCategory(c)}
                                className={`flex-1 py-3 rounded-xl font-bold capitalize text-xs border ${
                                    category === c 
                                    ? 'bg-green-500 text-black border-green-500' 
                                    : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                {category === 'strength' && (
                     <div>
                        <label className="text-xs font-bold text-zinc-500 uppercase">Target Muscle</label>
                        <select 
                            value={muscle}
                            onChange={e => setMuscle(e.target.value)}
                            className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-xl mt-1 text-white outline-none"
                        >
                            {['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Full Body'].map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="mt-auto flex gap-3 pt-6 mb-8">
                <button onClick={resetForm} className="flex-1 py-4 text-zinc-500 font-bold bg-zinc-900 rounded-xl">Cancel</button>
                <button onClick={handleSave} className="flex-1 bg-white text-black rounded-xl font-bold">
                    {editingId ? 'Update' : 'Create'}
                </button>
            </div>
        </div>
      )}
    </div>,
    document.body // <--- Renders outside the 'root' div
  );
}