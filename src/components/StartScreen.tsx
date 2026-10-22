import { useEffect, useState } from "react";
import {
  DIFFICULTIES,
  TARGET_SCORE,
  WEAPONS,
  WEAPON_ORDER,
} from "../game/config";
import type { DifficultyId, WeaponId } from "../game/config";
import {
  ArrowIcon,
  BookIcon,
  BrandMark,
  ChevronIcon,
  CloseIcon,
  CrosshairIcon,
  LockIcon,
  MouseIcon,
  PlayIcon,
  ShieldIcon,
  SkullIcon,
  SoundIcon,
  TimerIcon,
  TrophyIcon,
  WeaponGlyph,
} from "./Icons";

export interface CareerStats {
  bestScore: number;
  runs: number;
  kills: number;
  accuracy: number;
  bestWave: number;
}

interface StartScreenProps {
  difficulty: DifficultyId;
  weapon: WeaponId;
  muted: boolean;
  stats: CareerStats;
  onDifficulty: (difficulty: DifficultyId) => void;
  onWeapon: (weapon: WeaponId) => void;
  onToggleMute: () => void;
  onDeploy: () => void;
}

type ManualTab = "BRIEFING" | "CONTROLS" | "ARSENAL";

const formatNumber = (value: number) => value.toLocaleString("en-US");

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between font-mono text-[9px] font-medium tracking-[0.18em] text-mist/70">
      <span>{children}</span>
      {right}
    </div>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return <span className="keycap">{children}</span>;
}

function SectorMap() {
  return (
    <div className="relative overflow-hidden border border-bone/12 bg-[#070d09]">
      <div className="pointer-events-none absolute inset-0 grid-tight opacity-60" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-2.5 py-1.5 font-mono text-[7px] tracking-[0.18em] text-mist/60">
        <span>SECTOR 07 // TOPO</span>
        <span className="flex items-center gap-1 text-acid">
          <span className="h-1 w-1 rounded-full bg-acid" /> LINKED
        </span>
      </div>
      <svg viewBox="0 0 340 116" className="relative h-[88px] w-full sm:h-[98px]" aria-hidden="true">
        <g stroke="rgba(215,255,63,0.15)" strokeWidth="0.6" fill="none">
          <path d="M0 38h340M0 67h340M0 96h340M52 0v116M124 0v116M196 0v116M268 0v116" />
          <rect x="12" y="13" width="316" height="92" />
        </g>
        <g stroke="rgba(206,225,199,0.3)" strokeWidth="1" fill="rgba(206,225,199,0.04)">
          <rect x="35" y="28" width="42" height="18" />
          <rect x="102" y="48" width="52" height="24" />
          <rect x="201" y="23" width="38" height="28" />
          <rect x="254" y="62" width="48" height="18" />
          <rect x="61" y="76" width="25" height="21" />
          <rect x="173" y="80" width="34" height="15" />
          <rect x="284" y="24" width="20" height="22" />
        </g>
        <g stroke="rgba(255,91,58,0.55)" strokeWidth="0.8" fill="none">
          <circle cx="87" cy="70" r="4" />
          <circle cx="238" cy="47" r="4" />
          <circle cx="288" cy="89" r="4" />
        </g>
        <g fill="#ff5b3a">
          <circle cx="87" cy="70" r="1.4" />
          <circle cx="238" cy="47" r="1.4" />
          <circle cx="288" cy="89" r="1.4" />
        </g>
        <g stroke="rgba(215,255,63,0.8)" strokeWidth="1.1" fill="none" strokeDasharray="3 3">
          <path d="M170 102 144 82l18-27 36-12 26 22-13 24-41 13Z" opacity="0.8" />
        </g>
        <g transform="translate(170 102)">
          <path d="M0 -7 5 6 0 3 -5 6Z" fill="#d7ff3f" />
          <circle r="11" stroke="rgba(215,255,63,0.25)" fill="none" />
        </g>
        <text x="13" y="109" fill="rgba(236,239,226,0.36)" fontSize="5" fontFamily="monospace" letterSpacing="1">
          DROP POINT A-07
        </text>
        <text x="282" y="20" fill="rgba(236,239,226,0.3)" fontSize="5" fontFamily="monospace">
          GRID 4C
        </text>
      </svg>
      <div className="pointer-events-none absolute bottom-1.5 right-2 font-mono text-[7px] tracking-widest text-mist/40">
        ZONE: LIVE FIRE
      </div>
    </div>
  );
}

