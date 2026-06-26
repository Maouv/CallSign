import * as THREE from 'three';
import { InputController } from '../core/InputController';
import { Loop } from '../core/Loop';
import { createRenderer, resizeRenderer } from '../core/Renderer';
import { FlightModel } from '../systems/FlightModel';

// ponytail: sky + camera inline in Game. Split when it grows.

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 top = vec3(0.04, 0.04, 0.10);
    vec3 horizon = vec3(1.0, 0.42, 0.10);
    vec3 below = vec3(0.23, 0.17, 0.10);
    vec3 color;
    if (h > 0.0) {
      color = mix(horizon, top, pow(h, 0.4));
    } else {
      color = mix(horizon, below, pow(-h, 0.6));
    }
    gl_FragColor = vec4(color, 1.0);
  }
`;

export class Game {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
  private readonly input: InputController;
  private readonly flight = new FlightModel();
  private readonly loop: Loop;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = createRenderer(canvas);
    this.renderer.shadowMap.enabled = false;

    this.input = new InputController(canvas);
    this.camera.position.set(0, 0, 0);

    this.createSky();

    this.loop = new Loop(
      (delta) => this.update(delta),
      () => this.renderer.render(this.scene, this.camera),
    );

    resizeRenderer(this.renderer, this.camera);
    this.loop.start();
  }

  private update(delta: number): void {
    resizeRenderer(this.renderer, this.camera);

    // input → flight model → camera
    this.flight.update(delta, this.input.pitchIntent, this.input.rollIntent);
    this.input.decay();

    // apply flight attitude to camera: yaw(Y) → pitch(X) → roll(Z)
    const q = new THREE.Quaternion();
    q.setFromEuler(new THREE.Euler(this.flight.pitch, this.flight.yaw, this.flight.roll, 'YXZ'));
    this.camera.quaternion.copy(q);

    // diagnostics
    (window as any).__CALLSIGN_DIAG__ = {
      pitch: this.flight.pitch,
      roll: this.flight.roll,
      yaw: this.flight.yaw,
      heading: this.flight.headingDeg,
      altitude: this.flight.altitude,
      speed: this.flight.speed,
      gForce: this.flight.gForce,
      worldZ: this.flight.worldZ,
    };
  }

  private createSky(): void {
    const geo = new THREE.SphereGeometry(500, 32, 32);
    const mat = new THREE.ShaderMaterial({
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.scene.add(new THREE.Mesh(geo, mat));
  }

  dispose(): void {
    this.loop.stop();
    this.input.dispose();
    this.renderer.dispose();
  }
}
