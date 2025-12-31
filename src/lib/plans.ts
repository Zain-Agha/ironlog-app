export const PLAN_LOGIC = {
  // 1. FAT LOSS / RECOMP
  loss: [
    { name: 'Squat', targetMuscle: 'Legs', category: 'strength' },
    { name: 'Bench Press', targetMuscle: 'Chest', category: 'strength' },
    { name: 'Deadlift', targetMuscle: 'Back', category: 'strength' },
    { name: 'Overhead Press', targetMuscle: 'Shoulders', category: 'strength' },
    { name: 'Incline Walk', targetMuscle: 'Cardio', category: 'cardio' }
  ],

  // 2. STRENGTH
  strength: [
    { name: 'Squat', targetMuscle: 'Legs', category: 'strength' },
    { name: 'Bench Press', targetMuscle: 'Chest', category: 'strength' },
    { name: 'Deadlift', targetMuscle: 'Back', category: 'strength' },
    { name: 'Barbell Row', targetMuscle: 'Back', category: 'strength' },
    { name: 'Overhead Press', targetMuscle: 'Shoulders', category: 'strength' }
  ],

  // 3. HYPERTROPHY
  hypertrophy: [
    { name: 'Incline Dumbbell Press', targetMuscle: 'Chest', category: 'strength' },
    { name: 'Lat Pulldown', targetMuscle: 'Back', category: 'strength' },
    { name: 'Leg Press', targetMuscle: 'Legs', category: 'strength' },
    { name: 'Lateral Raise', targetMuscle: 'Shoulders', category: 'strength' },
    { name: 'Tricep Extension', targetMuscle: 'Arms', category: 'strength' },
    { name: 'Bicep Curl', targetMuscle: 'Arms', category: 'strength' }
  ],

  // 4. ENDURANCE (Fixing Planks here)
  endurance: [
    { name: 'Running (5k)', targetMuscle: 'Cardio', category: 'cardio' },
    { name: 'Cycling', targetMuscle: 'Cardio', category: 'cardio' },
    { name: 'Jump Rope', targetMuscle: 'Cardio', category: 'cardio' },
    // Changed category to 'isometric' so Logger knows to ask for Time, not Reps
    { name: 'Plank', targetMuscle: 'Core', category: 'isometric' } 
  ]
};