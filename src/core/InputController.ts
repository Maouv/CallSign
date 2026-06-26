// Mouse drag (desktop) + gyro tilt (mobile) → pitch/roll intents.
// ponytail: one input class, both platforms.

export class InputController {
  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  pitchIntent = 0;
  rollIntent = 0;
  private gyroActive = false;

  private readonly onDown = (e: PointerEvent) => {
    if (this.gyroActive) return;
    this.dragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private readonly onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.lastX;
    const dy = e.clientY - this.lastY;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
    this.rollIntent = Math.max(-1, Math.min(1, dx * 0.008));
    this.pitchIntent = Math.max(-1, Math.min(1, dy * 0.008));
  };

  private readonly onUp = () => {
    this.dragging = false;
  };

  private readonly onOrient = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return;
    this.gyroActive = true;
    // beta: front-back tilt (0=flat, -90=up). gamma: left-right tilt.
    this.pitchIntent = Math.max(-1, Math.min(1, (e.beta - 45) / 45));
    this.rollIntent = Math.max(-1, Math.min(1, e.gamma / 45));
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
    window.addEventListener('deviceorientation', this.onOrient);
  }

  decay(): void {
    if (!this.dragging && !this.gyroActive) {
      this.pitchIntent *= 0.9;
      this.rollIntent *= 0.9;
    }
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
    window.removeEventListener('deviceorientation', this.onOrient);
  }
}
