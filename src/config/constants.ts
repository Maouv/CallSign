// DISPLAY — what HUD shows (no relation to world units)
export const DISPLAY = {
  speed: { cruise: 480, min: 280 },       // knots
  altitude: { cruise: 15000, max: 45000 }, // feet
};

// WORLD — pure feel-tuning
export const WORLD = {
  moveSpeed: 0.8,      // terrain scroll speed
  bankRate: 0.04,      // roll response
  pitchRate: 0.03,     // pitch response
  inertia: 0.92,       // 0=instant, 1=no friction
  gravityPull: 0.001,  // nose drop when no input
  maxBank: 1.2,        // radians (~69°)
  maxPitch: 0.5,       // radians (~28°)
  turnFactor: 0.8,     // bank → yaw rate
};
