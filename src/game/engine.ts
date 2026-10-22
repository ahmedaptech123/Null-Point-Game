import * as THREE from "three";
import { AudioSystem } from "./audio";
import {
  DIFFICULTIES,
  INITIAL_HUD,
  ROUND_SECONDS,
  WEAPONS,
  WEAPON_ORDER,
} from "./config";
import type {
  Announcement,
  DifficultySpec,
  EnemyBlip,
  FeedItem,
  HudState,
  Phase,
  RunConfig,
  RunResult,
  WeaponId,
} from "./config";

interface Enemy {
  id: number;
  group: THREE.Group;
  body: THREE.Mesh;
  bodyMaterial: THREE.MeshStandardMaterial;
  eye: THREE.Mesh;
  rings: THREE.Mesh[];
  hitMeshes: THREE.Mesh[];
  hp: number;
  maxHp: number;
  heavy: boolean;
  speed: number;
  fireTimer: number;
  flash: number;
  phase: number;
  dead: boolean;
}

interface Projectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  life: number;
}

interface Tracer {
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  life: number;
  maxLife: number;
}

interface Effect {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  expand: number;
  spin: number;
}

interface Collider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

interface EngineCallbacks {
  onHud: (hud: HudState) => void;
  onEnd: (result: RunResult) => void;
}

const ADS_FOV: Record<WeaponId, number> = { pulse: 56, scatter: 65, rail: 30 };
const HIP_FOV = 74;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const damp = (current: number, target: number, smoothing: number, dt: number) =>
  THREE.MathUtils.lerp(current, target, Math.min(1, smoothing * dt));

function makeGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.25, "rgba(255,255,255,0.72)");
    gradient.addColorStop(0.55, "rgba(255,255,255,0.2)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeSurfaceTexture(base: string, seam: string, accent: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) {
      const value = Math.random();
      ctx.fillStyle =
        value > 0.55
          ? `rgba(255,255,255,${0.015 + Math.random() * 0.035})`
          : `rgba(0,0,0,${0.02 + Math.random() * 0.06})`;
      const size = 1 + Math.random() * 6;
      ctx.fillRect(Math.random() * 512, Math.random() * 512, size, size);
    }
    ctx.strokeStyle = seam;
    ctx.lineWidth = 3;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 128, 0);
      ctx.lineTo(i * 128, 512);
      ctx.moveTo(0, i * 128);
      ctx.lineTo(512, i * 128);
      ctx.stroke();
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, 112, 112);
    ctx.fillStyle = "rgba(215,255,63,0.11)";
    ctx.fillRect(12, 12, 42, 5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(5, 5);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export class GameEngine {
  private container: HTMLElement;
  private config: RunConfig;
  private callbacks: EngineCallbacks;
  private difficulty: DifficultySpec;
  private audio = new AudioSystem();

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private raf = 0;
  private disposed = false;

  private phase: Phase = "countdown";
  private player = new THREE.Vector3(0, 0, 18);
  private velocity = new THREE.Vector3();
  private verticalVelocity = 0;
  private grounded = true;
  private yaw = 0;
  private pitch = -0.02;
  private walkPhase = 0;
  private countdown = 3;
  private countdownEndsAt = 0;
  private elapsed = 0;
  private timeLeft = ROUND_SECONDS;
  private wave = 1;

  private keys = new Set<string>();
  private touchMove = { x: 0, z: 0 };
  private triggerHeld = false;
  private aiming = false;
  private aimMix = 0;
  private fireCooldown = 0;
  private recoil = 0;
  private shake = 0;
  private reloading = false;
  private reloadTimer = 0;
  private reloadDuration = 0;

  private activeWeapon: WeaponId = "pulse";
  private ammo: Record<WeaponId, { ammo: number; reserve: number }> = {
    pulse: { ammo: 30, reserve: 240 },
    scatter: { ammo: 7, reserve: 49 },
    rail: { ammo: 5, reserve: 25 },
  };
  private score = 0;
  private kills = 0;
  private headshots = 0;
  private shots = 0;
  private hits = 0;
  private health = 100;
  private shield = 50;
  private lastDamageAt = -10;
  private spawnTimer = 2.2;
  private enemyId = 1;
  private eventId = 1;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private tracers: Tracer[] = [];
  private effects: Effect[] = [];
  private arenaHitMeshes: THREE.Object3D[] = [];
  private colliders: Collider[] = [];
  private timedFeed: { item: FeedItem; expires: number }[] = [];
  private announcement: Announcement | null = null;
  private announceUntil = 0;
  private damagePulse = 0;
  private hitPulse = 0;
  private lastHitKill = false;
  private lastHitHead = false;

  private locked = false;
  private lockAcquiredAt = 0;
  private wasLocked = false;
  private isTouch = false;
  private touchLook: { id: number; x: number; y: number } | null = null;
  private lastHudAt = 0;

  private gunGroups = {} as Record<WeaponId, THREE.Group>;
  private gunFlashes = {} as Record<WeaponId, THREE.Mesh>;
  private gunFlashStars = {} as Record<WeaponId, THREE.Mesh>;
  private gunMuzzles = {} as Record<WeaponId, THREE.Object3D>;
  private gunBase = new THREE.Vector3(0.27, -0.225, -0.78);
  private flashTimer = 0;
  private beaconRings: THREE.Mesh[] = [];
  private dust!: THREE.Points;
  private beacon!: THREE.Group;
  private tempDirection = new THREE.Vector3();
  private glowTexture = makeGlowTexture();
  private floorTexture?: THREE.Texture;
  private crateTexture?: THREE.Texture;

  constructor(container: HTMLElement, config: RunConfig, callbacks: EngineCallbacks) {
    this.container = container;
    this.config = config;
    this.callbacks = callbacks;
    this.difficulty = DIFFICULTIES[config.difficulty];
    this.activeWeapon = config.weapon;
    this.audio.muted = config.muted;
  }

  start() {
    this.buildRenderer();
    this.buildScene();
    this.buildArena();
    this.buildViewmodel();
    this.resetRun();
    this.bindEvents();
    this.emitHud();

    for (let i = 0; i < 3; i++) this.spawnEnemy();
    this.applyWeaponVisibility();

    this.clock.start();
    this.raf = requestAnimationFrame(this.loop);
    this.requestMouse();
  }

  private buildRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.touchAction = "none";
    this.container.appendChild(this.renderer.domElement);
    this.isTouch = window.matchMedia("(pointer: coarse)").matches;
  }

  private buildScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#060c0d");
    this.scene.fog = new THREE.FogExp2(0x0d1a1a, 0.0075);
    const camera = new THREE.PerspectiveCamera(
      HIP_FOV,
      this.container.clientWidth / Math.max(1, this.container.clientHeight),
      0.05,
      220,
    );
    camera.rotation.order = "YXZ";
    this.camera = camera;
    this.scene.add(camera);

    this.scene.add(new THREE.HemisphereLight(0xc9ddd4, 0x2a3a2f, 2.55));
    this.scene.add(new THREE.AmbientLight(0xa8bdac, 0.62));

    const key = new THREE.DirectionalLight(0xe6f2e8, 3.2);
    key.position.set(14, 24, 18);
    this.scene.add(key);

    const backLight = new THREE.DirectionalLight(0xb9d8c9, 2.1);
    backLight.position.set(-6, 16, -30);
    this.scene.add(backLight);

    const fill = new THREE.DirectionalLight(0xbdd7a8, 1.15);
    fill.position.set(-10, 14, -18);
    this.scene.add(fill);

    const lime = new THREE.PointLight(0xd7ff3f, 34, 38, 2);
    lime.position.set(-15, 10, -13);
    this.scene.add(lime);

    const cyan = new THREE.PointLight(0x79d3df, 45, 38, 2);
    cyan.position.set(16, 8, 9);
    this.scene.add(cyan);

    const warm = new THREE.PointLight(0xff8b4a, 42, 28, 2);
    warm.position.set(4, 6, -21);
    this.scene.add(warm);

    const spawnLight = new THREE.PointLight(0xdfeecf, 30, 28, 2);
    spawnLight.position.set(0, 9, 16);
    this.scene.add(spawnLight);

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(170, 24, 12),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `varying vec3 vPos; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vPos = wp.xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying vec3 vPos; void main(){ float h = normalize(vPos).y; vec3 low = vec3(0.008,0.018,0.019); vec3 high = vec3(0.016,0.036,0.04); vec3 col = mix(low, high, smoothstep(-0.15, 0.65, h)); float glow = pow(max(0.0, 1.0 - abs(h - 0.03) * 3.4), 5.0); col += vec3(0.24,0.3,0.1) * glow * 0.35; gl_FragColor = vec4(col,1.0); }`,
      }),
    );
    this.scene.add(sky);
  }

  private buildArena() {
    this.floorTexture = makeSurfaceTexture("#2b3731", "rgba(10,16,13,0.55)", "rgba(160,182,134,0.12)");
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(64, 64),
      new THREE.MeshStandardMaterial({ map: this.floorTexture, roughness: 0.9, metalness: 0.12 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.userData.solid = true;
    this.scene.add(floor);
    this.arenaHitMeshes.push(floor);

    const grid = new THREE.GridHelper(64, 32, 0x7a9660, 0x38483a);
    grid.position.y = 0.015;
    const gridMat = grid.material as THREE.LineBasicMaterial;
    gridMat.transparent = true;
    gridMat.opacity = 0.5;
    this.scene.add(grid);

    const outerRing = new THREE.Mesh(
      new THREE.RingGeometry(11.4, 11.56, 80),
      new THREE.MeshBasicMaterial({ color: 0xd7ff3f, transparent: true, opacity: 0.65, side: THREE.DoubleSide }),
    );
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.set(0, 0.025, -2);
    this.scene.add(outerRing);

    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(5.4, 5.48, 64),
      new THREE.MeshBasicMaterial({ color: 0x9bb56c, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.set(0, 0.03, -2);
    this.scene.add(innerRing);

    const stripeMat = new THREE.MeshBasicMaterial({ color: 0xd7ff3f, transparent: true, opacity: 0.6 });
    for (let i = -2; i <= 2; i++) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 5.5), stripeMat);
      stripe.position.set(i * 3.6, 0.03, 18);
      this.scene.add(stripe);
    }

    const runway = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 18),
      new THREE.MeshBasicMaterial({ color: 0x8ba36b, transparent: true, opacity: 0.12 }),
    );
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(0, 0.022, 9);
    this.scene.add(runway);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x2f3d36, roughness: 0.8, metalness: 0.3 });
    const wallTrim = new THREE.MeshStandardMaterial({
      color: 0x556c47,
      emissive: 0xd7ff3f,
      emissiveIntensity: 1.1,
      roughness: 0.4,
      metalness: 0.6,
    });
    const wallDefs = [
      { x: 0, z: -30, w: 62, d: 1.4, h: 4.8 },
      { x: 0, z: 30, w: 62, d: 1.4, h: 4.8 },
      { x: -30, z: 0, w: 1.4, d: 62, h: 4.8 },
      { x: 30, z: 0, w: 1.4, d: 62, h: 4.8 },
    ];
    wallDefs.forEach((def) => {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.h, def.d), wallMat);
      wall.position.set(def.x, def.h / 2, def.z);
      wall.userData.solid = true;
      this.scene.add(wall);
      this.arenaHitMeshes.push(wall);

      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(def.w === 62 ? def.w : 0.12, 0.14, def.w === 62 ? 0.12 : def.w),
        wallTrim,
      );
      trim.position.set(def.x, 3.45, def.z + (def.z === -30 ? 0.74 : def.z === 30 ? -0.74 : 0));
      trim.position.x += def.x === -30 ? 0.74 : def.x === 30 ? -0.74 : 0;
      this.scene.add(trim);
    });

    this.crateTexture = makeSurfaceTexture("#48574e", "rgba(12,18,14,0.65)", "rgba(205,225,175,0.2)");
    this.crateTexture.repeat.set(1.5, 1.5);
    const crateMat = new THREE.MeshStandardMaterial({ map: this.crateTexture, roughness: 0.74, metalness: 0.3 });
    const crateEdgeMat = new THREE.LineBasicMaterial({ color: 0x9aab8b, transparent: true, opacity: 0.75 });
    const crateDefs = [
      { x: -9, z: -5, w: 3.4, h: 2.6, d: 3 },
      { x: 8.5, z: -3, w: 4.4, h: 2.1, d: 3.2 },
      { x: -15, z: 8, w: 2.8, h: 3.2, d: 2.8 },
      { x: 14, z: 11, w: 3.6, h: 2.4, d: 3.6 },
      { x: 3, z: -16, w: 2.2, h: 4.2, d: 2.2 },
      { x: 19, z: -13, w: 4.2, h: 2.8, d: 2.6 },
      { x: -20, z: -18, w: 3, h: 3.6, d: 3 },
      { x: 17, z: 21, w: 2.6, h: 2.2, d: 3.4 },
      { x: -9, z: 20, w: 2.2, h: 1.7, d: 2.2 },
    ];
    crateDefs.forEach((c) => {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(c.w, c.h, c.d), crateMat);
      crate.position.set(c.x, c.h / 2, c.z);
      crate.userData.solid = true;
      this.scene.add(crate);
      this.arenaHitMeshes.push(crate);

      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(crate.geometry), crateEdgeMat);
      edges.position.copy(crate.position);
      this.scene.add(edges);

      const tape = new THREE.Mesh(
        new THREE.BoxGeometry(c.w + 0.03, 0.09, 0.07),
        new THREE.MeshBasicMaterial({ color: 0xd7ff3f, transparent: true, opacity: 0.8 }),
      );
      tape.position.set(c.x, c.h * 0.72, c.z + c.d / 2 + 0.02);
      this.scene.add(tape);

      this.colliders.push({
        minX: c.x - c.w / 2,
        maxX: c.x + c.w / 2,
        minZ: c.z - c.d / 2,
        maxZ: c.z + c.d / 2,
      });
    });

    const columnMat = new THREE.MeshStandardMaterial({ color: 0x42524a, roughness: 0.64, metalness: 0.44 });
    const columnDefs = [
      { x: -23, z: -22 },
      { x: 23, z: -22 },
      { x: 23, z: 16 },
      { x: -23, z: 16 },
      { x: 0, z: -24 },
    ];
    columnDefs.forEach((c) => {
      const column = new THREE.Mesh(new THREE.BoxGeometry(2.1, 9.5, 2.1), columnMat);
      column.position.set(c.x, 4.75, c.z);
      column.userData.solid = true;
      this.scene.add(column);
      this.arenaHitMeshes.push(column);
      const light = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 5, 0.09),
        new THREE.MeshBasicMaterial({ color: 0xd7ff3f, transparent: true, opacity: 0.85 }),
      );
      light.position.set(c.x + 1.06, 4.6, c.z);
      this.scene.add(light);
      this.colliders.push({
        minX: c.x - 1.05,
        maxX: c.x + 1.05,
        minZ: c.z - 1.05,
        maxZ: c.z + 1.05,
      });
    });

    const beamMat = new THREE.MeshStandardMaterial({ color: 0x2b3732, roughness: 0.68, metalness: 0.6 });
    [
      { x: 0, z: -22.5, w: 45, d: 0.45 },
      { x: 0, z: 17, w: 45, d: 0.45 },
      { x: -22, z: 0, w: 0.45, d: 38 },
      { x: 21, z: 0, w: 0.45, d: 38 },
    ].forEach((b, index) => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(b.w, 0.45, b.d), beamMat);
      beam.position.set(b.x, 8.6 + (index % 2) * 0.9, b.z);
      this.scene.add(beam);
    });

    const lampMat = new THREE.MeshBasicMaterial({ color: 0xf0ffc9 });
    [-8, 0, 8].forEach((x) => {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.08, 0.2), lampMat);
      lamp.position.set(x, 8.05, -6);
      this.scene.add(lamp);
    });

    const supportMat = new THREE.MeshStandardMaterial({ color: 0x26322d, roughness: 0.6, metalness: 0.6 });
    for (const [x, z] of [
      [-20, -22.5],
      [-7, -22.5],
      [7, -22.5],
      [20, -22.5],
    ]) {
      const support = new THREE.Mesh(new THREE.BoxGeometry(0.18, 8.6, 0.18), supportMat);
      support.position.set(x, 4.3, z);
      this.scene.add(support);
    }
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x3a473c, metalness: 0.4, roughness: 0.7 });
    [[-18, 0.9, 24], [18, 0.9, 24]].forEach(([x, h, z]) => {
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(9, h, 0.7), barrierMat);
      barrier.position.set(x, h / 2, z);
      this.scene.add(barrier);
      const strip = new THREE.Mesh(new THREE.BoxGeometry(9, 0.05, 0.72), new THREE.MeshBasicMaterial({ color: 0xd7ff3f, transparent: true, opacity: 0.5 }));
      strip.position.set(x, h - 0.06, z);
      this.scene.add(strip);
    });

    const horizonCanvas = document.createElement("canvas");
    horizonCanvas.width = 8;
    horizonCanvas.height = 128;
    const horizonCtx = horizonCanvas.getContext("2d");
    if (horizonCtx) {
      const grad = horizonCtx.createLinearGradient(0, 128, 0, 0);
      grad.addColorStop(0, "rgba(178,214,196,0.5)");
      grad.addColorStop(0.22, "rgba(96,142,126,0.22)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      horizonCtx.fillStyle = grad;
      horizonCtx.fillRect(0, 0, 8, 128);
    }
    const horizonTexture = new THREE.CanvasTexture(horizonCanvas);
    horizonTexture.colorSpace = THREE.SRGBColorSpace;
    const horizon = new THREE.Mesh(
      new THREE.PlaneGeometry(150, 22),
      new THREE.MeshBasicMaterial({
        map: horizonTexture,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    );
    horizon.position.set(0, 8, -58);
    this.scene.add(horizon);
    const horizonBack = horizon.clone();
    horizonBack.position.set(0, 7, 58);
    horizonBack.rotation.y = Math.PI;
    this.scene.add(horizonBack);

    this.buildBeacon(new THREE.Vector3(0, 0, -8));
    this.buildSkyline();
    this.buildSigns();
    this.buildAtmosphere();
  }

  private buildBeacon(pos: THREE.Vector3) {
    const group = new THREE.Group();
    group.position.copy(pos);
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4, 3.9, 0.32, 10),
      new THREE.MeshStandardMaterial({ color: 0x35423c, metalness: 0.7, roughness: 0.35 }),
    );
    base.position.y = 0.16;
    group.add(base);

    const pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 1.2, 1.1),
      new THREE.MeshStandardMaterial({ color: 0x46554d, metalness: 0.6, roughness: 0.4 }),
    );
    pedestal.position.y = 0.9;
    group.add(pedestal);

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xd7ff3f,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2 + i * 0.75, 0.024, 8, 64), glowMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.3 + i * 0.85;
      group.add(ring);
      this.beaconRings.push(ring);
    }

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.12, 7, 8, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xd7ff3f,
        transparent: true,
        opacity: 0.18,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    beam.position.y = 4;
    group.add(beam);

    const mote = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: 0xe5ff8a }),
    );
    mote.position.y = 3.4;
    group.add(mote);

    this.scene.add(group);
    this.beacon = group;
  }

  private buildSkyline() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x1b2624, roughness: 0.95, metalness: 0.15 });
    const closeMat = new THREE.MeshStandardMaterial({ color: 0x111b1a, roughness: 0.9, metalness: 0.25 });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + 0.12;
      const radius = 35 + (i % 3) * 2.5;
      const height = 11 + ((i * 5) % 14);
      const width = 3.4 + (i % 3) * 1.8;
      const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), closeMat);
      tower.position.set(Math.cos(angle) * radius, height / 2 - 1, Math.sin(angle) * radius);
      this.scene.add(tower);
      const strip = new THREE.Mesh(
        new THREE.PlaneGeometry(0.16, height * 0.42),
        new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xd7ff3f : 0x7fb9a8, transparent: true, opacity: 0.55 }),
      );
      strip.position.set(Math.cos(angle) * (radius - width / 2 - 0.03), height * 0.5, Math.sin(angle) * (radius - width / 2 - 0.03));
      strip.lookAt(0, height * 0.5, 0);
      this.scene.add(strip);
      const cap = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.35, 0.1, width * 0.35),
        new THREE.MeshBasicMaterial({ color: 0xd7ff3f, transparent: true, opacity: 0.45 }),
      );
      cap.position.set(Math.cos(angle) * radius, height - 0.6, Math.sin(angle) * radius);
      this.scene.add(cap);
    }
    for (let i = 0; i < 26; i++) {
      const side = Math.floor(i / 7);
      const angle = (i / 26) * Math.PI * 2 + 0.25;
      const radius = 40 + (i % 5) * 4;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const height = 8 + ((i * 7) % 22) + (side === 1 ? 8 : 0);
      const width = 4 + (i % 4) * 2.4;
      const tower = new THREE.Mesh(new THREE.BoxGeometry(width, height, width), mat);
      tower.position.set(x, height / 2 - 1, z);
      this.scene.add(tower);

      if (i % 2 === 0) {
        const window = new THREE.Mesh(
          new THREE.PlaneGeometry(width * 0.18, height * 0.5),
          new THREE.MeshBasicMaterial({
            color: i % 4 === 0 ? 0xd7ff3f : 0x62a5a8,
            transparent: true,
            opacity: 0.4,
          }),
        );
        window.position.set(x, height * 0.56, z);
        window.lookAt(0, height * 0.56, 0);
        this.scene.add(window);
      }
    }
  }

  private makeSign(title: string, subtitle: string) {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 280;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(6,12,9,0.72)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(215,255,63,0.55)";
      ctx.lineWidth = 3;
      ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
      ctx.fillStyle = "rgba(215,255,63,0.9)";
      ctx.font = "700 22px monospace";
      ctx.fillText("NULLPOINT / TACTICAL SIMULATION", 52, 70);
      ctx.fillStyle = "#e8ebdd";
      ctx.font = "800 92px sans-serif";
      ctx.fillText(title, 50, 170);
      ctx.fillStyle = "rgba(215,255,63,0.65)";
      ctx.font = "600 24px monospace";
      ctx.fillText(subtitle, 52, 218);
      ctx.fillRect(52, 240, 230, 3);
      ctx.fillRect(canvas.width - 220, 240, 168, 3);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, opacity: 0.94 });
    return new THREE.Mesh(new THREE.PlaneGeometry(20, 5.47), material);
  }

  private buildSigns() {
    const sign = this.makeSign("SECTOR 07", "DRIFT YARD  //  SIGNAL HUNT");
    sign.position.set(0, 6.8, -29.2);
    this.scene.add(sign);

    const sideSign = this.makeSign("NULL", "RESTRICTED AIRSPACE");
    sideSign.scale.setScalar(0.65);
    sideSign.position.set(-16, 6.1, 29.2);
    sideSign.rotation.y = Math.PI;
    this.scene.add(sideSign);

    const markerMat = new THREE.MeshBasicMaterial({ color: 0xd7ff3f, transparent: true, opacity: 0.6 });
    for (const [x, z] of [
      [-12, -24],
      [12, -24],
      [-12, 9],
      [12, 9],
    ]) {
      const marker = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.05), markerMat);
      marker.rotation.x = -Math.PI / 2;
      marker.position.set(x, 0.04, z);
      this.scene.add(marker);
    }
  }

  private buildAtmosphere() {
    const dustCount = 460;
    const dustPositions = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 58;
      dustPositions[i * 3 + 1] = Math.random() * 12 + 0.4;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 58;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    this.dust = new THREE.Points(
      dustGeometry,
      new THREE.PointsMaterial({
        color: 0xc3ddb8,
        size: 0.06,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.scene.add(this.dust);

    const starCount = 500;
    const stars = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 70 + Math.random() * 70;
      stars[i * 3] = Math.cos(angle) * radius;
      stars[i * 3 + 1] = 18 + Math.random() * 60;
      stars[i * 3 + 2] = Math.sin(angle) * radius;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute("position", new THREE.BufferAttribute(stars, 3));
    this.scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0x9fc6c4, size: 0.34, transparent: true, opacity: 0.55 }),
      ),
    );
  }

  private buildViewmodel() {
    const weaponLight = new THREE.PointLight(0xdfeccb, 0.35, 2.4, 2);
    weaponLight.position.set(0.3, 0.34, 0.2);
    this.camera.add(weaponLight);

    WEAPON_ORDER.forEach((id) => {
      const spec = WEAPONS[id];
      const group = new THREE.Group();

      const oliveMat = new THREE.MeshStandardMaterial({ color: 0x4a5144, roughness: 0.74, metalness: 0.18 });
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3e4a44, roughness: 0.56, metalness: 0.42 });
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x313a36, roughness: 0.52, metalness: 0.6 });
      const accentMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(spec.tone),
        emissive: new THREE.Color(spec.tone),
        emissiveIntensity: 1.35,
        roughness: 0.3,
        metalness: 0.35,
      });
      const gloveMat = new THREE.MeshStandardMaterial({ color: 0x4d5244, roughness: 0.95, metalness: 0.02 });

      // receiver
      const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.4), bodyMat);
      receiver.position.set(0, 0, -0.17);
      group.add(receiver);
      const receiverTop = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.03, 0.34), darkMat);
      receiverTop.position.set(0, 0.073, -0.17);
      group.add(receiverTop);

      // stock
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.1, 0.18), oliveMat);
      stock.position.set(0, -0.012, 0.1);
      group.add(stock);
      const butt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.13, 0.035), darkMat);
      butt.position.set(0, -0.02, 0.2);
      group.add(butt);

      // grip
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.13, 0.065), darkMat);
      grip.position.set(0, -0.1, 0.01);
      grip.rotation.x = -0.22;
      group.add(grip);

      // magazine
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.16, 0.08), oliveMat);
      mag.position.set(0, -0.12, -0.16);
      mag.rotation.x = 0.16;
      group.add(mag);

      // handguard
      const guardLength = id === "rail" ? 0.4 : id === "scatter" ? 0.26 : 0.32;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.085, guardLength), darkMat);
      guard.position.set(0, 0.005, -0.39 - guardLength / 2);
      group.add(guard);
      for (let i = 0; i < 3; i++) {
        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.012, 0.05), bodyMat);
        vent.position.set(0, 0.01, -0.43 - i * (guardLength / 3.4));
        group.add(vent);
      }

      // barrel + brake
      const barrelLength = id === "rail" ? 0.42 : id === "scatter" ? 0.2 : 0.26;
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.019, barrelLength, 10), darkMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.018, -0.39 - guardLength - barrelLength / 2);
      group.add(barrel);
      const brake = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.075), darkMat);
      brake.position.set(0, 0.018, -0.39 - guardLength - barrelLength - 0.02);
      group.add(brake);
      const brakeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.011, 0.05), accentMat);
      brakeStrip.position.set(0, 0.018, -0.39 - guardLength - barrelLength - 0.02);
      group.add(brakeStrip);

      // top rail accent
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.008, 0.2), accentMat);
      rail.position.set(0, 0.092, -0.2);
      group.add(rail);

      // optic / sight
      if (id === "rail") {
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.18, 14), darkMat);
        scope.rotation.x = Math.PI / 2;
        scope.position.set(0, 0.125, -0.17);
        group.add(scope);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.031, 18), accentMat);
        lens.position.set(0, 0.125, -0.262);
        group.add(lens);
        const mountA = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.04, 0.025), darkMat);
        mountA.position.set(0, 0.1, -0.09);
        group.add(mountA);
        const mountB = mountA.clone();
        mountB.position.z = -0.25;
        group.add(mountB);
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.22, 6), accentMat);
        spike.rotation.x = -Math.PI / 2;
        spike.position.set(0, 0.018, -0.39 - guardLength - barrelLength - 0.23);
        group.add(spike);
      } else if (id === "scatter") {
        const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.1, 12), darkMat);
        drum.rotation.z = Math.PI / 2;
        drum.position.set(0, 0.085, -0.29);
        group.add(drum);
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.008, 6, 18), accentMat);
        band.rotation.y = Math.PI / 2;
        band.position.set(0.052, 0.085, -0.29);
        group.add(band);
        const pump = new THREE.Mesh(new THREE.BoxGeometry(0.086, 0.07, 0.16), oliveMat);
        pump.position.set(0, -0.015, -0.55);
        group.add(pump);
      } else {
        const sightBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.032, 0.08), darkMat);
        sightBase.position.set(0, 0.1, -0.22);
        group.add(sightBase);
        const dot = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8), accentMat);
        dot.position.set(0, 0.12, -0.22);
        group.add(dot);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.004, 6, 20), darkMat);
        ring.rotation.y = Math.PI / 2;
        ring.position.set(0, 0.12, -0.22);
        group.add(ring);
      }

      // hands / forearms
      const gripHand = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.095, 0.11), gloveMat);
      gripHand.position.set(0, -0.13, 0.055);
      group.add(gripHand);
      const supportHand = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.075, 0.13), gloveMat);
      supportHand.position.set(0, -0.085, -0.47);
      supportHand.rotation.x = -0.25;
      group.add(supportHand);
      const triggerArm = new THREE.Mesh(new THREE.BoxGeometry(0.062, 0.058, 0.16), oliveMat);
      triggerArm.position.set(0.045, -0.17, 0.15);
      triggerArm.rotation.set(0.45, -0.2, -0.16);
      group.add(triggerArm);
      const supportArm = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.052, 0.15), oliveMat);
      supportArm.position.set(0.015, -0.135, -0.4);
      supportArm.rotation.set(0.55, 0.25, -0.25);
      group.add(supportArm);
      const wrist = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.024, 0.035), accentMat);
      wrist.position.set(0.03, -0.145, 0.09);
      wrist.rotation.set(0.45, -0.2, -0.16);
      group.add(wrist);

      // muzzle + flash
      const muzzle = new THREE.Object3D();
      muzzle.position.set(0, 0.018, -0.39 - guardLength - barrelLength - 0.06);
      group.add(muzzle);
      const flash = new THREE.Mesh(
        new THREE.SphereGeometry(id === "scatter" ? 0.07 : 0.045, 8, 8),
        new THREE.MeshBasicMaterial({
          color: 0xffefb0,
          transparent: true,
          opacity: 0.9,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      flash.position.copy(muzzle.position);
      flash.visible = false;
      group.add(flash);
      const flashStar = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.2, 5),
        new THREE.MeshBasicMaterial({
          color: 0xffe08a,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      flashStar.rotation.x = -Math.PI / 2;
      flashStar.position.set(0, 0.018, -0.39 - guardLength - barrelLength - 0.13);
      flashStar.visible = false;
      group.add(flashStar);

      group.position.copy(this.gunBase);
      group.rotation.set(0.02, 0.045, -0.03);
      group.scale.setScalar(0.5);
      group.visible = id === this.activeWeapon;
      this.camera.add(group);
      this.gunGroups[id] = group;
      this.gunFlashes[id] = flash;
      this.gunFlashStars[id] = flashStar;
      this.gunMuzzles[id] = muzzle;
    });
  }

  private resetRun() {
    this.phase = "countdown";
    this.player.set(0, 0, 18);
    this.yaw = 0;
    this.pitch = -0.02;
    this.velocity.set(0, 0, 0);
    this.verticalVelocity = 0;
    this.grounded = true;
    this.countdown = 3;
    this.countdownEndsAt = performance.now() + 3000;
    this.elapsed = 0;
    this.timeLeft = ROUND_SECONDS;
    this.wave = 1;
    this.score = 0;
    this.kills = 0;
    this.headshots = 0;
    this.shots = 0;
    this.hits = 0;
    this.health = 100;
    this.shield = 50;
    this.damagePulse = 0;
    this.hitPulse = 0;
    this.reloading = false;
    this.aiming = false;
    this.triggerHeld = false;
    this.spawnTimer = 2.4;
    this.timedFeed = [];
    this.addFeed("SIMULATION START", "SENTINEL SWEEP / WEAPONS FREE", "system");

    this.ammo = {
      pulse: { ammo: WEAPONS.pulse.magSize, reserve: WEAPONS.pulse.reserve },
      scatter: { ammo: WEAPONS.scatter.magSize, reserve: WEAPONS.scatter.reserve },
      rail: { ammo: WEAPONS.rail.magSize, reserve: WEAPONS.rail.reserve },
    };
    this.activeWeapon = this.config.weapon;
  }

  private applyWeaponVisibility() {
    WEAPON_ORDER.forEach((id) => {
      if (this.gunGroups[id]) this.gunGroups[id].visible = id === this.activeWeapon;
    });
  }

  private bindEvents() {
    const canvas = this.renderer.domElement;
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("mouseup", this.onMouseUp);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    canvas.addEventListener("mousedown", this.onCanvasMouseDown);
    canvas.addEventListener("contextmenu", this.onContextMenu);
    canvas.addEventListener("pointerdown", this.onTouchDown);
    canvas.addEventListener("pointermove", this.onTouchMove);
    canvas.addEventListener("pointerup", this.onTouchUp);
    canvas.addEventListener("pointercancel", this.onTouchUp);
    window.addEventListener("resize", this.onResize);
    window.addEventListener("blur", this.onBlur);
  }

  private onKeyDown = (event: KeyboardEvent) => {
    if (
      (event.code === "KeyP" || event.code === "Escape") &&
      (this.phase === "playing" || this.phase === "paused")
    ) {
      if (this.phase === "playing") this.pause();
      else this.resume();
      return;
    }
    if (this.phase !== "playing") return;
    this.keys.add(event.code);
    if (["Space", "KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) event.preventDefault();
    if (event.code === "Space" && this.grounded) {
      this.verticalVelocity = 5.6;
      this.grounded = false;
    }
    if (event.code === "KeyR") this.beginReload();
    if (event.code === "Digit1") this.switchWeapon("pulse");
    if (event.code === "Digit2") this.switchWeapon("scatter");
    if (event.code === "Digit3") this.switchWeapon("rail");
  };

  private onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code);
  };

  private onCanvasMouseDown = (event: MouseEvent) => {
    this.audio.init();
    if (this.isTouch) return;
    if (!this.locked && (this.phase === "playing" || this.phase === "countdown")) this.requestMouse();
    if (this.phase !== "playing") return;
    if (event.button === 0) {
      this.triggerHeld = true;
      this.tryFire();
    }
    if (event.button === 2) {
      this.aiming = true;
      this.emitHud();
    }
  };

  private onMouseUp = (event: MouseEvent) => {
    if (event.button === 0) this.triggerHeld = false;
    if (event.button === 2) this.aiming = false;
  };

  private onMouseMove = (event: MouseEvent) => {
    if (!this.locked || this.phase !== "playing") return;
    if (performance.now() - this.lockAcquiredAt < 180) return;
    const dx = clamp(event.movementX, -90, 90);
    const dy = clamp(event.movementY, -90, 90);
    if (Math.abs(dx) > 70 && Math.abs(dy) > 70) return;
    this.yaw -= dx * 0.00215;
    this.pitch = clamp(this.pitch - dy * 0.00215, -1.2, 1.2);
  };

  private onContextMenu = (event: Event) => event.preventDefault();

  private onTouchDown = (event: PointerEvent) => {
    if (event.pointerType !== "touch" || this.phase !== "playing") return;
    this.audio.init();
    this.touchLook = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  private onTouchMove = (event: PointerEvent) => {
    if (!this.touchLook || this.touchLook.id !== event.pointerId || this.phase !== "playing") return;
    const dx = event.clientX - this.touchLook.x;
    const dy = event.clientY - this.touchLook.y;
    this.touchLook.x = event.clientX;
    this.touchLook.y = event.clientY;
    this.yaw -= dx * 0.0045;
    this.pitch = clamp(this.pitch - dy * 0.0045, -1.45, 1.45);
  };

  private onTouchUp = (event: PointerEvent) => {
    if (this.touchLook?.id === event.pointerId) this.touchLook = null;
  };

  private onPointerLockChange = () => {
    const locked = !!this.renderer && document.pointerLockElement === this.renderer.domElement;
    this.locked = locked;
    if (locked) {
      this.wasLocked = true;
      this.lockAcquiredAt = performance.now();
      this.audio.init();
    } else if (this.wasLocked && (this.phase === "playing" || this.phase === "countdown")) {
      this.pause();
    }
    this.emitHud();
  };

  private onResize = () => {
    if (!this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private onBlur = () => {
    this.keys.clear();
    this.triggerHeld = false;
    this.touchMove = { x: 0, z: 0 };
    if (this.phase === "playing" && this.locked) this.pause();
  };

  requestMouse() {
    if (this.isTouch || !this.renderer || this.phase === "failed" || this.phase === "complete") return;
    try {
      const result = this.renderer.domElement.requestPointerLock() as unknown;
      if (result && typeof (result as Promise<void>).catch === "function") {
        (result as Promise<void>).catch(() => undefined);
      }
    } catch {
      // Some embedded browsers deny pointer lock. Keyboard and click still function.
    }
  }

  setMuted(muted: boolean) {
    this.audio.setMuted(muted);
  }

  setTouchMove(x: number, z: number) {
    this.touchMove = { x, z };
  }

  setTouchFire(firing: boolean) {
    this.audio.init();
    this.triggerHeld = firing;
    if (firing) this.tryFire();
  }

  setTouchAim(aiming: boolean) {
    this.aiming = aiming;
  }

  nextWeapon() {
    const index = WEAPON_ORDER.indexOf(this.activeWeapon);
    this.switchWeapon(WEAPON_ORDER[(index + 1) % WEAPON_ORDER.length]);
  }

  pause() {
    if (this.phase !== "playing" && this.phase !== "countdown") return;
    this.phase = "paused";
    this.triggerHeld = false;
    this.keys.clear();
    this.touchMove = { x: 0, z: 0 };
    if (document.pointerLockElement) document.exitPointerLock();
    this.emitHud();
  }

  resume() {
    if (this.phase !== "paused") return;
    this.phase = this.elapsed > 0 ? "playing" : "countdown";
    this.countdownEndsAt = performance.now() + Math.max(0.2, this.countdown) * 1000;
    this.audio.init();
    this.requestMouse();
    this.emitHud();
  }

  switchWeapon(id: WeaponId) {
    if (this.phase !== "playing" || id === this.activeWeapon) return;
    this.activeWeapon = id;
    this.reloading = false;
    this.reloadTimer = 0;
    this.aiming = false;
    this.fireCooldown = 0.18;
    this.applyWeaponVisibility();
    this.flashTimer = 0;
    this.audio.ui();
    this.emitHud();
  }

  reload() {
    this.beginReload();
  }

  private beginReload() {
    if (this.phase !== "playing") return;
    const spec = WEAPONS[this.activeWeapon];
    const ammo = this.ammo[this.activeWeapon];
    if (this.reloading || ammo.ammo >= spec.magSize || ammo.reserve <= 0) return;
    this.reloading = true;
    this.reloadTimer = spec.reloadTime;
    this.reloadDuration = spec.reloadTime;
    this.aiming = false;
    this.audio.reload();
    this.emitHud();
  }

  private tryFire() {
    if (this.phase !== "playing" || this.reloading || this.fireCooldown > 0) return;
    const spec = WEAPONS[this.activeWeapon];
    const ammo = this.ammo[this.activeWeapon];
    if (ammo.ammo <= 0) {
      this.audio.empty();
      this.fireCooldown = 0.22;
      this.beginReload();
      return;
    }

    ammo.ammo -= 1;
    this.shots += 1;
    this.fireCooldown = spec.fireInterval;
    this.recoil = Math.min(2.2, spec.recoil);
    this.shake = Math.max(this.shake, 0.22 + spec.recoil * 0.24);
    this.flashTimer = 0.055;
    this.audio.shoot(this.activeWeapon);
    this.pitch = clamp(this.pitch + spec.recoil * 0.006, -1.2, 1.2);

    this.camera.updateMatrixWorld();
    const start = this.gunMuzzles[this.activeWeapon].getWorldPosition(new THREE.Vector3());
    const targets = [...this.arenaHitMeshes, ...this.enemies.flatMap((enemy) => enemy.hitMeshes)];
    let hitAnything = false;
    let hitHead = false;
    let killedAnything = false;

    for (let pellet = 0; pellet < spec.pellets; pellet++) {
      this.camera.getWorldDirection(this.tempDirection);
      const spread = (this.aiming ? spec.spread * 0.32 : spec.spread) * (this.grounded ? 1 : 1.4);
      this.tempDirection.x += (Math.random() - 0.5) * spread * 1.7;
      this.tempDirection.y += (Math.random() - 0.5) * spread * 1.7;
      this.tempDirection.normalize();

      this.raycaster.set(this.camera.position, this.tempDirection);
      this.raycaster.far = spec.range;
      const intersections = this.raycaster.intersectObjects(targets, false);
      let end = this.camera.position.clone().addScaledVector(this.tempDirection, spec.range);
      if (intersections.length) {
        const hit = intersections[0];
        end = hit.point.clone();
        const enemyId = hit.object.userData.enemyId as number | undefined;
        if (enemyId !== undefined) {
          const enemy = this.enemies.find((candidate) => candidate.id === enemyId && !candidate.dead);
          if (enemy) {
            const head = Boolean(hit.object.userData.head);
            const result = this.damageEnemy(enemy, spec.damage * (head ? spec.headMultiplier : 1), head);
            hitAnything = true;
            hitHead = hitHead || head;
            killedAnything = killedAnything || result.killed;
            this.spawnBurst(hit.point, new THREE.Color(spec.tone), 4, 1.8);
          }
        } else {
          this.spawnBurst(hit.point, new THREE.Color("#c5d8c9"), 2, 0.8);
        }
      }
      this.spawnTracer(start, end, spec.tone);
    }

    if (hitAnything) {
      this.hits += 1;
      this.hitPulse += 1;
      this.lastHitKill = killedAnything;
      this.lastHitHead = hitHead;
      this.audio.hit(hitHead);
    }
    if (ammo.ammo <= 0) this.beginReload();
    this.emitHud();
  }

  private damageEnemy(enemy: Enemy, amount: number, headshot: boolean) {
    if (enemy.dead) return { killed: false };
    enemy.hp -= amount;
    enemy.flash = 0.1;
    if (enemy.hp <= 0) {
      this.killEnemy(enemy, headshot);
      return { killed: true };
    }
    return { killed: false };
  }

  private killEnemy(enemy: Enemy, headshot: boolean) {
    enemy.dead = true;
    const position = enemy.group.position.clone();
    const color = enemy.heavy ? new THREE.Color("#ff8a3a") : new THREE.Color("#ff5b3a");
    this.spawnBurst(position, color, 18, 4.6);
    this.spawnShockwave(position, color, enemy.heavy ? 6 : 4);

    this.enemies = this.enemies.filter((candidate) => candidate.id !== enemy.id);
    this.scene.remove(enemy.group);
    enemy.hitMeshes.forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    });

    this.kills += 1;
    if (headshot) this.headshots += 1;
    const base = enemy.heavy ? 220 : 100;
    const headBonus = headshot ? 80 : 0;
    const waveBonus = (this.wave - 1) * 15;
    const earned = Math.round((base + headBonus + waveBonus) * this.difficulty.scoreMultiplier);
    this.score += earned;
    this.shield = Math.min(50, this.shield + 5);
    this.health = Math.min(100, this.health + 2);

    const active = this.ammo[this.activeWeapon];
    active.reserve = Math.min(WEAPONS[this.activeWeapon].reserve, active.reserve + 9);

    this.audio.kill();
    this.addFeed(
      headshot ? "HEADSHOT CONFIRMED" : "SENTINEL TERMINATED",
      `${headshot ? "CRITICAL" : "CORE"} // +${earned} PTS`,
      headshot ? "headshot" : "kill",
    );
    this.emitHud();
  }

  private spawnEnemy() {
    const heavy = this.kills > 0 && Math.random() < Math.min(0.26, 0.06 + this.wave * 0.04);
    const group = new THREE.Group();
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: heavy ? 0xb08a63 : 0x8aa094,
      roughness: 0.44,
      metalness: 0.52,
      emissive: heavy ? 0x6f2a0a : 0x4a1c0a,
      emissiveIntensity: 1.9,
    });
    const body = new THREE.Mesh(
      heavy ? new THREE.OctahedronGeometry(0.92, 0) : new THREE.OctahedronGeometry(0.68, 0),
      bodyMaterial,
    );
    body.userData.enemyId = this.enemyId;
    body.userData.head = false;
    group.add(body);

    const eyeMaterial = new THREE.MeshBasicMaterial({ color: heavy ? 0xffb067 : 0xff6a45 });
    const eye = new THREE.Mesh(new THREE.SphereGeometry(heavy ? 0.22 : 0.165, 16, 12), eyeMaterial);
    eye.position.set(0, 0.03, heavy ? 0.86 : 0.66);
    eye.userData.enemyId = this.enemyId;
    eye.userData.head = true;
    group.add(eye);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(heavy ? 0.29 : 0.21, 12, 10),
      new THREE.MeshBasicMaterial({
        color: heavy ? 0xff8c45 : 0xff5b3a,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.position.copy(eye.position);
    group.add(halo);

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.glowTexture,
        color: heavy ? 0xff9a55 : 0xff6a45,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.scale.setScalar(heavy ? 3.8 : 3.0);
    group.add(glow);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(body.geometry),
      new THREE.LineBasicMaterial({
        color: heavy ? 0xffd0a4 : 0xffa382,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
      }),
    );
    outline.position.copy(body.position);
    group.add(outline);

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x5a3b2c,
      emissive: heavy ? 0xff7a35 : 0xd7ff3f,
      emissiveIntensity: 1.7,
      metalness: 0.7,
      roughness: 0.3,
    });
    const rings: THREE.Mesh[] = [];
    const ringA = new THREE.Mesh(new THREE.TorusGeometry(heavy ? 1.05 : 0.8, 0.024, 8, 40), ringMat);
    ringA.rotation.x = Math.PI / 2.4;
    group.add(ringA);
    rings.push(ringA);
    const ringB = new THREE.Mesh(new THREE.TorusGeometry(heavy ? 0.85 : 0.65, 0.018, 8, 40), ringMat);
    ringB.rotation.y = Math.PI / 2.6;
    group.add(ringB);
    rings.push(ringB);

    for (let i = 0; i < 3; i++) {
      const strut = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, heavy ? 0.5 : 0.36, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x59685f, metalness: 0.8, roughness: 0.3 }),
      );
      const angle = (i / 3) * Math.PI * 2;
      strut.position.set(Math.cos(angle) * 0.42, -0.45, Math.sin(angle) * 0.42);
      strut.rotation.z = Math.cos(angle) * 0.3;
      group.add(strut);
    }

    const angle = Math.random() * Math.PI * 2;
    const radius = 13 + Math.random() * 12;
    const x = clamp(Math.cos(angle) * radius, -25, 25);
    const z = clamp(Math.sin(angle) * radius, -25, 25);
    const isNearSpawn = Math.abs(x) < 4 && z > 8;
    group.position.set(isNearSpawn ? 14 : x, heavy ? 2.3 : 1.75, isNearSpawn ? -12 : z);
    this.scene.add(group);

    const hpBase = heavy ? 210 : 105;
    const healthScale = this.difficulty.health * (1 + (this.wave - 1) * 0.075);
    this.enemies.push({
      id: this.enemyId,
      group,
      body,
      bodyMaterial,
      eye,
      rings,
      hitMeshes: [body, eye],
      hp: hpBase * healthScale,
      maxHp: hpBase * healthScale,
      heavy,
      speed: (heavy ? 1.45 : 2.15 + Math.random() * 0.65) * this.difficulty.speed,
      fireTimer: 1.4 + Math.random() * 2.4,
      flash: 0,
      phase: Math.random() * Math.PI * 2,
      dead: false,
    });

    this.enemyId += 1;
    if (this.elapsed > 1) this.audio.spawn();
  }

  private damagePlayer(amount: number) {
    if (this.phase !== "playing") return;
    const scaled = amount * this.difficulty.damage;
    let remaining = scaled;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
    }
    if (remaining > 0) this.health -= remaining;
    this.lastDamageAt = this.elapsed;
    this.damagePulse += 1;
    this.shake = Math.max(this.shake, 0.72);
    this.audio.damage();
    if (this.health <= 0) {
      this.health = 0;
      this.shield = 0;
      this.finish(false);
      return;
    }
    this.emitHud();
  }

  private finish(complete: boolean) {
    if (this.phase !== "playing") return;
    this.phase = complete ? "complete" : "failed";
    this.triggerHeld = false;
    this.keys.clear();
    this.aiming = false;
    this.audio.end(complete);
    if (document.pointerLockElement) document.exitPointerLock();
    this.emitHud();
    this.callbacks.onEnd({
      score: this.score,
      kills: this.kills,
      headshots: this.headshots,
      shots: this.shots,
      hits: this.hits,
      accuracy: this.shots ? Math.round((this.hits / this.shots) * 100) : 0,
      timeSurvived: Math.round(this.elapsed),
      wave: this.wave,
      complete,
      difficulty: this.config.difficulty,
      weapon: this.activeWeapon,
    });
  }

  private addFeed(text: string, detail: string, kind: FeedItem["kind"]) {
    this.timedFeed.unshift({
      item: { id: this.eventId++, text, detail, kind },
      expires: performance.now() + 4500,
    });
    this.timedFeed = this.timedFeed.slice(0, 4);
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, tone: string) {
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(tone),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.tracers.push({ line, material, life: 0.075, maxLife: 0.075 });
  }

  private spawnBurst(position: THREE.Vector3, color: THREE.Color, count: number, power: number) {
    for (let i = 0; i < count; i++) {
      const life = 0.35 + Math.random() * 0.55;
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(0.035 + Math.random() * 0.065, 0), material);
      mesh.position.copy(position);
      this.scene.add(mesh);
      this.effects.push({
        mesh,
        material,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * power,
          Math.random() * power * 0.75,
          (Math.random() - 0.5) * power,
        ),
        life,
        maxLife: life,
        gravity: 7.5,
        expand: 0,
        spin: (Math.random() - 0.5) * 12,
      });
    }
    if (this.effects.length > 180) {
      const excess = this.effects.splice(0, this.effects.length - 180);
      excess.forEach((effect) => {
        this.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        effect.material.dispose();
      });
    }
  }

  private spawnShockwave(position: THREE.Vector3, color: THREE.Color, size: number) {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 6, 32), material);
    mesh.position.copy(position);
    mesh.rotation.x = Math.PI / 2;
    this.scene.add(mesh);
    this.effects.push({
      mesh,
      material,
      velocity: new THREE.Vector3(0, 0, 0),
      life: 0.48,
      maxLife: 0.48,
      gravity: 0,
      expand: size,
      spin: 0,
    });
  }

  private updatePlayer(dt: number) {
    const moveX =
      (this.keys.has("KeyD") ? 1 : 0) - (this.keys.has("KeyA") ? 1 : 0) + this.touchMove.x;
    const moveZ =
      (this.keys.has("KeyW") ? 1 : 0) - (this.keys.has("KeyS") ? 1 : 0) + this.touchMove.z;
    const input = new THREE.Vector3(moveX, 0, moveZ);
    if (input.lengthSq() > 1) input.normalize();

    const sprint = this.keys.has("ShiftLeft") && !this.aiming;
    let speed = this.aiming ? 3.3 : sprint ? 9.4 : 6.4;
    if (!this.grounded) speed *= 0.72;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    const desired = forward
      .multiplyScalar(input.z)
      .add(right.multiplyScalar(input.x))
      .multiplyScalar(speed);
    this.velocity.x = damp(this.velocity.x, desired.x, this.grounded ? 14 : 5, dt);
    this.velocity.z = damp(this.velocity.z, desired.z, this.grounded ? 14 : 5, dt);

    const nextX = this.player.x + this.velocity.x * dt;
    if (this.canStand(nextX, this.player.z)) this.player.x = nextX;
    else this.velocity.x = 0;

    const nextZ = this.player.z + this.velocity.z * dt;
    if (this.canStand(this.player.x, nextZ)) this.player.z = nextZ;
    else this.velocity.z = 0;

    this.verticalVelocity -= 16 * dt;
    this.player.y += this.verticalVelocity * dt;
    if (this.player.y <= 0) {
      this.player.y = 0;
      this.verticalVelocity = 0;
      this.grounded = true;
    }

    const planarSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (planarSpeed > 0.3 && this.grounded) this.walkPhase += dt * planarSpeed * 1.55;
    const bobAmount = this.aiming ? 0.006 : 0.026;
    const bob = Math.sin(this.walkPhase) * bobAmount * Math.min(1, planarSpeed / 5);

    this.shake = Math.max(0, this.shake - dt * 3.2);
    const shakeX = (Math.random() - 0.5) * this.shake * 0.055;
    const shakeY = (Math.random() - 0.5) * this.shake * 0.055;

    this.camera.position.set(this.player.x + shakeX, 1.72 + this.player.y + bob + shakeY, this.player.z);
    const strafeLean = (this.velocity.x * Math.cos(this.yaw) - this.velocity.z * Math.sin(this.yaw)) * 0.0018;
    this.camera.rotation.set(this.pitch, this.yaw, strafeLean);

    this.aimMix = damp(this.aimMix, this.aiming ? 1 : 0, 11, dt);
    const targetFov = this.aiming ? ADS_FOV[this.activeWeapon] : HIP_FOV;
    if (Math.abs(this.camera.fov - targetFov) > 0.02) {
      this.camera.fov = damp(this.camera.fov, targetFov, 13, dt);
      this.camera.updateProjectionMatrix();
    }

    if (this.shield < 50 && this.elapsed - this.lastDamageAt > 4.2) {
      this.shield = Math.min(50, this.shield + dt * 9);
    }
  }

  private canStand(x: number, z: number) {
    if (Math.abs(x) > 27.4 || Math.abs(z) > 27.4) return false;
    for (const collider of this.colliders) {
      if (
        x > collider.minX - 0.42 &&
        x < collider.maxX + 0.42 &&
        z > collider.minZ - 0.42 &&
        z < collider.maxZ + 0.42
      ) {
        return false;
      }
    }
    return true;
  }

  private updateViewmodel(dt: number) {
    const group = this.gunGroups[this.activeWeapon];
    if (!group) return;
    this.recoil = Math.max(0, this.recoil - dt * 6);
    this.flashTimer = Math.max(0, this.flashTimer - dt);
    const activeSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const sway = Math.sin(this.walkPhase * 0.5) * 0.008 * Math.min(1, activeSpeed / 6);
    const swayY = Math.cos(this.walkPhase) * 0.005 * Math.min(1, activeSpeed / 6);
    group.position.set(
      this.gunBase.x * (1 - this.aimMix * 0.9) + sway,
      this.gunBase.y * (1 - this.aimMix * 0.3) + swayY + this.aimMix * 0.04 - this.recoil * 0.008,
      this.gunBase.z + this.recoil * 0.06,
    );
    group.rotation.set(0.02 + this.recoil * 0.025, 0.045 * (1 - this.aimMix * 0.95), -0.03);
    const flash = this.gunFlashes[this.activeWeapon];
    if (flash) {
      flash.visible = this.flashTimer > 0;
      flash.scale.setScalar(0.7 + Math.random() * 0.7);
      flash.rotation.z += dt * 12;
    }
    const flashStar = this.gunFlashStars[this.activeWeapon];
    if (flashStar) {
      flashStar.visible = this.flashTimer > 0;
      flashStar.scale.set(0.8 + Math.random() * 0.5, 0.8 + Math.random() * 0.7, 0.8 + Math.random() * 0.5);
    }
  }

  private updateEnemies(dt: number) {
    for (const enemy of this.enemies) {
      if (enemy.dead) continue;
      const dx = this.player.x - enemy.group.position.x;
      const dz = this.player.z - enemy.group.position.z;
      const distance = Math.max(0.001, Math.hypot(dx, dz));
      const dirX = dx / distance;
      const dirZ = dz / distance;
      const preferred = enemy.heavy ? 9 : 7;
      const approach = distance > preferred + 2 ? 1 : distance < preferred - 2 ? -0.85 : 0;
      const strafe = Math.sin(this.elapsed * 0.8 + enemy.phase) * 0.6;
      const speed = enemy.speed * (1 + (this.wave - 1) * 0.04);
      enemy.group.position.x += (dirX * approach + -dirZ * strafe) * speed * dt;
      enemy.group.position.z += (dirZ * approach + dirX * strafe) * speed * dt;
      enemy.group.position.x = clamp(enemy.group.position.x, -26.5, 26.5);
      enemy.group.position.z = clamp(enemy.group.position.z, -26.5, 26.5);
      enemy.group.position.y =
        (enemy.heavy ? 2.35 : 1.8) + Math.sin(this.elapsed * 1.7 + enemy.phase) * 0.24;
      enemy.group.lookAt(this.player.x, enemy.group.position.y, this.player.z);
      enemy.body.rotation.y += dt * 0.9;
      enemy.rings[0].rotation.z += dt * 1.4;
      enemy.rings[1].rotation.x += dt * 1.15;

      if (enemy.flash > 0) {
        enemy.flash -= dt;
        enemy.bodyMaterial.emissive.setHex(0xff7448);
        enemy.bodyMaterial.emissiveIntensity = 2.3;
      } else {
        enemy.bodyMaterial.emissive.setHex(enemy.heavy ? 0x6f2a0a : 0x4a1c0a);
        enemy.bodyMaterial.emissiveIntensity = 1.9;
      }

      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0 && distance < 36) {
        enemy.fireTimer =
          (enemy.heavy ? 2.5 : 3.1 + Math.random() * 1.4) / this.difficulty.fireRate;
        this.fireProjectile(enemy);
      }
    }
  }

  private fireProjectile(enemy: Enemy) {
    const origin = enemy.group.position.clone();
    origin.y += 0.15;
    const target = this.camera.position.clone();
    target.x += (Math.random() - 0.5) * 1.5;
    target.y += (Math.random() - 0.5) * 1.1;
    target.z += (Math.random() - 0.5) * 1.5;
    const velocity = target.sub(origin).normalize().multiplyScalar(enemy.heavy ? 26 : 21);

    const damage = enemy.heavy ? 15 : 9;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(enemy.heavy ? 0.17 : 0.13, 10, 8),
      new THREE.MeshBasicMaterial({
        color: enemy.heavy ? 0xffb45a : 0xff6542,
        transparent: true,
        opacity: 0.98,
      }),
    );
    mesh.position.copy(origin);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, velocity, damage, life: 5 });
    if (Math.random() < 0.55) this.audio.hostileShot();
  }

  private updateProjectiles(dt: number) {
    const cameraPos = this.camera.position;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      projectile.mesh.position.addScaledVector(projectile.velocity, dt);
      projectile.life -= dt;
      if (projectile.mesh.position.distanceTo(cameraPos) < 0.82) {
        this.damagePlayer(projectile.damage);
        projectile.mesh.geometry.dispose();
        (projectile.mesh.material as THREE.Material).dispose();
        this.scene.remove(projectile.mesh);
        this.projectiles.splice(i, 1);
        continue;
      }
      if (
        projectile.life <= 0 ||
        projectile.mesh.position.y < 0.05 ||
        Math.abs(projectile.mesh.position.x) > 30 ||
        Math.abs(projectile.mesh.position.z) > 30
      ) {
        projectile.mesh.geometry.dispose();
        (projectile.mesh.material as THREE.Material).dispose();
        this.scene.remove(projectile.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private updateTracers(dt: number) {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tracer = this.tracers[i];
      tracer.life -= dt;
      tracer.material.opacity = Math.max(0, tracer.life / tracer.maxLife) * 0.9;
      if (tracer.life <= 0) {
        this.scene.remove(tracer.line);
        tracer.line.geometry.dispose();
        tracer.material.dispose();
        this.tracers.splice(i, 1);
      }
    }
  }

  private updateEffects(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.life -= dt;
      const progress = 1 - effect.life / effect.maxLife;
      effect.mesh.position.addScaledVector(effect.velocity, dt);
      effect.velocity.y -= effect.gravity * dt;
      effect.mesh.rotation.x += effect.spin * dt;
      effect.mesh.rotation.y += effect.spin * dt;
      if (effect.expand > 0) {
        const scale = 1 + progress * effect.expand;
        effect.mesh.scale.setScalar(scale);
      }
      effect.material.opacity = Math.max(0, 1 - progress) * 0.92;
      if (effect.life <= 0) {
        this.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        effect.material.dispose();
        this.effects.splice(i, 1);
      }
    }
  }

  private updateReload(dt: number) {
    if (!this.reloading) return;
    this.reloadTimer -= dt;
    if (this.reloadTimer > 0) return;
    const spec = WEAPONS[this.activeWeapon];
    const ammo = this.ammo[this.activeWeapon];
    const needed = spec.magSize - ammo.ammo;
    const taken = Math.min(needed, ammo.reserve);
    ammo.ammo += taken;
    ammo.reserve -= taken;
    this.reloading = false;
    this.reloadTimer = 0;
    this.audio.reload();
    this.emitHud();
  }

  private emitHud() {
    if (this.disposed) return;
    this.lastHudAt = performance.now();
    const spec = WEAPONS[this.activeWeapon];
    const ammo = this.ammo[this.activeWeapon];
    const blips: EnemyBlip[] = this.enemies.map((enemy) => ({
      id: enemy.id,
      x: enemy.group.position.x,
      z: enemy.group.position.z,
      heavy: enemy.heavy,
    }));
    const now = performance.now();
    const feed = this.timedFeed.filter((entry) => entry.expires > now).map((entry) => entry.item);
    const announcement = this.announcement && now < this.announceUntil ? this.announcement : null;

    this.callbacks.onHud({
      ...INITIAL_HUD,
      phase: this.phase,
      health: Math.max(0, Math.round(this.health)),
      shield: Math.max(0, Math.round(this.shield)),
      ammo: ammo.ammo,
      reserve: ammo.reserve,
      magSize: spec.magSize,
      weapon: this.activeWeapon,
      weapons: WEAPON_ORDER.map((id) => ({
        id,
        ammo: this.ammo[id].ammo,
        reserve: this.ammo[id].reserve,
      })),
      reloading: this.reloading,
      reloadProgress: this.reloading ? clamp(1 - this.reloadTimer / this.reloadDuration, 0, 1) : 0,
      aiming: this.aiming,
      score: this.score,
      kills: this.kills,
      headshots: this.headshots,
      shots: this.shots,
      hits: this.hits,
      accuracy: this.shots ? Math.round((this.hits / this.shots) * 100) : 0,
      timeLeft: Math.max(0, this.timeLeft),
      wave: this.wave,
      enemies: blips,
      countdown: Math.max(0, Math.ceil(this.countdown)),
      locked: this.locked,
      damagePulse: this.damagePulse,
      hitPulse: this.hitPulse,
      lastHitKill: this.lastHitKill,
      lastHitHead: this.lastHitHead,
      announcement,
      feed,
      player: { x: this.player.x, z: this.player.z, yaw: this.yaw },
    });
  }

  private loop = () => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.065);
    const now = performance.now();

    if (this.phase === "countdown") {
      this.countdown = Math.max(0, (this.countdownEndsAt - performance.now()) / 1000);
      this.camera.position.set(this.player.x, 1.72, this.player.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0);
      this.updateViewmodel(dt);
      this.updateEnemies(0);
      if (this.countdown <= 0) {
        this.phase = "playing";
        this.clock.getDelta();
        this.emitHud();
      }
    } else if (this.phase === "playing") {
      this.fireCooldown = Math.max(0, this.fireCooldown - dt);
      this.elapsed += dt;
      this.timeLeft = Math.max(0, ROUND_SECONDS - this.elapsed);
      const nextWave = Math.min(6, 1 + Math.floor(this.elapsed / 24));
      if (nextWave !== this.wave) {
        this.wave = nextWave;
        this.audio.spawn();
      }

      this.spawnTimer -= dt;
      const maxAlive = Math.min(10, this.difficulty.maxAlive + this.wave);
      if (this.spawnTimer <= 0 && this.enemies.length < maxAlive) {
        this.spawnEnemy();
        this.spawnTimer = (1.65 + Math.random() * 1.2) * this.difficulty.spawnRate;
      }

      this.updatePlayer(dt);
      this.updateViewmodel(dt);
      this.updateEnemies(dt);
      this.updateProjectiles(dt);
      this.updateReload(dt);
      this.updateEffects(dt);
      this.updateTracers(dt);

      if (this.triggerHeld && WEAPONS[this.activeWeapon].auto) this.tryFire();
      if (this.dust) this.dust.rotation.y += dt * 0.008;
      if (this.beacon) this.beacon.rotation.y += dt * 0.18;
      this.beaconRings.forEach((ring, index) => {
        ring.rotation.z += dt * (index % 2 === 0 ? 0.24 : -0.19);
        ring.rotation.x = Math.PI / 2 + Math.sin(this.elapsed * 0.6 + index) * 0.12;
      });

      if (this.timeLeft <= 0) this.finish(true);
    } else {
      this.updateViewmodel(dt);
    }

    if (now - this.lastHudAt > 100) this.emitHud();
    this.renderer.render(this.scene, this.camera);
  };

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    if (document.pointerLockElement === this.renderer?.domElement) {
      document.exitPointerLock();
    }
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("mouseup", this.onMouseUp);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("blur", this.onBlur);
    if (this.renderer) {
      const canvas = this.renderer.domElement;
      canvas.removeEventListener("mousedown", this.onCanvasMouseDown);
      canvas.removeEventListener("contextmenu", this.onContextMenu);
      canvas.removeEventListener("pointerdown", this.onTouchDown);
      canvas.removeEventListener("pointermove", this.onTouchMove);
      canvas.removeEventListener("pointerup", this.onTouchUp);
      canvas.removeEventListener("pointercancel", this.onTouchUp);
      canvas.remove();
      this.renderer.dispose();
    }
    this.projectiles.forEach((projectile) => {
      projectile.mesh.geometry.dispose();
      (projectile.mesh.material as THREE.Material).dispose();
    });
    this.tracers.forEach((tracer) => {
      tracer.line.geometry.dispose();
      tracer.material.dispose();
    });
    this.effects.forEach((effect) => {
      effect.mesh.geometry.dispose();
      effect.material.dispose();
    });
    this.glowTexture.dispose();
    this.scene?.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points) {
        object.geometry?.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((item) => item.dispose());
        else material?.dispose();
      }
    });
  }
}
