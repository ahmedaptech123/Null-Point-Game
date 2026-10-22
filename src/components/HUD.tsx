import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { TARGET_SCORE, WEAPONS, WEAPON_ORDER } from "../game/config";
import type { HudState } from "../game/config";
import type { GameEngine } from "../game/engine";
import {
  BrandMark,
  CrosshairIcon,
  HeartIcon,
  MouseIcon,
  PauseIcon,
  RadarIcon,
  ShieldIcon,
  SkullIcon,
  SoundIcon,
  TimerIcon,
  WeaponGlyph,
} from "./Icons";

interface HudProps {
  hud: HudState;
  muted: boolean;
  isTouch: boolean;
  engineRef: RefObject<GameEngine | null>;
  onPause: () => void;
  onToggleMute: () => void;
}

const formatTime = (seconds: number) => {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)
    .toString()
    .padStart(2, "0")}:${(safe % 60).toString().padStart(2, "0")}`;
};

const formatScore = (score: number) => score.toLocaleString("en-US");

function MiniMap({ hud }: { hud: HudState }) {
  const scale = 1.32;
  const cos = Math.cos(hud.player.yaw);
  const sin = Math.sin(hud.player.yaw);
  const blips = hud.enemies.map((enemy) => {
    const dx = enemy.x - hud.player.x;
    const dz = enemy.z - hud.player.z;
    const rx = dx * cos - dz * sin;
    const fy = dx * -sin - dz * cos;
    let x = rx * scale;
    let y = -fy * scale;
    const length = Math.hypot(x, y);
    const max = 44;
    if (length > max) {
      x = (x / length) * max;
      y = (y / length) * max;
    }
    return { ...enemy, left: 50 + x, top: 50 + y, distance: Math.hypot(dx, dz) };
  });

  return (
    <div className="hud-panel clip-corner w-[158px] border-bone/12 p-2 sm:w-[186px]">
      <div className="mb-1.5 flex items-center justify-between border-b border-bone/10 pb-1">
        <span className="flex items-center gap-1 font-mono text-[7px] font-semibold tracking-[0.16em] text-bone/65">
          <RadarIcon className="h-3 w-3 text-acid/70" />
          PROXIMITY
        </span>
        <span className="flex items-center gap-1 font-mono text-[7px] tracking-wider text-rust/80">
          <span className="h-1 w-1 rounded-full bg-rust" />
          {hud.enemies.length.toString().padStart(2, "0")}
        </span>
      </div>
      <div className="relative aspect-[1.5/1] overflow-hidden border border-bone/8 bg-[#060c08]">
        <div className="absolute inset-0 grid-tight opacity-60" />
        <div className="radar-sweep opacity-50" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[76%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-acid/20" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[36%] w-[36%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-acid/12" />
        <div className="absolute left-1/2 top-1.5 h-1 w-px -translate-x-1/2 bg-acid/40" />
        <div className="absolute bottom-1.5 left-1/2 font-mono text-[6px] tracking-widest text-acid/50">N</div>
        {blips.map((blip) => (
          <div
            key={blip.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full border ${
              blip.heavy
                ? "h-2.5 w-2.5 border-rust bg-rust/70"
                : "h-1.5 w-1.5 border-rust bg-rust"
            } ${blip.distance < 12 ? "anim-pulse-dot" : ""}`}
            style={{ left: `${blip.left}%`, top: `${blip.top}%` }}
          >
            {blip.heavy && <span className="absolute inset-[-3px] rounded-full border border-rust/30" />}
          </div>
        ))}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-0 w-0 border-l-[3px] border-r-[3px] border-b-[7px] border-l-transparent border-r-transparent border-b-acid" />
        </div>
      </div>
      <div className="mt-1 flex items-center justify-between font-mono text-[6px] tracking-[0.1em] text-mist/40">
        <span>ZONE 07</span>
        <span className="text-bone/45">SCALE 1:{Math.round(1 / scale * 10) * 10}</span>
      </div>
    </div>
  );
}

