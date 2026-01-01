import { useState } from 'react';
import { createPortal } from 'react-dom'; 
import { db, type Exercise, type Routine, type RoutineElement } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

// --- EXTRACTED COMPONENT ---
const ExercisePicker = ({ 
  allExercises, 
  onCancel, 
  onAdd 
}: { 
  allExercises: Exercise[] | undefined; 
  onCancel: () => void; 
  onAdd: (exercise: Exercise, sets: number, reps: number, weight: number) => void;
}) => {
  const [step, setStep] = useState<'select' | 'configure' | 'create'>('select');
  const [selectedEx, setSelectedEx] = useState<Exercise | null>(null);
  
  // Configure Targets State
  const [tSets, setTSets] = useState('3');
  const [tReps, setTReps] = useState('10');
  const [tWeight, setTWeight] = useState('0');

  // Create New Ex State
  const [newName, setNewName] = useState('');
  const [newCat, setNewCat] = useState<'strength' | 'cardio' | 'isometric'>('strength');

  const handleCreateNew = async () => {
      if (!newName) return;
      try {
        const id = await db.exercises.add({ 
            name: newName, 
            targetMuscle: 'Custom', 
            category: newCat, 
            isCustom: true 
        });
        const newEx = { id: id as number, name: newName, targetMuscle: 'Custom', category: newCat } as Exercise;
        setSelectedEx(newEx);
        setStep('configure');
      } catch (err) {
        console.error("Failed to create custom exercise:", err);
        alert("Could not create exercise. See console.");
      }
  };

  if (step === 'select') return (
      <div className="fixed inset-0 z-[9050] bg-black/95 flex flex-col p-6">
          <div className="flex justify-between mb-4">
            <h3 className="font-bold text-white">Add Exercise</h3>
            <button onClick={onCancel} className="text-zinc-500">Cancel</button>
          </div>
          <div className="space-y-2 overflow-y-auto flex-1 pb-20">
              <button onClick={() => setStep('create')} className="w-full p-4 border border-zinc-700 border-dashed rounded-xl text-zinc-400 font-bold mb-2">+ Create New Exercise</button>
              {allExercises?.map(ex => (
                  <button key={ex.id} onClick={() => { setSelectedEx(ex); setStep('configure'); }} className="w-full text-left p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-between">
                      <span className="font-bold text-zinc-300">{ex.name}</span>
                      <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-500 uppercase">{ex.category}</span>
                  </button>
              ))}
          </div>
      </div>
  );

  if (step === 'create') return (
      <div className="fixed inset-0 z-[9050] bg-black/95 flex flex-col p-6 justify-center">
          <h3 className="font-bold text-white text-xl mb-6">Create Custom Exercise</h3>
          <div className="space-y-4">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Exercise Name" className="w-full bg-zinc-900 p-4 rounded-xl text-white outline-none" />
              <div className="grid grid-cols-3 gap-2">
                  {['strength', 'cardio', 'isometric'].map(c => (
                      <button key={c} onClick={() => setNewCat(c as any)} className={`p-3 rounded-xl capitalize text-xs font-bold border ${newCat === c ? 'bg-green-500 text-black border-green-500' : 'bg-zinc-900 text-zinc-500 border-zinc-800'}`}>{c}</button>
                  ))}
              </div>
              <button onClick={handleCreateNew} className="w-full bg-white text-black font-bold py-4 rounded-xl">Save & Configure</button>
              <button onClick={() => setStep('select')} className="w-full text-zinc-500 py-4">Back</button>
          </div>
      </div>
  );

  // CONFIGURE TARGETS
  const isCardio = selectedEx?.category === 'cardio';
  const isIso = selectedEx?.category === 'isometric'; // <--- NEW CHECK

  return (
      <div className="fixed inset-0 z-[9100] bg-black/95 flex flex-col p-6 justify-center">
          <h3 className="font-bold text-white text-xl mb-2">{selectedEx?.name}</h3>
          <p className="text-zinc-500 text-sm mb-6">Set your targets for this routine.</p>
          
          <div className="space-y-4">
              {/* Sets */}
              <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Target Sets</label>
                  <input type="number" value={tSets} onChange={e => setTSets(e.target.value)} className="w-full bg-zinc-900 p-3 rounded-xl text-white font-bold mt-1" />
              </div>
              
              <div className="flex gap-4">
                  <div className="flex-1">
                      {/* LABEL LOGIC: Cardio=Dist, Iso/Str=Weight */}
                      <label className="text-xs font-bold text-zinc-500 uppercase">{isCardio ? 'Distance (km)' : 'Weight (kg)'}</label>
                      <input type="number" value={tWeight} onChange={e => setTWeight(e.target.value)} className="w-full bg-zinc-900 p-3 rounded-xl text-white font-bold mt-1" />
                  </div>
                  <div className="flex-1">
                      {/* LABEL LOGIC: Cardio=Time, Iso=Time, Str=Reps */}
                      <label className="text-xs font-bold text-zinc-500 uppercase">{isCardio ? 'Time (min)' : isIso ? 'Time (sec)' : 'Reps'}</label>
                      <input type="number" value={tReps} onChange={e => setTReps(e.target.value)} className="w-full bg-zinc-900 p-3 rounded-xl text-white font-bold mt-1" />
                  </div>
              </div>

              <button 
                  onClick={() => onAdd(selectedEx!, Number(tSets), Number(tReps), Number(tWeight))}
                  className="w-full bg-green-500 text-black font-bold py-4 rounded-xl mt-4"
              >
                  Add to Routine
              </button>
              <button onClick={() => setStep('select')} className="w-full text-zinc-500 py-4">Back</button>
          </div>
      </div>
  );
};