function MissionCard({
  difficulty,
  weapon,
  stats,
  onDifficulty,
  onWeapon,
}: Pick<StartScreenProps, "difficulty" | "weapon" | "stats" | "onDifficulty" | "onWeapon">) {
  const difficultySpec = DIFFICULTIES[difficulty];

  return (
    <div className="clip-panel relative w-full border border-bone/15 bg-[#080f0b]/90 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 grid-fine opacity-30" />
      <div className="relative flex items-center justify-between border-b border-bone/12 px-4 py-3">
        <div className="flex items-center gap-2 font-mono text-[9px] font-semibold tracking-[0.18em] text-bone/80">
          <span className="h-1.5 w-1.5 bg-acid" />
          MATCH CONFIG
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px] tracking-[0.18em] text-mist/55">
          SOLO / SIM
          <span className="text-acid">07</span>
        </div>
      </div>

      <div className="relative space-y-4 p-4">
        <div>
          <SectionLabel right={<span className="text-acid/80">READY</span>}>ARENA / DRIFT YARD</SectionLabel>
          <SectorMap />
        </div>

        <div>
          <SectionLabel right={<span>{difficultySpec.code}</span>}>THREAT PROFILE</SectionLabel>
          <div className="grid grid-cols-3 gap-1.5">
            {Object.values(DIFFICULTIES).map((option) => {
              const active = option.id === difficulty;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onDifficulty(option.id)}
                  className={`group relative overflow-hidden border px-1.5 py-2 text-left transition-all duration-200 ${
                    active
                      ? "border-acid bg-acid text-void"
                      : "border-bone/12 bg-bone/[0.025] text-mist hover:border-bone/35 hover:text-bone"
                  }`}
                  aria-pressed={active}
                >
                  <span className="block font-mono text-[8px] font-semibold tracking-[0.13em]">
                    {option.code} / {option.label}
                  </span>
                  <span className={`mt-0.5 block h-0.5 w-full ${active ? "bg-void/25" : "bg-bone/10"}`}>
                    <span
                      className={`block h-full ${active ? "bg-void/60" : "bg-acid/60"}`}
                      style={{ width: `${[38, 68, 100][option.code === "01" ? 0 : option.code === "02" ? 1 : 2]}%` }}
                    />
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 hidden font-mono text-[8px] leading-relaxed tracking-wide text-mist/55 sm:block">
            {difficultySpec.description}
          </p>
        </div>

        <div>
          <SectionLabel
            right={<span className="text-acid/80">LOADOUT</span>}
          >
            PRIMARY WEAPON
          </SectionLabel>
          <div className="space-y-1">
            {WEAPON_ORDER.map((id) => {
              const spec = WEAPONS[id];
              const active = id === weapon;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onWeapon(id)}
                  className={`flex w-full items-center gap-2.5 border-l-2 px-2.5 py-1.5 text-left transition-all duration-200 ${
                    active
                      ? "border-acid bg-acid/[0.09]"
                      : "border-bone/10 bg-transparent hover:border-bone/35 hover:bg-bone/[0.035]"
                  }`}
                  aria-pressed={active}
                >
                  <span
                    className={`font-mono text-[9px] ${active ? "text-acid" : "text-mist/45"}`}
                  >
                    {spec.slot}
                  </span>
                  <WeaponGlyph
                    kind={id}
                    className={`h-6 w-12 shrink-0 ${active ? "text-acid" : "text-mist/55"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-[11px] font-semibold tracking-wide ${active ? "text-bone" : "text-bone/70"}`}>
                      {spec.short}
                    </span>
                    <span className="block font-mono text-[7px] tracking-[0.12em] text-mist/45">
                      {spec.class}
                    </span>
                  </span>
                  <span className="hidden w-12 shrink-0 sm:block">
                    <span className="stat-bar">
                      <span style={{ width: `${spec.stats.damage}%` }} />
                    </span>
                  </span>
                  <ChevronIcon className={`h-3 w-3 ${active ? "text-acid" : "text-mist/25"}`} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-bone/10 border-y border-bone/10 py-2">
          <div className="pr-3">
            <div className="font-mono text-[7px] tracking-[0.16em] text-mist/45">TARGET SCORE</div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="font-display text-xl font-semibold leading-none text-bone">
                {formatNumber(TARGET_SCORE)}
              </span>
              <span className="font-mono text-[8px] text-mist/45">PTS</span>
            </div>
          </div>
          <div className="pl-3">
            <div className="font-mono text-[7px] tracking-[0.16em] text-mist/45">HOSTILE LOAD</div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="font-display text-xl font-semibold leading-none text-rust">
                {difficulty === "RECRUIT" ? "MED" : difficulty === "VETERAN" ? "HIGH" : "SEVERE"}
              </span>
              <SkullIcon className="h-3 w-3 text-rust/70" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-bone/12 bg-bone/[0.025] px-4 py-2.5">
        <div className="flex items-center gap-2 font-mono text-[8px] tracking-[0.12em] text-mist/60">
          <TrophyIcon className="h-3.5 w-3.5 text-acid/70" />
          BEST <span className="text-bone">{formatNumber(stats.bestScore)}</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono text-[8px] tracking-[0.12em] text-acid/90">
          <span className="h-1 w-1 rounded-full bg-acid anim-pulse-dot" />
          SYSTEMS NOMINAL
        </div>
      </div>
      <div className="h-[3px] bg-bone/5">
        <div className="h-full w-[72%] bg-gradient-to-r from-acid/20 via-acid to-acid/20" />
      </div>
      <div className="pointer-events-none absolute right-0 top-14 h-16 w-px bg-gradient-to-b from-acid/50 to-transparent" />
    </div>
  );
}

function ManualModal({
  tab,
  onTab,
  onClose,
}: {
  tab: ManualTab;
  onTab: (tab: ManualTab) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md anim-fade-in"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        className="clip-panel relative max-h-[88vh] w-full max-w-3xl overflow-hidden border border-bone/20 bg-[#0a100c] shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Field manual"
      >
        <div className="flex items-center justify-between border-b border-bone/12 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center border border-acid/30 bg-acid/10">
              <BookIcon className="h-4 w-4 text-acid" />
            </div>
            <div>
              <div className="font-mono text-[9px] tracking-[0.2em] text-acid/80">OPERATOR HANDBOOK</div>
              <div className="font-display text-xl font-semibold uppercase leading-none">Field Manual</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center border border-bone/15 text-mist transition hover:border-bone/40 hover:text-bone"
            aria-label="Close field manual"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-0 border-b border-bone/10 px-5">
          {(["BRIEFING", "CONTROLS", "ARSENAL"] as ManualTab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onTab(item)}
              className={`relative px-4 py-3 font-mono text-[9px] tracking-[0.16em] transition ${
                tab === item ? "text-acid" : "text-mist/60 hover:text-bone"
              }`}
            >
              {item}
              {tab === item && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-acid" />}
            </button>
          ))}
        </div>

        <div className="max-h-[58vh] overflow-y-auto px-5 py-5">
          {tab === "BRIEFING" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="border border-bone/10 bg-bone/[0.025] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[8px] text-acid">01 / DROP</span>
                  <CrosshairIcon className="h-4 w-4 text-acid/70" />
                </div>
                <div className="font-display text-lg font-semibold uppercase">Enter the null</div>
                <p className="mt-1 text-[11px] leading-relaxed text-mist">
                  Deploy into Sector 07. You have 120 seconds to rack up score and stay breathing.
                </p>
              </div>
              <div className="border border-bone/10 bg-bone/[0.025] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[8px] text-acid">02 / HUNT</span>
                  <RadarGlyph />
                </div>
                <div className="font-display text-lg font-semibold uppercase">Break the signal</div>
                <p className="mt-1 text-[11px] leading-relaxed text-mist">
                  Sentinels spawn in waves. Watch the proximity radar; nothing is behind you forever.
                </p>
              </div>
              <div className="border border-bone/10 bg-bone/[0.025] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[8px] text-acid">03 / SCORE</span>
                  <TrophyIcon className="h-4 w-4 text-acid/70" />
                </div>
                <div className="font-display text-lg font-semibold uppercase">Aim for the core</div>
                <p className="mt-1 text-[11px] leading-relaxed text-mist">
                  Headshots pay a bonus. Reach {formatNumber(TARGET_SCORE)} points to call the run a success.
                </p>
              </div>
              <div className="sm:col-span-3 border border-acid/20 bg-acid/[0.055] p-4">
                <div className="flex items-start gap-3">
                  <ShieldIcon className="mt-0.5 h-5 w-5 shrink-0 text-acid" />
                  <div>
                    <div className="font-mono text-[9px] tracking-[0.16em] text-acid">RULES OF ENGAGEMENT</div>
                    <p className="mt-1 text-[11px] leading-relaxed text-bone/75">
                      Your shield recharges when you break contact. Kills top up health and reserve ammunition.
                      The clock does not stop. Movement is your best armor.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "CONTROLS" && (
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {[
                { keys: ["W", "A", "S", "D"], label: "MOVE", note: "Stay mobile" },
                { keys: ["SPACE"], label: "JUMP", note: "Break a sightline" },
                { keys: ["SHIFT"], label: "SPRINT", note: "No aim penalty" },
                { keys: ["LMB"], label: "FIRE", note: "Hold for automatic" },
                { keys: ["RMB"], label: "AIM DOWN SIGHTS", note: "Tighter spread" },
                { keys: ["R"], label: "RELOAD", note: "Auto-reload on empty" },
                { keys: ["1", "2", "3"], label: "SWITCH WEAPON", note: "Pulse / Breach / Rail" },
                { keys: ["ESC"], label: "PAUSE", note: "Releases mouse" },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3 border-b border-bone/8 py-2">
                  <div className="flex w-24 shrink-0 flex-wrap gap-1">
                    {row.keys.map((key) => (
                      <Key key={key}>{key}</Key>
                    ))}
                  </div>
                  <div>
                    <div className="font-mono text-[9px] tracking-[0.12em] text-bone/85">{row.label}</div>
                    <div className="font-mono text-[8px] text-mist/45">{row.note}</div>
                  </div>
                </div>
              ))}
              <div className="sm:col-span-2 flex items-center gap-3 border border-bone/10 bg-bone/[0.02] p-3">
                <MouseIcon className="h-5 w-5 text-acid/70" />
                <p className="font-mono text-[9px] tracking-wide text-mist/65">
                  DESKTOP RECOMMENDED. CLICK THE VIEWPORT TO CAPTURE YOUR MOUSE. ESC RELEASES IT.
                </p>
              </div>
            </div>
          )}

          {tab === "ARSENAL" && (
            <div className="grid gap-3">
              {WEAPON_ORDER.map((id) => {
                const spec = WEAPONS[id];
                return (
                  <div key={id} className="flex flex-col gap-3 border border-bone/10 bg-bone/[0.025] p-4 sm:flex-row sm:items-center">
                    <div className="flex w-32 items-center gap-3">
                      <span className="font-mono text-[9px] text-acid">{spec.slot}</span>
                      <WeaponGlyph kind={id} className="h-7 w-20 text-acid/80" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-display text-lg font-semibold uppercase leading-none">{spec.name}</span>
                        <span className="font-mono text-[8px] tracking-[0.14em] text-acid/70">{spec.class}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-mist/70">{spec.description}</p>
                    </div>
                    <div className="grid w-full grid-cols-4 gap-2 sm:w-44">
                      {Object.entries(spec.stats).map(([label, value]) => (
                        <div key={label}>
                          <div className="mb-1 font-mono text-[7px] uppercase tracking-wider text-mist/45">{label.slice(0, 4)}</div>
                          <div className="stat-bar">
                            <span style={{ width: `${value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-bone/12 bg-bone/[0.025] px-5 py-3">
          <span className="font-mono text-[8px] tracking-[0.14em] text-mist/45">NULLPOINT FIELD MANUAL / REV 2.7</span>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[9px] tracking-[0.14em] text-acid transition hover:text-bone"
          >
            RETURN TO SIMULATION →
          </button>
        </div>
      </div>
    </div>
  );
}

function RadarGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 text-acid/70" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" opacity="0.5" />
      <path d="M12 3.5V12l6 3" />
    </svg>
  );
}

export default function StartScreen({
  difficulty,
  weapon,
  muted,
  stats,
  onDifficulty,
  onWeapon,
  onToggleMute,
  onDeploy,
}: StartScreenProps) {
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTab, setManualTab] = useState<ManualTab>("BRIEFING");
  const difficultySpec = DIFFICULTIES[difficulty];
  const weaponSpec = WEAPONS[weapon];

  const openManual = (tab: ManualTab) => {
    setManualTab(tab);
    setManualOpen(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-void lg:h-screen">
      <div className="absolute inset-0 overflow-hidden">
        <div className="menu-photo absolute inset-0" />
        <div className="menu-scrim absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 grid-fine opacity-45" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_64%_50%,transparent_0%,rgba(5,8,6,0.16)_38%,rgba(5,8,6,0.7)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-acid/40 to-transparent" />
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-void via-void/75 to-transparent" />
        <div className="pointer-events-none absolute -right-24 top-1/4 hidden h-[540px] w-[540px] rounded-full border border-acid/10 xl:block" />
        <div className="pointer-events-none absolute -right-12 top-1/3 hidden h-[340px] w-[340px] rounded-full border border-bone/5 xl:block" />
      </div>

      <header className="relative z-20 flex h-[68px] shrink-0 items-center justify-between border-b border-bone/10 px-5 backdrop-blur-[2px] sm:px-8 xl:px-12">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 items-center justify-center border border-acid/40 bg-acid/[0.07]">
            <BrandMark className="h-[23px] w-[23px] text-acid" />
            <span className="absolute -right-1 -top-1 h-1.5 w-1.5 bg-acid" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-[22px] font-bold uppercase leading-none tracking-[0.04em]">
                Nullpoint
              </span>
              <span className="font-mono text-[9px] font-semibold text-acid">/SIM</span>
            </div>
            <div className="mt-1 hidden font-mono text-[7px] tracking-[0.24em] text-mist/50 sm:block">
              TACTICAL COMBAT ENVIRONMENT
            </div>
          </div>
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 lg:flex">
          {[
            { label: "SIMULATION", action: () => window.scrollTo({ top: 0, behavior: "smooth" }), active: true },
            { label: "ARMORY", action: () => openManual("ARSENAL"), active: false },
            { label: "FIELD MANUAL", action: () => openManual("BRIEFING"), active: false },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={item.action}
              className={`group relative py-2 font-mono text-[9px] font-medium tracking-[0.17em] transition ${
                item.active ? "text-bone" : "text-mist/60 hover:text-bone"
              }`}
            >
              {item.label}
              <span
                className={`absolute inset-x-0 -bottom-[13px] h-px transition ${
                  item.active ? "bg-acid" : "bg-transparent group-hover:bg-bone/30"
                }`}
              />
              {item.active && (
                <span className="absolute -bottom-[17px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 bg-acid" />
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 border border-bone/12 bg-bone/[0.025] px-3 py-1.5 md:flex">
            <span className="h-1 w-1 rounded-full bg-acid anim-pulse-dot" />
            <span className="font-mono text-[8px] tracking-[0.13em] text-mist/70">SECTOR 07 / ONLINE</span>
          </div>
          <button
            type="button"
            onClick={onToggleMute}
            className="flex h-8 w-8 items-center justify-center border border-bone/12 text-mist transition hover:border-acid/50 hover:text-acid"
            aria-label={muted ? "Unmute audio" : "Mute audio"}
          >
            <SoundIcon muted={muted} className="h-4 w-4" />
          </button>
          <span className="hidden font-mono text-[8px] tracking-[0.12em] text-mist/35 xl:block">v2.7.04</span>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-[1640px] flex-1 items-center gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12 lg:px-12 lg:py-6 xl:grid-cols-[minmax(0,1fr)_430px] xl:gap-20 xl:px-16">
        <section className="max-w-[760px] anim-fade-up">
          <div className="mb-4 flex flex-wrap items-center gap-3 sm:mb-5">
            <span className="clip-tag flex items-center gap-2 bg-acid px-2.5 py-1 font-mono text-[8px] font-bold tracking-[0.14em] text-void">
              <span className="h-1 w-1 bg-void" /> ACCESS GRANTED
            </span>
            <span className="font-mono text-[9px] tracking-[0.18em] text-bone/55">
              SEASON 04 <span className="mx-1 text-bone/25">/</span> SIGNAL HUNT
            </span>
          </div>

          <div className="mb-3 flex items-center gap-3 sm:mb-4">
            <span className="h-px w-8 bg-acid/80 sm:w-12" />
            <span className="font-mono text-[9px] font-medium tracking-[0.22em] text-acid/90 sm:text-[10px]">
              SECTOR 07 — DRIFT YARD
            </span>
          </div>

          <h1 className="font-display text-[clamp(4.1rem,8.7vw,9rem)] font-extrabold uppercase leading-[0.76] tracking-[-0.02em]">
            <span className="block text-bone">Enter the</span>
            <span className="relative block">
              <span className="text-acid">Null</span>
              <span className="anim-blink text-acid">_</span>
              <span className="ml-4 hidden align-super font-mono text-[9px] font-normal leading-relaxed tracking-[0.18em] text-mist/50 sm:inline-block">
                SIMULATION
                <br />
                PROTOCOL 07
              </span>
            </span>
          </h1>

          <p className="mt-5 max-w-[500px] text-[13px] leading-relaxed text-bone/65 sm:mt-6 sm:text-[14px]">
            The arena is live. Rogue sentinels are broadcasting from Sector 07 and command wants the
            signal silenced. Drop in, stack headshots, and extract before the clock burns out.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[8px] tracking-[0.16em] text-mist/55 sm:text-[9px]">
            <span className="flex items-center gap-1.5">
              <TimerIcon className="h-3.5 w-3.5 text-acid/70" /> 120 SEC
            </span>
            <span className="h-3 w-px bg-bone/15" />
            <span className="flex items-center gap-1.5">
              <SkullIcon className="h-3.5 w-3.5 text-rust/70" /> {difficultySpec.label} THREAT
            </span>
            <span className="h-3 w-px bg-bone/15" />
            <span className="flex items-center gap-1.5">
              <ShieldIcon className="h-3.5 w-3.5 text-bone/40" /> NO RESPAWN
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:items-stretch sm:mt-7">
            <button
              type="button"
              onClick={onDeploy}
              className="clip-btn group relative flex h-[60px] items-center gap-4 bg-acid px-5 text-void shadow-[0_0_0_0_rgba(215,255,63,0)] transition-all duration-300 hover:bg-[#e4ff7a] hover:shadow-[0_10px_50px_-12px_rgba(215,255,63,0.7)] sm:min-w-[272px]"
            >
              <CrosshairIcon className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left">
                <span className="block font-display text-[22px] font-bold uppercase leading-none tracking-wide">
                  Initiate Drop
                </span>
                <span className="mt-1 block font-mono text-[8px] font-semibold tracking-[0.18em] text-void/60">
                  {weaponSpec.short} / {difficultySpec.label}
                </span>
              </span>
              <span className="flex h-7 w-7 items-center justify-center border-l border-void/20 pl-3">
                <ArrowIcon className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </button>
            <button
              type="button"
              onClick={() => openManual("BRIEFING")}
              className="group flex h-[60px] items-center gap-3 border border-bone/18 bg-bone/[0.035] px-5 backdrop-blur-sm transition-colors hover:border-bone/40 hover:bg-bone/[0.06]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-bone/25 transition group-hover:border-acid/60 group-hover:text-acid">
                <PlayIcon className="ml-0.5 h-3.5 w-3.5" />
              </span>
              <span className="text-left">
                <span className="block font-mono text-[9px] font-semibold tracking-[0.16em]">FIELD MANUAL</span>
                <span className="mt-1 block font-mono text-[8px] tracking-[0.08em] text-mist/50">BRIEF / CONTROLS</span>
              </span>
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-bone/8 pt-3.5">
            <div className="flex items-center gap-1">
              <Key>W</Key>
              <Key>A</Key>
              <Key>S</Key>
              <Key>D</Key>
            </div>
            <span className="font-mono text-[8px] tracking-[0.12em] text-mist/45">MOVE</span>
            <span className="h-3 w-px bg-bone/12" />
            <div className="flex items-center gap-1.5">
              <MouseIcon className="h-3.5 w-3.5 text-bone/45" />
              <span className="font-mono text-[8px] tracking-[0.12em] text-mist/45">AIM / FIRE</span>
            </div>
            <span className="hidden font-mono text-[8px] tracking-[0.1em] text-bone/25 sm:inline">
              MOUSE + KEYBOARD RECOMMENDED
            </span>
          </div>
        </section>

        <aside className="mx-auto w-full max-w-[430px] anim-fade-up lg:mx-0" style={{ animationDelay: "120ms" }}>
          <div className="mb-2.5 flex items-center justify-between px-0.5 font-mono text-[8px] tracking-[0.16em] text-mist/45">
            <span>OPERATOR INTERFACE</span>
            <span className="flex items-center gap-2">
              <LockIcon className="h-3 w-3" /> ENCRYPTED
            </span>
          </div>
          <MissionCard
            difficulty={difficulty}
            weapon={weapon}
            stats={stats}
            onDifficulty={onDifficulty}
            onWeapon={onWeapon}
          />
          <div className="mt-3 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center border border-bone/15 bg-bone/[0.03] font-mono text-[9px] text-mist">
                G7
              </div>
              <div>
                <div className="font-mono text-[8px] tracking-[0.14em] text-bone/70">OPERATOR // GHOST-07</div>
                <div className="font-mono text-[7px] tracking-[0.1em] text-mist/40">
                  {stats.runs} DROPS · {formatNumber(stats.kills)} KILLS
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openManual("CONTROLS")}
              className="group flex items-center gap-1.5 font-mono text-[8px] tracking-[0.12em] text-acid/75 transition hover:text-acid"
            >
              CONTROLS
              <ChevronIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </aside>
      </main>

      <footer className="relative z-10 hidden h-[52px] shrink-0 items-center justify-between border-t border-bone/10 bg-[#050906]/65 px-8 backdrop-blur-md md:flex xl:px-12">
        <div className="flex items-center gap-4">
          <span className="font-mono text-[8px] tracking-[0.18em] text-mist/35">BEST RUN</span>
          <span className="font-display text-lg font-semibold leading-none tracking-wide">
            {formatNumber(stats.bestScore)}
          </span>
          <span className="h-3 w-px bg-bone/12" />
          <span className="font-mono text-[8px] tracking-[0.18em] text-mist/35">
            AVG ACC <span className="text-bone/70">{stats.accuracy}%</span>
          </span>
        </div>
        <div className="hidden items-center gap-6 font-mono text-[8px] tracking-[0.14em] text-mist/35 lg:flex">
          <span className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-acid/80" /> ARENA ONLINE
          </span>
          <span>BUILD 2.7.04</span>
          <span className="text-bone/20">/</span>
          <span>NULLPOINT SYSTEMS © 2094</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[8px] tracking-[0.12em] text-bone/50">
          <span className="h-1.5 w-1.5 bg-acid anim-pulse-dot" />
          READY TO DEPLOY
        </div>
      </footer>

      {manualOpen && (
        <ManualModal
          tab={manualTab}
          onTab={setManualTab}
          onClose={() => setManualOpen(false)}
        />
      )}
    </div>
  );
}
