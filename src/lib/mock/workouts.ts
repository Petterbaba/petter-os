import type { WeeklyVolume, Workout } from "@/lib/types";

export const sisteOkt: Workout = {
  id: "w-2026-07-30",
  date: "2026-07-30",
  name: "Underkropp A",
  durationMin: 68,
  sets: [
    { id: "s1", workoutId: "w-2026-07-30", exercise: "Knebøy", setNumber: 1, weightKg: 120, reps: 5 },
    { id: "s2", workoutId: "w-2026-07-30", exercise: "Knebøy", setNumber: 2, weightKg: 130, reps: 5 },
    { id: "s3", workoutId: "w-2026-07-30", exercise: "Knebøy", setNumber: 3, weightKg: 137.5, reps: 4 },
    { id: "s4", workoutId: "w-2026-07-30", exercise: "Markløft", setNumber: 1, weightKg: 150, reps: 5 },
    { id: "s5", workoutId: "w-2026-07-30", exercise: "Markløft", setNumber: 2, weightKg: 162.5, reps: 3 },
    { id: "s6", workoutId: "w-2026-07-30", exercise: "Utfall", setNumber: 1, weightKg: 24, reps: 10 },
    { id: "s7", workoutId: "w-2026-07-30", exercise: "Utfall", setNumber: 2, weightKg: 24, reps: 10 },
    { id: "s8", workoutId: "w-2026-07-30", exercise: "Stående leggpress", setNumber: 1, weightKg: 80, reps: 12 },
    { id: "s9", workoutId: "w-2026-07-30", exercise: "Stående leggpress", setNumber: 2, weightKg: 80, reps: 11 },
  ],
};

export const volumtrend: WeeklyVolume[] = [
  { week: "Uke 24", volumeKg: 24800 },
  { week: "Uke 25", volumeKg: 27350 },
  { week: "Uke 26", volumeKg: 26100 },
  { week: "Uke 27", volumeKg: 29400 },
  { week: "Uke 28", volumeKg: 18200 }, // ferieuke
  { week: "Uke 29", volumeKg: 27900 },
  { week: "Uke 30", volumeKg: 30650 },
  { week: "Uke 31", volumeKg: 31200 },
];
