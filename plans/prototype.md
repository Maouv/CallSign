# CALLSIGN — MVP Prototype Plan

## Scope
Pure flight + HUD demo. No weapons, no enemies, no sound.
Goal: feel the flying + see the F-16 HUD respond correctly.

## Stack
Vite + Three.js + TypeScript (via `create_threejs_game.py` scaffold)

## What We Keep from Scaffold
- `core/Renderer.ts` — WebGLRenderer setup, resize, DPR clamp
- `core/Loop.ts` — rAF loop, delta clamp
- `core/InputController.ts` — **modify** (strip touch stick, add mouse-drag + gyro)
- `systems/DebugTools.ts` — **modify** (lil-gui for flight tuning)
- `game/Game.ts` — **modify** (strip arena/pickups/collision/audio)
- `utils/dispose.ts` — keep as-is
- `index.html`, `styles.css`, `vite.config.ts`, `tsconfig.json` — **modify**

## What We Strip
- `entities/Player.ts` — replaced by FlightModel
- `entities/Pickup.ts` — not needed
- `systems/CollisionSystem.ts` — not needed
- `systems/AudioSystem.ts` — skip for prototype
- `systems/CameraRig.ts` — replaced by CockpitCamera
- `systems/Hud.ts` — replaced by SVG HUD

## What We Add

### New Systems
| File | Purpose |
|---|---|
| `systems/Sky.ts` | Gradient shader sphere (dark blue → orange → red horizon) |
| `systems/Terrain.ts` | Infinite procedural terrain (single large plane, noise-offset scroll) |
| `systems/CockpitCamera.ts` | First-person camera, smooth interpolation, bank tilt, G-force |
| `systems/FlightModel.ts` | Flight physics: pitch/roll/yaw, inertia, gravity, auto-forward |
| `systems/Hud.ts` | SVG overlay — all dynamic HUD elements |

### Config
| File | Purpose |
|---|---|
| `config/constants.ts` | DISPLAY + WORLD tuning constants (user-specified) |

## Architecture (Modified)

```
callsign/
├── src/
│   ├── main.ts
│   ├── styles.css           # cockpit frame, vignette, HUD SVG container
│   ├── config/
│   │   └── constants.ts
│   ├── core/
│   │   ├── Renderer.ts      # + post-FX pass setup
│   │   ├── Loop.ts
│   │   └── InputController.ts   # mouse-drag + gyro → pitch/roll intents
│   ├── game/
│   │   └── Game.ts          # orchestration, update order
│   ├── systems/
│   │   ├── Sky.ts
│   │   ├── Terrain.ts
│   │   ├── CockpitCamera.ts
│   │   ├── FlightModel.ts
│   │   ├── Hud.ts           # SVG dynamic HUD
│   │   └── DebugTools.ts
│   └── utils/
│       └── dispose.ts
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Update Order (per frame)
```
input → flightModel → cockpitCamera → terrain scroll → HUD update → render
```

## Implementation Phases

### Phase 1: Scaffold + Sky + Camera Movement
**Goal:** See the sky, move camera with mouse.

1. Run `create_threejs_game.py ./callsign`
2. Strip: Player, Pickup, CollisionSystem, AudioSystem, CameraRig, Hud
3. `Sky.ts`: Large sphere (radius ~500) with custom ShaderMaterial
   - Vertex shader: pass UV
   - Fragment shader: gradient based on UV.y
     - top (#0a0a1a) → mid (#1a1530) → horizon (#FF6B1A) → below (#3a2a1a)
   - `side: THREE.BackSide` (inside sphere)
   - Subtle stars at top (procedural noise, very faint)
4. `CockpitCamera.ts`: First-person
   - FOV 60, near 0.1, far 2000
   - Position: fixed origin (player is world, not entity)
   - Rotation: pitch + roll from input, smooth lerped
   - No position movement — terrain moves under camera
5. `InputController.ts`: Mouse drag
   - `pointerdown` → start drag
   - `pointermove` → delta Y = pitch intent, delta X = roll intent
   - `pointerup/leave` → stop drag, decay input
6. `Game.ts`: Wire sky + camera + input, minimal loop
7. `styles.css`: Full-screen canvas, `cursor: none`, `touch-action: none`

**Verify:** Sky gradient renders, drag mouse → camera pitches/rolls, release → returns to level.

---

### Phase 2: Flight Physics
**Goal:** Realistic flight feel — inertia, gravity, bank-turn coupling.

1. `config/constants.ts`:
```typescript
export const DISPLAY = {
  speed: { cruise: 480, min: 280 },    // knots — shown on HUD
  altitude: { cruise: 15000, max: 45000 },  // feet — shown on HUD
}

