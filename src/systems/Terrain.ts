import * as THREE from 'three';

// Single plane, GPU noise, scrolls via worldOffset uniform.
// ponytail: no chunk system, no CPU noise.

const VERT = /* glsl */ `
  uniform float uWorldZ;
  uniform float uWorldX;
  uniform float uScale;
  varying float vHeight;
  varying vec2 vUv;

  // hash-based value noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vUv = uv;
    vec2 ncoord = uv * uScale + vec2(uWorldX, uWorldZ);
    float h = noise(ncoord) * 0.5 + noise(ncoord * 2.0) * 0.25 + noise(ncoord * 4.0) * 0.125;
    vHeight = h;
    vec3 pos = position;
    pos.y += (h - 0.5) * 80.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAG = /* glsl */ `
  varying float vHeight;
  varying vec2 vUv;

  void main() {
    vec3 sea = vec3(0.04, 0.10, 0.16);
    vec3 land = vec3(0.10, 0.23, 0.10);
    vec3 highland = vec3(0.16, 0.16, 0.08);

    float t = smoothstep(0.35, 0.55, vHeight);
    vec3 color = mix(sea, land, t);
    color = mix(color, highland, smoothstep(0.6, 0.8, vHeight));

    // distance haze toward horizon color
    float dist = length(vUv - 0.5) * 2.0;
    vec3 haze = vec3(1.0, 0.42, 0.10);
    color = mix(color, haze, smoothstep(0.3, 0.55, dist));

    gl_FragColor = vec4(color, 1.0);
  }
`;

export class Terrain {
  readonly mesh: THREE.Mesh;
  private readonly mat: THREE.ShaderMaterial;

  constructor() {
    const geo = new THREE.PlaneGeometry(4000, 4000, 256, 256);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uWorldZ: { value: 0 },
        uWorldX: { value: 0 },
        uScale: { value: 0.05 },
      },
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = -200;
  }

  update(worldX: number, worldZ: number): void {
    this.mat.uniforms.uWorldX.value = worldX * 0.01;
    this.mat.uniforms.uWorldZ.value = worldZ * 0.01;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.mat.dispose();
  }
}
