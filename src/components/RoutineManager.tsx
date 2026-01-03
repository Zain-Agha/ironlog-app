import { useState } from 'react';
import { createPortal } from 'react-dom'; 
import { db, type Exercise, type Routine, type RoutineElement } from '../db';
import { useLiveQuery } from 'dexie-react-hooks';

// --- EXTRACTED COMPONENT: EXERCISE PICKER ---
const ExercisePicker = ({ 
  allExercises, 
  initialValues, // NEW: Accepts existing values for editing
  onCancel, 
  onAdd 
}: { 
  allExercises: Exercise[] | undefined; 
  initialValues?: RoutineElement | null; // NEW
  onCancel: () => void; 
  onAdd: (exercise: Exercise, sets: number, reps: number, weight: number, speed?: number) => void;
}) => {
  const [step, setStep] = useState<'select' | 'configure' | 'create'>(initialValues ? 'configure' : 'select');
  
  // Pre-fill if editing, otherwise null
  const [selectedEx, setSelectedEx] = useState<Exercise | null>(
    initialValues ? allExercises?.find(e => e.id === initialValues.exerciseId) || null : null
  );
  
  // Pre-fill state or default
  const [tSets, setTSets] = useState(initialValues ? String(initialValues.targetSets) : '1'); 
  const [tReps, setTReps] = useState(initialValues ? String(initialValues.targetReps) : '10'); 
  const [tWeight, setTWeight] = useState(initialValues ? String(initialValues.targetWeight) : '0'); 
  const [tSpeed, setTSpeed] = useState(initialValues ? String((initialValues as any).targetSpeed || '0') : '0'); 

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

  const isCardio = selectedEx?.category === 'cardio';
  const isIso = selectedEx?.category === 'isometric';

  return (
      <div className="fixed inset-0 z-[9100] bg-black/95 flex flex-col p-6 justify-center">
          <h3 className="font-bold text-white text-xl mb-2">{selectedEx?.name}</h3>
          <p className="text-zinc-500 text-sm mb-6">Set your targets for this routine.</p>
          
          <div className="space-y-4">
              <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase">Target Sets</label>
                  <input type="number" value={tSets} onChange={e => setTSets(e.target.value)} className="w-full bg-zinc-900 p-3 rounded-xl text-white font-bold mt-1" />
              </div>
              
              <div className="flex gap-4">
                  <div className="flex-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{isCardio ? 'Incline (Level)' : 'Weight (kg)'}</label>
                      <input type="number" value={tWeight} onChange={e => setTWeight(e.target.value)} className="w-full bg-zinc-900 p-3 rounded-xl text-white font-bold mt-1" />
                  </div>
                  <div className="flex-1">
                      <label className="text-xs font-bold text-zinc-500 uppercase">{isCardio ? 'Time (min)' : isIso ? 'Time (sec)' : 'Reps'}</label>
                      <input type="number" value={tReps} onChange={e => setTReps(e.target.value)} className="w-full bg-zinc-900 p-3 rounded-xl text-white font-bold mt-1" />
                  </div>
              </div>

              {isCardio && (
                  <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase">Speed (km/h)</label>
                      <input type="number" value={tSpeed} onChange={e => setTSpeed(e.target.value)} className="w-full bg-zinc-900 p-3 rounded-xl text-white font-bold mt-1" />
                  </div>
              )}

              <button 
                  onClick={() => onAdd(selectedEx!, Number(tSets), Number(tReps), Number(tWeight), Number(tSpeed))}
                  className="w-full bg-green-500 text-black font-bold py-4 rounded-xl mt-4"
              >
                  {initialValues ? 'Update Exercise' : 'Add to Routine'}
              </button>
              <button onClick={() => { 
                  // If editing, cancel goes back to form. If adding, cancel goes back to picker.
                  initialValues ? onCancel() : setStep('select');
              }} className="w-full text-zinc-500 py-4">Back</button>
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
  
  const [rName, setRName] = useState('');
  const [rElements, setRElements] = useState<RoutineElement[]>([]);
  
  const [showExPicker, setShowExPicker] = useState(false);
  const [editingElementIndex, setEditingElementIndex] = useState<number | null>(null); // NEW: Track which row is being edited

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
        alert("Failed to save routine.");
    }
  };

  const handleDeleteRoutine = async (id: number) => {
    if(confirm("Delete this routine?")) await db.routines.delete(id);
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

  // NEW: Opens picker in "Edit Mode"
  const startEditExercise = (index: number) => {
    setEditingElementIndex(index);
    setShowExPicker(true);
  };

  // NEW: Handles both Adding and Updating
  const handleExerciseSubmit = (exercise: Exercise, sets: number, reps: number, weight: number, speed?: number) => {
    const newElement: RoutineElement & { targetSpeed?: number } = {
        exerciseId: exercise.id!,
        targetSets: sets,
        targetReps: reps,
        targetWeight: weight,
        targetSpeed: speed
    };

    if (editingElementIndex !== null) {
        // UPDATE existing row
        const updated = [...rElements];
        updated[editingElementIndex] = newElement;
        setRElements(updated);
    } else {
        // ADD new row
        setRElements([...rElements, newElement]);
    }
    
    // Reset state
    setShowExPicker(false);
    setEditingElementIndex(null);
  };

  return createPortal(
    <div className="fixed inset-0 z-[9000] bg-zinc-950 flex flex-col overflow-hidden">
        
        {/* HEADER: Stays at top */}
        <div className="px-4 pt-14 pb-4 flex justify-between items-center border-b border-zinc-900 bg-zinc-950">
            <h2 className="text-2xl font-black text-white italic tracking-tighter">ROUTINE<span className="text-green-500">MANAGER</span></h2>
            <button onClick={onClose} className="text-zinc-500 font-bold p-2">Done</button>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-y-auto min-h-0 px-4 pt-4 scrollbar-hide">
            {view === 'list' && (
                <div className="space-y-3 pb-32">
                    <button onClick={() => setView('create')} className="w-full p-4 bg-green-500 text-black font-black uppercase tracking-wider rounded-xl mb-4 shadow-lg shadow-green-900/20 active:scale-95 transition-transform">+ Create New Routine</button>
                    {routines?.map(r => (
                        <div key={r.id} className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center">
                            <div><div className="font-bold text-white text-lg">{r.name}</div><div className="text-xs text-zinc-500">{r.elements?.length || 0} Exercises</div></div>
                            <div className="flex gap-2">
                                <button onClick={() => startEdit(r)} className="px-4 py-2 bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl border border-zinc-700">Edit</button>
                                <button onClick={() => handleDeleteRoutine(r.id!)} className="px-4 py-2 bg-red-950/30 text-red-500 text-xs font-bold rounded-xl border border-red-900/20">Del</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {(view === 'create' || view === 'edit') && (
                <div className="flex flex-col pb-32">
                    <input 
                        value={rName} 
                        onChange={e => setRName(e.target.value)} 
                        placeholder="Routine Name (e.g. Legs & Push)" 
                        className="w-full bg-zinc-900 p-4 rounded-2xl text-xl font-bold text-white mb-6 outline-none border border-zinc-800 focus:border-green-500 transition-colors" 
                    />
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center mb-2 px-1">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Exercises</span>
                            <span className="text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded">{rElements.length} Total</span>
                        </div>

                        {rElements.map((el, idx) => {
                            const ex = allExercises?.find(e => e.id === el.exerciseId);
                            const exName = ex?.name || 'Unknown';
                            const isIso = ex?.category === 'isometric';
                            const isCardio = ex?.category === 'cardio';
                            
                            let detailText = `${el.targetSets} sets × ${el.targetReps} reps @ ${el.targetWeight}kg`;
                            if (isCardio) {
                                const speedText = (el as any).targetSpeed ? `@ ${(el as any).targetSpeed}km/h` : '';
                                detailText = `${el.targetReps} mins ${speedText} (Incline ${el.targetWeight})`;
                            } else if (isIso) {
                                detailText = `${el.targetReps}s hold × ${el.targetSets} sets`;
                            }

                            return (
                                // NEW: Added onClick to the container div to trigger edit
                                <div 
                                    key={idx} 
                                    onClick={() => startEditExercise(idx)}
                                    className="flex justify-between items-center bg-zinc-900/30 p-4 rounded-2xl border border-zinc-800/50 active:bg-zinc-800 transition-colors cursor-pointer"
                                >
                                    <div className="flex-1">
                                        <div className="text-zinc-200 font-bold">{exName}</div>
                                        <div className="text-[10px] text-zinc-500 font-bold uppercase mt-0.5 tracking-tight">{detailText}</div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setRElements(rElements.filter((_, i) => i !== idx)); }} 
                                        className="ml-4 w-8 h-8 flex items-center justify-center bg-zinc-800 rounded-full text-zinc-500 text-xs font-bold hover:text-red-500 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )
                        })}
                        
                        <button 
                            onClick={() => { setEditingElementIndex(null); setShowExPicker(true); }} 
                            className="w-full py-4 border-2 border-zinc-800 border-dashed text-zinc-500 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-zinc-900/30 transition-colors"
                        >
                            + Add Exercise
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* FOOTER: Stays locked at bottom */}
        {(view === 'create' || view === 'edit') && (
            <div className="px-4 pb-10 pt-4 bg-zinc-950 border-t border-zinc-900 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
                <div className="flex gap-3">
                    <button onClick={resetForm} className="flex-1 py-4 bg-zinc-900 text-zinc-400 font-black uppercase tracking-widest rounded-2xl border border-zinc-800">Cancel</button>
                    <button onClick={handleSave} className="flex-1 py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-green-900/20 active:scale-95 transition-transform">Save Routine</button>
                </div>
            </div>
        )}

        {showExPicker && (
            <ExercisePicker 
                allExercises={allExercises}
                initialValues={editingElementIndex !== null ? rElements[editingElementIndex] : null} // Pass existing data if editing
                onCancel={() => { setShowExPicker(false); setEditingElementIndex(null); }}
                onAdd={handleExerciseSubmit}
            />
        )}
    </div>,
    document.body 
  );
}