export const WORLD = {
  moveSpeed: 0.8,       // terrain scroll speed
  bankRate: 0.04,       // roll response
  pitchRate: 0.03,      // pitch response
  inertia: 0.92,        // 0=instant, 1=no friction
  gravityPull: 0.001,   // nose drop when no input
  maxBank: 1.2,         // radians (~69°)
  maxPitch: 0.5,        // radians (~28°)
}
```

2. `FlightModel.ts`:
   - State: `pitch`, `roll` (bank angle), `yaw`, `altitude`, `speed`
   - Auto-forward: speed = constant cruise (DISPLAY.speed.cruise)
   - Input → target pitch/roll
   - Current pitch/roll lerps toward target with inertia (0.92)
   - Bank angle → yaw rate (turning): `yawRate = sin(roll) * turnFactor`
   - Gravity: if no pitch input, pitch drifts down (`gravityPull`)
   - G-force: derived from turn rate → feeds vignette intensity
   - Altitude: derived from pitch (pitch up → altitude increase)
   - World position tracked (for terrain scroll offset) but camera stays at origin

3. `CockpitCamera.ts` update:
   - Read pitch/roll/yaw from FlightModel
   - Apply to camera quaternion (smooth interpolated)
   - G-force → subtle screen darkening (post-FX or vignette opacity)

4. `DebugTools.ts`: lil-gui sliders for all WORLD constants

**Verify:** Bank left → nose yaws left (turn), release → slowly levels, pitch up → climbs, no input → gentle nose drop. Constants tunable live.

---

### Phase 3: Procedural Terrain
**Goal:** Infinite terrain visible from altitude, color masses, haze at horizon.

1. `Terrain.ts`:
   - Single large plane: `PlaneGeometry(4000, 4000, 256, 256)`
   - Rotated flat (XZ plane), positioned at y = -altitudeOffset below camera
   - Custom ShaderMaterial:
     - Vertex: displace Y by noise(uv * scale + worldOffset)
       - Amplitude subtle at high altitude (0.5 units)
       - Noise: simplex or value noise (GLSL inline, no dependency)
     - Fragment: color by height
       - Below sea level threshold → dark blue (#0a1a2a)
       - Above → green (#1a3a1a) with noise variation
       - Distance from center → blend to horizon haze color (#FF6B1A mixed)
     - `worldOffset` uniform = player world position (FlightModel tracks this)
     - As player flies forward, offset increases → terrain pattern scrolls
   - Fog: scene.fog matches horizon color, far = ~2000 units

2. Plane stays at origin, noise UV scrolls → "infinite" feel
3. No chunk management needed for prototype (single plane, GPU noise)
4. Sea/land differentiation: noise threshold in shader

**Verify:** Terrain visible below, scrolls as you fly, haze blends at horizon, no visible edge or repetition pattern obvious.

---

### Phase 4: SVG HUD
**Goal:** All F-16 HUD elements respond to flight state in real-time.

1. `index.html`: Add SVG container inside cockpit frame
```html
<div id="cockpit-frame">
  <svg id="hud-svg" viewBox="0 0 800 600">
    <!-- dynamic groups updated by JS -->
  </svg>
</div>
```

2. `Hud.ts` — SVG element references + per-frame update:
   - **Pitch ladder** (`<g id="pitch-ladder">`):
     - Lines every 5° from -30° to +30° (visible range)
     - `transform: rotate(${bank}) translate(0, ${pitch * pxPerDeg})`
     - `clipPath` to HUD area rectangle
   - **Artificial horizon** (`<line id="horizon-line">`):
     - Part of pitch ladder group (0° line, thicker)
   - **Airspeed ladder** (`<g id="speed-ladder">` left center):
     - Knots scale, numbers scroll vertically
     - Current speed bracket pointer (fixed center)
   - **Altitude ladder** (`<g id="alt-ladder">` right center):
     - Feet scale (thousands), mirror of speed
   - **Heading tape** (`<g id="heading-tape">` top):
     - 0-360° horizontal, `translate(${heading * pxPerDeg}, 0)`
     - Current heading bracket (fixed center)
   - **Flight path marker** (`<g id="fpm">` center):
     - Circle + 2 short wings
     - Position = actual velocity vector (pitch + slip offset)
   - **Callsign** (`<text id="callsign">` bottom-left): "VIPER"
   - **Mode** (`<text id="mode">` bottom-right): "NAV"

3. `styles.css`:
   - `#hud-svg`: green phosphor `#39FF14`, `text-shadow: 0 0 4px #39FF14` (bloom)
   - All lines: `stroke: #39FF14; stroke-width: 1.5; filter: drop-shadow(0 0 2px #39FF14)`
   - `#cockpit-frame`: dark vignette border, `pointer-events: none`
   - Nose silhouette: CSS pseudo-element, dark triangle bottom-center

