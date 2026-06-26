// Invisible virtual analog on left half of screen.
// Up = pitch up, left = bank left. Bank + pitch = turn (real flight mechanic).
// ponytail: invisible touch zone, no visible stick, no gyro.

export class InputController {
  pitchIntent = 0;  // -1 (down) .. 1 (up)
  rollIntent = 0;   // -1 (left) .. 1 (right)

  private dragging = false;
  private startX = 0;
  private startY = 0;
  private maxRadius = 80;  // analog travel radius in px

  private readonly onDown = (e: PointerEvent) => {
    // left half of screen only
    if (e.clientX > window.innerWidth / 2) return;
    this.dragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
  };

  private readonly onMove = (e: PointerEvent) => {
    if (!this.dragging) return;
    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clamped = Math.min(dist, this.maxRadius);
    const angle = Math.atan2(dy, dx);
    const cx = Math.cos(angle) * clamped;
    const cy = Math.sin(angle) * clamped;
    // up (negative dy) = positive pitch intent (nose up)
    this.pitchIntent = -cy / this.maxRadius;
    this.rollIntent = cx / this.maxRadius;
  };

  private readonly onUp = () => {
    this.dragging = false;
  };

  constructor(private readonly canvas: HTMLCanvasElement) {
    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onUp);
  }

  decay(): void {
    if (!this.dragging) {
      this.pitchIntent *= 0.9;
      this.rollIntent *= 0.9;
    }
  }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onUp);
  }
}