function HitMarker({ hud }: { hud: HudState }) {
  const [marker, setMarker] = useState<{ id: number; kill: boolean; head: boolean } | null>(null);
  const previous = useRef(0);

  useEffect(() => {
    if (hud.hitPulse > 0 && hud.hitPulse !== previous.current) {
      previous.current = hud.hitPulse;
      setMarker({ id: hud.hitPulse, kill: hud.lastHitKill, head: hud.lastHitHead });
      const timeout = window.setTimeout(() => setMarker(null), 260);
      return () => window.clearTimeout(timeout);
    }
  }, [hud.hitPulse, hud.lastHitKill, hud.lastHitHead]);

  if (!marker) return null;
  const color = marker.kill ? "#ff5b3a" : marker.head ? "#d7ff3f" : "#f2f4e9";
  return (
    <div key={marker.id} className="anim-hit pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2">
      {[
        "left-0 top-0",
        "right-0 top-0 rotate-90",
        "right-0 bottom-0 rotate-180",
        "left-0 bottom-0 -rotate-90",
      ].map((position) => (
        <span key={position} className={`absolute ${position} h-2.5 w-2.5`}>
          <span className="absolute left-0 top-0 h-[1.5px] w-full origin-left" style={{ background: color, transform: "rotate(45deg)" }} />
        </span>
      ))}
      {marker.kill && (
        <span className="absolute left-1/2 top-[130%] -translate-x-1/2 whitespace-nowrap font-mono text-[7px] font-bold tracking-[0.18em]" style={{ color }}>
          ELIMINATED
        </span>
      )}
    </div>
  );
}

