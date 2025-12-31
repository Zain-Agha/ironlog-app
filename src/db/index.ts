import Dexie, { type Table } from 'dexie';

// --- TYPES ---
export interface UserProfile {
  id?: number;
  name: string;
  gender: 'male' | 'female';
  birthYear: number;
  height: number;
  startingWeight: number;
  currentWeight: number;
  goalWeight: number;
  goal: 'loss' | 'maintain' | 'gain';
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  onboardingComplete: boolean;
}

// New: Detailed Element inside a Routine
export interface RoutineElement {
  exerciseId: number;
  targetSets: number;
  targetReps: number;   // Or Time (min) for cardio
  targetWeight: number; // Or Distance (km) for cardio
}

export interface Routine {
  id?: number;
  name: string;
  elements: RoutineElement[]; // <--- REPLACED 'exerciseIds'
}

export interface Schedule {
  id?: number;
  dayIndex: number; 
  routineId: number | null; 
}

export interface Exercise {
  id?: number;
  name: string;
  targetMuscle: string;
  category: 'strength' | 'cardio' | 'isometric';
  isCustom?: boolean;
}

export interface DailyLog {
  id?: number;
  date: string;
  calories: number;
  protein: number;
  loggedWeight?: number;
}

export interface SetLog {
  id?: number;
  exerciseId: number;
  weight: number;
  reps: number;
  calories?: number;
  isWarmup: boolean;
  timestamp: number;
}

// --- DATABASE CLASS ---
class IronLogDB extends Dexie {
  profile!: Table<UserProfile>;
  routines!: Table<Routine>;
  schedule!: Table<Schedule>;
  exercises!: Table<Exercise>;
  dailyLogs!: Table<DailyLog>;
  sets!: Table<SetLog>; 

  constructor() {
   super('IronLogDB_Fresh');
    
    // VERSION 7: Updated for new Routine structure
    this.version(7).stores({
      profile: '++id', 
      routines: '++id',
      schedule: '++id, dayIndex', 
      exercises: '++id, name',
      dailyLogs: '++id, date',
      sets: '++id, exerciseId, timestamp'
    });
  }
}

export const db = new IronLogDB();

db.on('populate', async () => {
  await db.exercises.bulkAdd([
    { name: 'Bench Press', targetMuscle: 'Chest', category: 'strength' },
    { name: 'Squat', targetMuscle: 'Legs', category: 'strength' },
    { name: 'Deadlift', targetMuscle: 'Back', category: 'strength' },
    { name: 'Overhead Press', targetMuscle: 'Shoulders', category: 'strength' },
    { name: 'Pull Up', targetMuscle: 'Back', category: 'strength' },
    { name: 'Incline Walk', targetMuscle: 'Cardio', category: 'cardio' },
    { name: 'Plank', targetMuscle: 'Core', category: 'isometric' },
  ]);

  const emptySchedule = Array.from({ length: 7 }, (_, i) => ({
    dayIndex: i,
    routineId: null
  }));
  await db.schedule.bulkAdd(emptySchedule);
});