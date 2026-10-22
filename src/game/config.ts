export type DifficultyId = "RECRUIT" | "VETERAN" | "NIGHTMARE";
export type WeaponId = "pulse" | "scatter" | "rail";
export type Phase = "countdown" | "playing" | "paused" | "failed" | "complete";

export interface DifficultySpec {
  id: DifficultyId;
  label: string;
  code: string;
  tagline: string;
  description: string;
  damage: number;
  speed: number;
  health: number;
  fireRate: number;
  spawnRate: number;
  maxAlive: number;
  scoreMultiplier: number;
  accent: string;
}

export const DIFFICULTIES: Record<DifficultyId, DifficultySpec> = {
  RECRUIT: {
    id: "RECRUIT",
    label: "RECRUIT",
    code: "01",
    tagline: "LEARN THE ARENA",
    description: "Slower hostiles. Forgiving damage. Built for a first drop.",
    damage: 0.62,
    speed: 0.82,
    health: 0.8,
    fireRate: 0.72,
    spawnRate: 1.28,
    maxAlive: 2,
    scoreMultiplier: 0.85,
    accent: "#a8b6a6",
  },
  VETERAN: {
    id: "VETERAN",
    label: "VETERAN",
    code: "02",
    tagline: "THE STANDARD DROP",
    description: "A balanced hunt. Read the room, keep moving, land headshots.",
    damage: 1,
    speed: 1,
    health: 1,
    fireRate: 1,
    spawnRate: 1,
    maxAlive: 3,
    scoreMultiplier: 1,
    accent: "#d7ff3f",
  },
  NIGHTMARE: {
    id: "NIGHTMARE",
    label: "NIGHTMARE",
    code: "03",
    tagline: "NO SAFE ANGLE",
    description: "Aggressive sentinels, higher damage. Extraction is not guaranteed.",
    damage: 1.4,
    speed: 1.22,
    health: 1.15,
    fireRate: 1.38,
    spawnRate: 0.78,
    maxAlive: 4,
    scoreMultiplier: 1.3,
    accent: "#ff5b3a",
  },
};

export interface WeaponSpec {
  id: WeaponId;
  slot: string;
  name: string;
  short: string;
  class: string;
  role: string;
  description: string;
  damage: number;
  headMultiplier: number;
  fireInterval: number;
  auto: boolean;
  pellets: number;
  spread: number;
  reloadTime: number;
  magSize: number;
  reserve: number;
  recoil: number;
  range: number;
  tone: string;
  stats: { damage: number; rate: number; range: number; control: number };
}

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  pulse: {
    id: "pulse",
    slot: "1",
    name: "VX-9 PULSE",
    short: "PULSE CARBINE",
    class: "PRIMARY / AUTO",
    role: "All-round automatic",
    description: "A stable automatic carbine. Reliable at every range.",
    damage: 19,
    headMultiplier: 2.05,
    fireInterval: 0.1,
    auto: true,
    pellets: 1,
    spread: 0.0095,
    reloadTime: 1.35,
    magSize: 30,
    reserve: 240,
    recoil: 0.42,
    range: 120,
    tone: "#d7ff3f",
    stats: { damage: 58, rate: 82, range: 74, control: 86 },
  },
  scatter: {
    id: "scatter",
    slot: "2",
    name: "BR-12 BREACH",
    short: "SCATTER CANNON",
    class: "CLOSE / BURST",
    role: "Close-range shredder",
    description: "Eight-pellet burst. Deletes anything inside the wire.",
    damage: 12.5,
    headMultiplier: 1.45,
    fireInterval: 0.72,
    auto: false,
    pellets: 8,
    spread: 0.062,
    reloadTime: 1.9,
    magSize: 7,
    reserve: 49,
    recoil: 1.5,
    range: 34,
    tone: "#ffb03a",
    stats: { damage: 92, rate: 34, range: 26, control: 54 },
  },
  rail: {
    id: "rail",
    slot: "3",
    name: "MK.IV RAIL",
    short: "RAIL DRIVER",
    class: "PRECISION / CHARGE",
    role: "One-shot marksman",
    description: "A charged kinetic spike. Punishing, surgical, loud.",
    damage: 115,
    headMultiplier: 2.35,
    fireInterval: 1.18,
    auto: false,
    pellets: 1,
    spread: 0.0018,
    reloadTime: 2.25,
    magSize: 5,
    reserve: 25,
    recoil: 1.9,
    range: 180,
    tone: "#64e8ff",
    stats: { damage: 100, rate: 22, range: 100, control: 63 },
  },
};

export const WEAPON_ORDER: WeaponId[] = ["pulse", "scatter", "rail"];

export interface RunConfig {
  difficulty: DifficultyId;
  weapon: WeaponId;
  muted: boolean;
}

export interface FeedItem {
  id: number;
  text: string;
  detail: string;
  kind: "kill" | "headshot" | "danger" | "system";
}

export interface EnemyBlip {
  id: number;
  x: number;
  z: number;
  heavy: boolean;
}

export interface Announcement {
  id: number;
  title: string;
  subtitle: string;
  tone: "lime" | "danger";
}

export interface HudWeapon {
  id: WeaponId;
  ammo: number;
  reserve: number;
}

export interface HudState {
  phase: Phase;
  health: number;
  shield: number;
  maxShield: number;
  ammo: number;
  reserve: number;
  magSize: number;
  weapon: WeaponId;
  weapons: HudWeapon[];
  reloading: boolean;
  reloadProgress: number;
  aiming: boolean;
  score: number;
  kills: number;
  headshots: number;
  shots: number;
  hits: number;
  accuracy: number;
  timeLeft: number;
  wave: number;
  enemies: EnemyBlip[];
  countdown: number;
  locked: boolean;
  damagePulse: number;
  hitPulse: number;
  lastHitKill: boolean;
  lastHitHead: boolean;
  announcement: Announcement | null;
  feed: FeedItem[];
  player: { x: number; z: number; yaw: number };
}

export interface RunResult {
  score: number;
  kills: number;
  headshots: number;
  shots: number;
  hits: number;
  accuracy: number;
  timeSurvived: number;
  wave: number;
  complete: boolean;
  difficulty: DifficultyId;
  weapon: WeaponId;
}

export const TARGET_SCORE = 2500;
export const ROUND_SECONDS = 120;

export const INITIAL_HUD: HudState = {
  phase: "countdown",
  health: 100,
  shield: 50,
  maxShield: 50,
  ammo: 30,
  reserve: 240,
  magSize: 30,
  weapon: "pulse",
  weapons: WEAPON_ORDER.map((id) => ({ id, ammo: WEAPONS[id].magSize, reserve: WEAPONS[id].reserve })),
  reloading: false,
  reloadProgress: 0,
  aiming: false,
  score: 0,
  kills: 0,
  headshots: 0,
  shots: 0,
  hits: 0,
  accuracy: 0,
  timeLeft: ROUND_SECONDS,
  wave: 1,
  enemies: [],
  countdown: 3,
  locked: false,
  damagePulse: 0,
  hitPulse: 0,
  lastHitKill: false,
  lastHitHead: false,
  announcement: null,
  feed: [],
  player: { x: 0, z: 18, yaw: 0 },
};