4. Per-frame update: `Hud.update(flightState)` sets all `transform` attributes

**Verify:** Bank → pitch ladder rotates, pitch up → ladder scrolls down, speed constant → speed ladder steady, heading changes as you turn → tape scrolls, FPM moves with actual vector.

---

### Phase 5: Post-FX + Mobile + Polish
**Goal:** Atmospheric look + mobile landscape support.

1. Post-processing:
   - **Bloom**: CSS-based on HUD elements (text-shadow + drop-shadow) — no Three.js post-proc pass needed for prototype
   - **Chromatic aberration**: subtle SVG filter or CSS on canvas edge
   - **Vignette**: CSS radial gradient overlay (cockpit canopy frame)
   - **G-force darkening**: CSS overlay opacity tied to G-force value
   - **Camera shake**: subtle random offset in CockpitCamera, very low amplitude

2. Mobile:
   - `InputController.ts`: `DeviceOrientationEvent` 
     - `beta` (front-back tilt) → pitch intent
     - `gamma` (left-right tilt) → roll intent
   - Landscape lock: CSS `@media (orientation: portrait)` → show "rotate device" overlay
   - `touch-action: none` on canvas
   - No buttons, no analog — tilt only

3. Cockpit darkness:
   - Interior fully dark — no cockpit lights
   - Only HUD green glow visible against dark frame
   - CSS: `body { background: #000 }`, cockpit frame `background: rgba(0,0,0,0.85)`

4. Subtle details:
   - Head bob: imperceptible sine offset on camera (amplitude 0.001)
   - Horizon tilt: already handled by camera roll
   - Stars: very faint, only in top 30% of sky sphere

**Verify:** Desktop screenshot shows atmospheric cockpit + HUD. Mobile landscape screenshot shows same. No buttons visible. HUD readable. Console clean.

## Tuning Constants (User-Specified)

```typescript
// DISPLAY — what HUD shows (no relation to world units)
const DISPLAY = {
  speed: { cruise: 480, min: 280 },
  altitude: { cruise: 15000, max: 45000 },
}

// WORLD — pure feel-tuning, no physical meaning
const WORLD = {
  moveSpeed: 0.8,
  bankRate: 0.04,
  pitchRate: 0.03,
  inertia: 0.92,
  gravityPull: 0.001,
}
```

## Input Summary

| Platform | Pitch | Roll | Throttle | Weapon |
|---|---|---|---|---|
| Desktop | Mouse drag Y | Mouse drag X | Auto (constant) | N/A (prototype) |
| Mobile | Tilt forward/back | Tilt left/right | Auto (constant) | N/A (prototype) |

## Key Design Decisions

1. **Camera at origin, world moves** — not player entity moving through world. Simpler, avoids float precision issues at "high speed". Terrain noise offset = world position.
2. **Single plane terrain, GPU noise** — no chunk system for prototype. One mesh, one shader. Ponytail.
3. **SVG HUD, not Three.js HUD** — crisp text, inspectable, `setAttribute` per frame. User explicitly requested SVG for dynamic elements.
4. **CSS cockpit frame** — static, doesn't move. User confirmed.
5. **No physics engine** — custom flight model. Arcade-sim-lite. No Rapier/cannon needed.
6. **CSS bloom, not post-proc pass** — `text-shadow` + `drop-shadow` on SVG elements. Lighter, sufficient for prototype.
7. **No external assets** — all procedural (shaders, SVG, CSS). No 3D models, no textures, no API keys needed.

## Verification Checklist (Prototype Done When)

- [ ] `npm run build` passes
- [ ] Browser runs, console clean
- [ ] Desktop: sky + terrain + HUD visible
- [ ] Mouse drag → pitch/roll responsive
- [ ] Bank turn → heading changes, HUD responds
- [ ] Pitch ladder rotates with bank, scrolls with pitch
- [ ] Speed/alt ladder show realistic values (480 knots, 15000 ft)
- [ ] Heading tape scrolls correctly
- [ ] FPM moves with actual flight vector
- [ ] Cockpit frame dark, only HUD green glow
- [ ] Mobile landscape: gyro tilt works
- [ ] Mobile portrait: "rotate device" overlay
- [ ] Canvas pixel check non-blank
- [ ] No external assets/API keys needed