function DamageOverlay({ hud }: { hud: HudState }) {
  const [show, setShow] = useState(false);
  const previous = useRef(0);

  useEffect(() => {
    if (hud.damagePulse > 0 && hud.damagePulse !== previous.current) {
      previous.current = hud.damagePulse;
      setShow(true);
      const timeout = window.setTimeout(() => setShow(false), 420);
      return () => window.clearTimeout(timeout);
    }
  }, [hud.damagePulse]);

  const low = hud.health <= 34;
  return (
    <>
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ${
          show ? "opacity-100" : "opacity-0"
        }`}
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 38%, rgba(255,45,20,0.24) 78%, rgba(225,30,12,0.58) 100%)",
        }}
      />
      {low && (
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at center, transparent 52%, rgba(255,45,20,0.2) 100%)",
          }}
        />
      )}
    </>
  );
}

function Keystroke({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center border border-bone/25 bg-bone/[0.06] px-1 font-mono text-[8px] text-bone/75">
      {children}
    </span>
  );
}

function TouchControls({ engineRef }: { engineRef: RefObject<GameEngine | null> }) {
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [aiming, setAiming] = useState(false);
  const padRef = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const inputRef = useRef<GameEngine | null>(null);
  inputRef.current = engineRef.current;

  const update = (clientX: number, clientY: number) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const radius = rect.width / 2 - 12;
    const distance = Math.hypot(dx, dy);
    const clamped = Math.min(distance, radius);
    const nx = distance ? (dx / distance) * clamped : 0;
    const ny = distance ? (dy / distance) * clamped : 0;
    setStick({ x: nx, y: ny });
    inputRef.current?.setTouchMove(nx / radius, -ny / radius);
  };

  const release = () => {
    active.current = false;
    setStick({ x: 0, y: 0 });
    inputRef.current?.setTouchMove(0, 0);
  };

  useEffect(() => {
    return () => {
      engineRef.current?.setTouchMove(0, 0);
      engineRef.current?.setTouchFire(false);
    };
  }, [engineRef]);

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <div
        ref={padRef}
        className="pointer-events-auto absolute bottom-[122px] left-5 flex h-[104px] w-[104px] touch-none items-center justify-center rounded-full border border-bone/20 bg-black/25 backdrop-blur-sm"
        onPointerDown={(event) => {
          active.current = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          update(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (active.current) update(event.clientX, event.clientY);
        }}
        onPointerUp={release}
        onPointerCancel={release}
        onPointerLeave={release}
        aria-label="Movement joystick"
      >
        <div className="absolute inset-2 rounded-full border border-bone/10" />
        <div className="absolute h-px w-7 bg-bone/15" />
        <div className="absolute h-7 w-px bg-bone/15" />
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full border border-acid/50 bg-acid/15"
          style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }}
        >
          <CrosshairIcon className="h-4 w-4 text-acid/70" />
        </div>
        <span className="absolute -bottom-4 font-mono text-[7px] tracking-[0.16em] text-bone/35">MOVE</span>
      </div>

      <div className="pointer-events-auto absolute bottom-[124px] right-5 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !aiming;
              setAiming(next);
              inputRef.current?.setTouchAim(next);
            }}
            className={`flex h-10 w-10 items-center justify-center rounded-full border font-mono text-[8px] font-bold ${
              aiming ? "border-acid bg-acid text-void" : "border-bone/30 bg-black/35 text-bone/80"
            }`}
            aria-label="Aim down sights"
          >
            ADS
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.nextWeapon()}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-bone/30 bg-black/35 text-bone/80"
            aria-label="Switch weapon"
          >
            <WeaponGlyph kind="pulse" className="h-3.5 w-7" />
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.reload()}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-bone/30 bg-black/35 font-mono text-[9px] font-bold text-bone/80"
            aria-label="Reload"
          >
            RLD
          </button>
        </div>
        <button
          type="button"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            inputRef.current?.setTouchFire(true);
          }}
          onPointerUp={() => inputRef.current?.setTouchFire(false)}
          onPointerCancel={() => inputRef.current?.setTouchFire(false)}
          onPointerLeave={() => inputRef.current?.setTouchFire(false)}
          className="flex h-[78px] w-[78px] touch-none items-center justify-center rounded-full border-2 border-acid bg-acid/90 text-void shadow-[0_0_28px_rgba(215,255,63,0.25)] active:scale-95 active:bg-bone"
          aria-label="Fire weapon"
        >
          <CrosshairIcon className="h-8 w-8" />
        </button>
      </div>
    </div>
  );
}

export default function HUD({
  hud,
  muted,
  isTouch,
  engineRef,
  onPause,
  onToggleMute,
}: HudProps) {
  const spec = WEAPONS[hud.weapon];
  const lowHealth = hud.health <= 34;
  const healthSegments = 10;
  const filledHealth = Math.ceil((hud.health / 100) * healthSegments);
  const filledShield = Math.ceil((hud.shield / 50) * 6);
  const missionProgress = Math.min(100, (hud.score / TARGET_SCORE) * 100);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none font-sans">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-void/85 via-void/30 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-void/95 via-void/45 to-transparent" />
      <DamageOverlay hud={hud} />

      {/* identity */}
      <div className="absolute left-2.5 top-2.5 flex items-center gap-2 sm:left-5 sm:top-4 sm:gap-3">
        <div className="hud-panel flex items-center gap-1.5 border-bone/15 px-1.5 py-1.5 sm:gap-2 sm:px-2.5 sm:py-2">
          <div className="flex h-7 w-7 items-center justify-center border border-acid/30 bg-acid/10 sm:h-8 sm:w-8">
            <BrandMark className="h-4 w-4 text-acid sm:h-[18px] sm:w-[18px]" />
          </div>
          <div className="hidden lg:block">
            <div className="flex items-center gap-1.5 font-mono text-[7px] font-semibold tracking-[0.16em] text-acid/90">
              <span className="h-1 w-1 bg-acid anim-pulse-dot" /> LIVE SIM
            </div>
            <div className="font-display text-[15px] font-semibold uppercase leading-tight tracking-[0.08em] text-bone">
              Signal Hunt
            </div>
          </div>
          <div className="ml-1 hidden flex-col gap-0.5 border-l border-bone/12 pl-2 lg:flex">
            <span className="font-mono text-[6px] tracking-widest text-mist/40">WAVE</span>
            <span className="font-display text-[15px] font-semibold leading-none text-bone">
              {hud.wave.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
        <div className="hud-panel flex border-bone/12">
          <button
            type="button"
            onClick={onPause}
            className="pointer-events-auto flex h-8 w-7 items-center justify-center border-r border-bone/10 text-bone/65 transition hover:bg-bone/8 hover:text-acid sm:h-10 sm:w-9"
            aria-label="Pause simulation"
          >
            <PauseIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onToggleMute}
            className="pointer-events-auto flex h-8 w-7 items-center justify-center text-bone/65 transition hover:bg-bone/8 hover:text-acid sm:h-10 sm:w-9"
            aria-label={muted ? "Unmute game audio" : "Mute game audio"}
          >
            <SoundIcon muted={muted} className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* score + timer */}
      <div className="absolute left-1/2 top-[52px] w-[228px] -translate-x-1/2 sm:top-4 sm:w-[248px] lg:w-[310px]">
        <div className="hud-panel clip-corner border-bone/15 px-2.5 py-1.5 sm:px-4 sm:py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[6px] tracking-[0.18em] text-mist/45 sm:text-[7px]">SCORE</div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-lg font-semibold leading-none tracking-wider text-bone sm:text-xl lg:text-2xl">
                  {formatScore(hud.score)}
                </span>
                <span className="hidden font-mono text-[7px] text-mist/35 lg:inline">/ {formatScore(TARGET_SCORE)}</span>
              </div>
            </div>
            <div className="h-6 w-px bg-bone/12 sm:h-8" />
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 font-mono text-[6px] tracking-[0.16em] text-mist/45 sm:text-[7px]">
                <TimerIcon className="h-2.5 w-2.5" /> CLOCK
              </div>
              <div
                className={`font-mono text-[15px] font-semibold leading-none tracking-tight sm:text-lg lg:text-xl ${
                  hud.timeLeft <= 20 ? "text-rust" : "text-bone"
                }`}
              >
                {formatTime(hud.timeLeft)}
              </div>
            </div>
            <div className="hidden h-6 w-px bg-bone/12 sm:block lg:h-8" />
            <div className="hidden min-w-0 flex-1 text-right lg:block">
              <div className="font-mono text-[7px] tracking-[0.18em] text-mist/45">SECTOR</div>
              <div className="font-display text-2xl font-semibold leading-none text-acid">07</div>
            </div>
          </div>
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="h-[3px] flex-1 overflow-hidden bg-bone/10">
              <div className="h-full bg-gradient-to-r from-acid-dim to-acid transition-[width] duration-500" style={{ width: `${missionProgress}%` }} />
            </div>
            <span className="font-mono text-[6px] tracking-wider text-mist/35">
              {Math.round(missionProgress)}%
            </span>
          </div>
        </div>
      </div>

      {/* radar and feed */}
      <div className="absolute right-2.5 top-2.5 hidden flex-col items-end gap-1.5 md:flex sm:right-5 sm:top-4">
        <MiniMap hud={hud} />
        <div className="flex w-[158px] flex-col gap-1 sm:w-[186px]">
          {hud.feed.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className={`anim-fade-in flex items-center gap-1.5 border-l px-1.5 py-1 backdrop-blur-sm ${
                item.kind === "danger" || item.kind === "headshot"
                  ? "border-rust bg-rust/10"
                  : item.kind === "kill"
                    ? "border-acid bg-acid/8"
                    : "border-bone/30 bg-void/40"
              }`}
            >
              {item.kind === "headshot" ? (
                <SkullIcon className="h-2.5 w-2.5 shrink-0 text-rust" />
              ) : item.kind === "kill" ? (
                <CrosshairIcon className="h-2.5 w-2.5 shrink-0 text-acid" />
              ) : (
                <span className="h-1 w-1 shrink-0 bg-bone/40" />
              )}
              <div className="min-w-0">
                <div className="truncate font-mono text-[6px] font-semibold tracking-[0.1em] text-bone/85">
                  {item.text}
                </div>
                <div className="truncate font-mono text-[6px] text-mist/40">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 border border-bone/15 bg-void/60 px-2 py-1.5 backdrop-blur-sm md:hidden">
        <RadarIcon className="h-3 w-3 text-acid/70" />
        <span className="font-mono text-[7px] tracking-[0.12em] text-bone/60">HOSTILES</span>
        <span className="font-mono text-[8px] font-bold text-rust">{hud.enemies.length.toString().padStart(2, "0")}</span>
      </div>

      {/* vitals */}
      <div className="absolute bottom-2.5 left-2.5 sm:bottom-5 sm:left-5">
        <div className="hud-panel clip-panel w-[150px] border-bone/15 p-2 sm:w-[232px] sm:p-3.5">
          <div className="mb-1.5 flex items-center justify-between sm:mb-2">
            <span className="font-mono text-[7px] font-medium tracking-[0.15em] text-mist/50">OPERATOR VITALS</span>
            <span className="font-mono text-[6px] tracking-wider text-mist/30">GHOST-07</span>
          </div>
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-1.5">
              <HeartIcon className={`h-3.5 w-3.5 ${lowHealth ? "text-rust" : "text-acid"}`} />
              <span className={`font-display text-[28px] font-semibold leading-[0.8] tracking-wide sm:text-[42px] ${lowHealth ? "text-rust" : "text-bone"}`}>
                {hud.health}
              </span>
              <span className="mb-0.5 font-mono text-[7px] text-mist/35">/100</span>
            </div>
            <div className={`mb-1 font-mono text-[7px] tracking-[0.12em] ${lowHealth ? "text-rust anim-blink" : "text-acid/70"}`}>
              {lowHealth ? "CRITICAL" : hud.health < 70 ? "WOUNDED" : "STABLE"}
            </div>
          </div>
          <div className="mt-2 flex gap-[2px]">
            {Array.from({ length: healthSegments }).map((_, index) => (
              <span
                key={index}
                className={`h-[5px] flex-1 ${
                  index < filledHealth ? (lowHealth ? "bg-rust" : "bg-acid") : "bg-bone/10"
                }`}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="flex items-center gap-1 font-mono text-[7px] tracking-[0.12em] text-mist/45">
              <ShieldIcon className={`h-3 w-3 ${hud.shield > 0 ? "text-[#8dd9cf]" : "text-mist/30"}`} />
              SHIELD
            </span>
            <span className="font-mono text-[8px] text-bone/60">{Math.round(hud.shield)}</span>
          </div>
          <div className="mt-1 flex gap-[2px]">
            {Array.from({ length: 6 }).map((_, index) => (
              <span
                key={index}
                className={`h-[3px] flex-1 ${index < filledShield ? "bg-[#8dd9cf]" : "bg-bone/10"}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* weapon / ammo */}
      <div className="absolute bottom-2.5 right-2.5 sm:bottom-5 sm:right-5">
        <div className="hud-panel clip-panel w-[178px] border-bone/15 p-2 sm:w-[280px] sm:p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-mono text-[6px] tracking-[0.16em] text-mist/40">{spec.class}</div>
              <div className="truncate font-display text-[13px] font-semibold uppercase tracking-[0.05em] text-bone sm:text-lg">
                {spec.name}
              </div>
            </div>
            <WeaponGlyph kind={hud.weapon} className="h-5 w-11 shrink-0 text-acid/80 sm:h-6 sm:w-14" />
          </div>
          <div className="mt-1 flex items-end justify-between border-t border-bone/10 pt-1">
            <div className="flex items-baseline gap-1">
              <span
                className={`font-display text-[34px] font-semibold leading-[0.78] tracking-wide sm:text-[48px] ${
                  hud.ammo === 0 ? "text-rust" : "text-bone"
                }`}
                style={{ color: hud.ammo === 0 ? undefined : spec.tone }}
              >
                {hud.ammo.toString().padStart(2, "0")}
              </span>
              <span className="font-mono text-[10px] text-mist/40">/ {hud.reserve}</span>
            </div>
            <div className="mb-1 flex flex-col items-end gap-1">
              {hud.reloading ? (
                <span className="font-mono text-[8px] tracking-[0.14em] text-acid anim-blink">RELOADING</span>
              ) : hud.ammo === 0 ? (
                <span className="font-mono text-[8px] tracking-[0.14em] text-rust">PRESS R</span>
              ) : (
                <span className="font-mono text-[7px] tracking-[0.12em] text-mist/35">KINETIC / READY</span>
              )}
              <span className="font-mono text-[7px] tracking-wider text-mist/30">{hud.accuracy}% ACC</span>
            </div>
          </div>
          <div className="mt-1.5 h-[3px] overflow-hidden bg-bone/10">
            <div
              className={`h-full ${hud.reloading ? "bg-acid" : "bg-bone/45"}`}
              style={{ width: `${hud.reloading ? hud.reloadProgress * 100 : (hud.ammo / hud.magSize) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-1">
            {WEAPON_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => engineRef.current?.switchWeapon(id)}
                className={`pointer-events-auto flex min-w-0 flex-1 items-center gap-1 border px-1 py-1 transition ${
                  id === hud.weapon
                    ? "border-acid/50 bg-acid/12"
                    : "border-bone/10 bg-bone/[0.025] hover:border-bone/25"
                }`}
                aria-label={`Switch to ${WEAPONS[id].short}`}
              >
                <span className={`font-mono text-[7px] ${id === hud.weapon ? "text-acid" : "text-mist/35"}`}>
                  {WEAPONS[id].slot}
                </span>
                <span className={`hidden truncate font-mono text-[6px] tracking-wider sm:block ${id === hud.weapon ? "text-bone/80" : "text-mist/40"}`}>
                  {WEAPONS[id].short.split(" ")[0]}
                </span>
                <span className={`ml-auto font-mono text-[6px] ${id === hud.weapon ? "text-acid/70" : "text-mist/25"}`}>
                  {hud.weapons.find((entry) => entry.id === id)?.ammo ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* crosshair */}
      {hud.phase === "playing" && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className={`relative transition-transform duration-200 anim-reticle ${hud.aiming ? "scale-75" : ""}`}>
            <div className="reticle-line left-1/2 top-0 h-2 w-px -translate-x-1/2 opacity-90" />
            <div className="reticle-line bottom-0 left-1/2 h-2 w-px -translate-x-1/2 opacity-90" />
            <div className="reticle-line left-0 top-1/2 h-px w-2 -translate-y-1/2 opacity-90" />
            <div className="reticle-line right-0 top-1/2 h-px w-2 -translate-y-1/2 opacity-90" />
            <div className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-acid shadow-[0_0_5px_rgba(215,255,63,0.8)]" />
            {hud.aiming && (
              <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-acid/35" />
            )}
          </div>
          <HitMarker hud={hud} />
        </div>
      )}

      {/* controls hint */}
      {!isTouch && hud.phase === "playing" && (
        <div className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 items-center gap-2.5 font-mono text-[7px] tracking-[0.1em] text-bone/45 lg:flex">
          <Keystroke>R</Keystroke> RELOAD
          <span className="text-bone/15">/</span>
          <Keystroke>RMB</Keystroke> AIM
          <span className="text-bone/15">/</span>
          <Keystroke>1</Keystroke>
          <Keystroke>2</Keystroke>
          <Keystroke>3</Keystroke> ARSENAL
          <span className="text-bone/15">/</span>
          <Keystroke>ESC</Keystroke> PAUSE
        </div>
      )}

      {isTouch && hud.phase === "playing" && <TouchControls engineRef={engineRef} />}

      {/* announcements */}
      {hud.announcement && hud.phase === "playing" && (
        <div
          key={hud.announcement.id}
          className="anim-announce absolute left-1/2 top-[19%] w-[min(90vw,560px)] -translate-x-1/2 text-center"
        >
          <div className="mb-1 flex items-center justify-center gap-2">
            <span className={`h-px w-12 ${hud.announcement.tone === "danger" ? "bg-rust/70" : "bg-acid/70"}`} />
            <span className={`font-mono text-[7px] font-semibold tracking-[0.26em] ${hud.announcement.tone === "danger" ? "text-rust" : "text-acid"}`}>
              INCOMING TRANSMISSION
            </span>
            <span className={`h-px w-12 ${hud.announcement.tone === "danger" ? "bg-rust/70" : "bg-acid/70"}`} />
          </div>
          <div className="font-display text-[clamp(2rem,5vw,3.5rem)] font-bold uppercase leading-none tracking-[0.04em] text-bone drop-shadow-[0_3px_20px_rgba(0,0,0,0.8)]">
            {hud.announcement.title}
          </div>
          <div className={`mt-1 font-mono text-[8px] tracking-[0.18em] ${hud.announcement.tone === "danger" ? "text-rust/80" : "text-acid/70"}`}>
            {hud.announcement.subtitle}
          </div>
        </div>
      )}

      {/* countdown */}
      {hud.phase === "countdown" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-void/25">
          <div className="mb-4 flex items-center gap-2 font-mono text-[9px] tracking-[0.24em] text-acid/85">
            <span className="h-1 w-1 bg-acid anim-pulse-dot" />
            LINK ESTABLISHED / STANDBY
          </div>
          <div key={hud.countdown} className="anim-countdown font-display text-[clamp(6rem,17vw,13rem)] font-bold leading-none text-bone drop-shadow-[0_0_50px_rgba(215,255,63,0.28)]">
            {hud.countdown > 0 ? hud.countdown : "GO"}
          </div>
          <div className="mt-2 font-display text-2xl font-semibold uppercase tracking-[0.2em] text-bone/85">
            Deploy to Sector 07
          </div>
          <div className="mt-1.5 text-center font-mono text-[8px] tracking-[0.15em] text-mist/70">
            SENTINEL SIGNALS DETECTED · STAND BY FOR WEAPONS FREE
          </div>
          {!isTouch && (
            <div className="mt-3 font-mono text-[7px] tracking-[0.16em] text-bone/40">
              ESC PAUSES THE SIMULATION ANY TIME
            </div>
          )}
          {!isTouch && !hud.locked && (
            <button
              type="button"
              onClick={() => engineRef.current?.requestMouse()}
              className="pointer-events-auto mt-6 flex items-center gap-2 border border-acid/45 bg-acid/10 px-4 py-2.5 font-mono text-[9px] font-semibold tracking-[0.16em] text-acid backdrop-blur transition hover:bg-acid hover:text-void"
            >
              <MouseIcon className="h-3.5 w-3.5" />
              CLICK TO LINK MOUSE
            </button>
          )}
        </div>
      )}

      {hud.phase === "playing" && !hud.locked && !isTouch && (
        <button
          type="button"
          onClick={() => engineRef.current?.requestMouse()}
          className="pointer-events-auto absolute bottom-[142px] left-1/2 flex -translate-x-1/2 items-center gap-2 border border-acid/40 bg-void/75 px-3 py-2 font-mono text-[8px] tracking-[0.14em] text-acid backdrop-blur transition hover:bg-acid hover:text-void sm:bottom-24"
        >
          <MouseIcon className="h-3.5 w-3.5" />
          CLICK TO CAPTURE MOUSE
        </button>
      )}

      {/* corner brackets */}
      <div className="pointer-events-none absolute left-2 top-2 h-3 w-3 border-l border-t border-acid/30 sm:left-3 sm:top-3" />
      <div className="pointer-events-none absolute right-2 top-2 h-3 w-3 border-r border-t border-acid/30 sm:right-3 sm:top-3" />
      <div className="pointer-events-none absolute bottom-2 left-2 h-3 w-3 border-b border-l border-acid/30 sm:bottom-3 sm:left-3" />
      <div className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 border-b border-r border-acid/30 sm:bottom-3 sm:right-3" />
    </div>
  );
}