// --- MAIN COMPONENT ---
export default function RoutineManager({ onClose }: { onClose: () => void }) {
  const allExercises = useLiveQuery(() => db.exercises.toArray());
  const routines = useLiveQuery(() => db.routines.toArray());
  
  const [view, setView] = useState<'list' | 'create' | 'edit'>('list');
  const [editingRoutineId, setEditingRoutineId] = useState<number | null>(null);
  
  // Form State
  const [rName, setRName] = useState('');
  const [rElements, setRElements] = useState<RoutineElement[]>([]);
  const [showExPicker, setShowExPicker] = useState(false);

  // --- ACTIONS ---
  const handleSave = async () => {
    if (!rName) return alert("Routine name is required");
    
    try {
        if (editingRoutineId) {
            await db.routines.update(editingRoutineId, { name: rName, elements: rElements });
        } else {
            await db.routines.add({ name: rName, elements: rElements });
        }
        resetForm();
    } catch (error) {
        console.error("SAVE ERROR:", error);
        alert("Failed to save routine. See console.");
    }
  };

  const handleDeleteRoutine = async (id: number) => {
    if(confirm("Delete this routine?")) {
        try {
            await db.routines.delete(id);
        } catch(e) {
            console.error("Failed to delete", e);
        }
    }
  };

  const resetForm = () => {
    setRName(''); setRElements([]); setEditingRoutineId(null); setView('list');
  };

  const startEdit = (r: Routine) => {
    setEditingRoutineId(r.id!);
    setRName(r.name);
    setRElements(r.elements || []); 
    setView('edit');
  };

  const addExerciseToRoutine = (exercise: Exercise, sets: number, reps: number, weight: number) => {
    setRElements([...rElements, {
        exerciseId: exercise.id!,
        targetSets: sets,
        targetReps: reps,
        targetWeight: weight
    }]);
    setShowExPicker(false);
  };

  // --- PORTAL RENDER ---
  return createPortal(
    <div className="fixed inset-0 z-[9000] bg-zinc-950 flex flex-col p-4 animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-white italic">ROUTINE<span className="text-green-500">MANAGER</span></h2>
            <button onClick={onClose} className="text-zinc-500 font-bold p-2">Done</button>
        </div>

        {view === 'list' && (
            <div className="flex-1 overflow-y-auto space-y-3 pb-32">
                <button onClick={() => setView('create')} className="w-full p-4 bg-green-500 text-black font-black uppercase tracking-wider rounded-xl mb-4">+ Create New Routine</button>
                {routines?.map(r => (
                    <div key={r.id} className="bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                        <div><div className="font-bold text-white text-lg">{r.name}</div><div className="text-xs text-zinc-500">{r.elements?.length || 0} Exercises</div></div>
                        <div className="flex gap-2"><button onClick={() => startEdit(r)} className="px-3 py-2 bg-zinc-800 text-zinc-300 text-xs font-bold rounded-lg">Edit</button><button onClick={() => handleDeleteRoutine(r.id!)} className="px-3 py-2 bg-red-900/20 text-red-500 text-xs font-bold rounded-lg">Del</button></div>
                    </div>
                ))}
            </div>
        )}

        {(view === 'create' || view === 'edit') && (
            <div className="flex-1 flex flex-col">
                <input value={rName} onChange={e => setRName(e.target.value)} placeholder="Routine Name (e.g. Chest A)" className="w-full bg-zinc-900 p-4 rounded-xl text-xl font-bold text-white mb-4 outline-none border border-transparent focus:border-green-500" />
                
                <div className="flex-1 overflow-y-auto space-y-2 mb-4 pb-10">
                    {rElements.map((el, idx) => {
                        const ex = allExercises?.find(e => e.id === el.exerciseId);
                        const exName = ex?.name || 'Unknown';
                        const isIso = ex?.category === 'isometric';
                        const isCardio = ex?.category === 'cardio';

                        return (
                            <div key={idx} className="flex justify-between items-center bg-zinc-900/50 p-3 rounded-lg border border-zinc-800/50">
                                <div>
                                    <div className="text-zinc-300 font-bold">{exName}</div>
                                    <div className="text-xs text-zinc-500">
                                        Target: {el.targetSets} x {el.targetWeight > 0 ? `${el.targetWeight}kg` : 'BW'} / {el.targetReps} {isCardio ? 'min' : isIso ? 'sec' : 'reps'}
                                    </div>
                                </div>
                                <button onClick={() => setRElements(rElements.filter((_, i) => i !== idx))} className="text-red-500 text-xs font-bold">✕</button>
                            </div>
                        )
                    })}
                    <button onClick={() => setShowExPicker(true)} className="w-full py-3 border border-zinc-800 border-dashed text-zinc-500 rounded-lg text-sm font-bold">+ Add Exercise</button>
                </div>

                {/* Bottom Buttons with Bottom Padding Buffer */}
                <div className="flex gap-3 mb-10 mt-auto pt-4 border-t border-zinc-900">
                    <button onClick={resetForm} className="flex-1 py-4 bg-zinc-900 text-zinc-400 font-bold rounded-xl">Cancel</button>
                    <button onClick={handleSave} className="flex-1 py-4 bg-green-500 text-black font-bold rounded-xl">Save Routine</button>
                </div>
            </div>
        )}

        {showExPicker && (
            <ExercisePicker 
                allExercises={allExercises}
                onCancel={() => setShowExPicker(false)}
                onAdd={addExerciseToRoutine}
            />
        )}
    </div>,
    document.body 
  );
}