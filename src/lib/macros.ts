export const calculateTargets = (
  weightKg: number, 
  heightCm: number, 
  age: number, 
  gender: 'male' | 'female', 
  goal: 'loss' | 'maintain' | 'gain'
) => {
  // 1. Calculate BMR (Mifflin-St Jeor Equation)
  // Men: 10W + 6.25H - 5A + 5
  // Women: 10W + 6.25H - 5A - 161
  let bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * age);
  bmr += gender === 'male' ? 5 : -161;

  // 2. Estimate TDEE (Assume Moderate Activity x1.35 for gym goers)
  const tdee = Math.round(bmr * 1.35);

  // 3. Adjust for Goal
  let targetCalories = tdee;
  if (goal === 'loss') targetCalories -= 500; // Standard deficit
  if (goal === 'gain') targetCalories += 300; // Lean bulk

  // 4. Calculate Protein (2g per kg of bodyweight is standard for athletes)
  const targetProtein = Math.round(weightKg * 2);

  return { targetCalories, targetProtein, tdee };
};