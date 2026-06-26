import { WORLD, DISPLAY } from '../config/constants';

// Flight state + physics. Camera reads from this.
// ponytail: no physics engine, just integrated state.

export class FlightModel {
  pitch = 0;       // radians
  roll = 0;        // bank angle, radians
  yaw = 0;         // heading, radians
  altitude = DISPLAY.altitude.cruise;  // feet
  speed = DISPLAY.speed.cruise;        // knots
  gForce = 1;
  worldZ = 0;      // forward distance traveled (terrain scroll offset)

  private targetPitch = 0;
  private targetRoll = 0;
  private yawRate = 0;

  update(delta: number, pitchIntent: number, rollIntent: number): void {
    // input → target attitude
    this.targetPitch = pitchIntent * WORLD.maxPitch;
    this.targetRoll = rollIntent * WORLD.maxBank;

    // smooth lerp toward target (inertia)
    const lerp = 1 - Math.pow(WORLD.inertia, delta * 60);
    this.pitch += (this.targetPitch - this.pitch) * lerp;
    this.roll += (this.targetRoll - this.roll) * lerp;

    // gravity: nose drops when no pitch input
    if (Math.abs(pitchIntent) < 0.01) {
      this.pitch -= WORLD.gravityPull;
    }

    // bank → yaw (turning)
    this.yawRate = Math.sin(this.roll) * WORLD.turnFactor;
    this.yaw += this.yawRate * delta;

    // g-force from turn rate (centripetal)
    this.gForce = 1 + Math.abs(this.yawRate) * 3;

    // altitude from pitch
    this.altitude += Math.sin(this.pitch) * this.speed * 0.5 * delta;
    this.altitude = Math.max(0, Math.min(DISPLAY.altitude.max, this.altitude));

    // world position for terrain scroll
    this.worldZ += WORLD.moveSpeed * delta * 60;
  }

  // heading in degrees 0-360
  get headingDeg(): number {
    let deg = (this.yaw * 180 / Math.PI) % 360;
    if (deg < 0) deg += 360;
    return deg;
  }
}
