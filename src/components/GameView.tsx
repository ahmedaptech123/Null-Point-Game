import { useEffect, useRef, useState } from "react";
import {
  DIFFICULTIES,
  INITIAL_HUD,
  ROUND_SECONDS,
  TARGET_SCORE,
  WEAPONS,
  WEAPON_ORDER,
} from "../game/config";
import type { HudState, RunConfig, RunResult } from "../game/config";
import { GameEngine } from "../game/engine";
import HUD from "./HUD";
import {
  ArrowIcon,
  BrandMark,
  CrosshairIcon,
  PauseIcon,
  PlayIcon,
  ShieldIcon,
  SkullIcon,
  SoundIcon,
  TimerIcon,
  TrophyIcon,
  WeaponGlyph,
} from "./Icons";

interface GameViewProps {
  config: RunConfig;
  bestScore: number;
  muted: boolean;
  onToggleMute: () => void;
  onExit: () => void;
  onRunEnd: (result: RunResult) => void;
}

const createInitialHud = (weapon: RunConfig["weapon"]): HudState => ({
  ...INITIAL_HUD,
  weapon,
  ammo: WEAPONS[weapon].magSize,
  reserve: WEAPONS[weapon].reserve,
  weapons: WEAPON_ORDER.map((id) => ({
    id,
    ammo: WEAPONS[id].magSize,
    reserve: WEAPONS[id].reserve,
  })),
});

function ResultOverlay({
  result,
  newBest,
  onRedeploy,
  onExit,
}: {
  result: RunResult;
  newBest: boolean;
  onRedeploy: () => void;
  onExit: () => void;
}) {
  const success = result.score >= TARGET_SCORE || (result.complete && result.score > 1200);
  const rank =
    result.score >= 4800 ? "S" : result.score >= TARGET_SCORE ? "A" : result.score >= 1400 ? "B" : "C";
  const weapon = WEAPONS[result.weapon];
  const difficulty = DIFFICULTIES[result.difficulty];

  const stats = [
    { label: "SENTINELS DOWN", value: result.kills.toString().padStart(2, "0"), icon: <SkullIcon className="h-3.5 w-3.5" /> },
    { label: "ACCURACY", value: `${result.accuracy}%`, icon: <CrosshairIcon className="h-3.5 w-3.5" /> },
    { label: "HEADSHOTS", value: result.headshots.toString().padStart(2, "0"), icon: <CrosshairIcon className="h-3.5 w-3.5" /> },
    { label: "TIME SURVIVED", value: `${result.timeSurvived}s`, icon: <TimerIcon className="h-3.5 w-3.5" /> },
    { label: "WAVE REACHED", value: result.wave.toString().padStart(2, "0"), icon: <ShieldIcon className="h-3.5 w-3.5" /> },
    { label: "SHOTS FIRED", value: result.shots.toString(), icon: <WeaponGlyph kind={result.weapon} className="h-3 w-7" /> },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-void/78 p-4 backdrop-blur-md anim-fade-in">
      <div className="pointer-events-none absolute inset-0 grid-fine opacity-30" />
      <div className="clip-panel relative my-auto w-full max-w-[860px] border border-bone/18 bg-[#080e0a]/96 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95)]">
        <div className="absolute right-0 top-0 h-px w-40 bg-acid/60" />
        <div className="flex items-center justify-between border-b border-bone/12 px-5 py-3 sm:px-7">
          <div className="flex items-center gap-2.5">
            <BrandMark className="h-5 w-5 text-acid" />
            <span className="font-display text-base font-semibold uppercase tracking-[0.08em]">
              Nullpoint <span className="font-mono text-[8px] font-normal text-mist/40">// AFTER ACTION</span>
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[8px] tracking-[0.16em] text-mist/50">
            <span className={`h-1.5 w-1.5 ${success ? "bg-acid" : "bg-rust"} anim-pulse-dot`} />
            {result.complete ? "ROUND ENDED" : "OPERATOR DOWN"}
          </div>
        </div>

        <div className="relative grid gap-0 sm:grid-cols-[1fr_220px]">
          <div className="p-5 sm:p-7">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`clip-tag px-2 py-1 font-mono text-[8px] font-bold tracking-[0.14em] ${success ? "bg-acid text-void" : "bg-rust text-void"}`}>
                {result.complete ? "EXTRACTION COMPLETE" : "SIGNAL LOST"}
              </span>
              <span className="border border-bone/15 px-2 py-1 font-mono text-[8px] tracking-[0.12em] text-mist/60">
                {difficulty.label} // {weapon.short}
              </span>
              {newBest && (
                <span className="flex items-center gap-1 border border-acid/30 bg-acid/10 px-2 py-1 font-mono text-[8px] font-semibold tracking-[0.12em] text-acid">
                  <TrophyIcon className="h-3 w-3" /> NEW BEST
                </span>
              )}
            </div>
            <h2 className="font-display text-[clamp(2.7rem,7vw,4.6rem)] font-bold uppercase leading-[0.82]">
              {success ? (
                <>
                  Signal
                  <br />
                  <span className="text-acid">Silenced</span>
                </>
              ) : (
                <>
                  Contact
                  <br />
                  <span className="text-rust">Lost</span>
                </>
              )}
            </h2>
            <p className="mt-3 max-w-[430px] text-[12px] leading-relaxed text-mist/70">
              {success
                ? "Command confirms the transmission has flatlined. The arena is quiet, for now. Your combat record has been logged."
                : "Operator vitals flatlined before extraction. Telemetry is intact. Review the run and redeploy when ready."}
            </p>

            <div className="mt-5 flex items-end gap-3 border-y border-bone/10 py-4">
              <div>
                <div className="font-mono text-[8px] tracking-[0.16em] text-mist/40">FINAL SCORE</div>
                <div className="font-display text-[clamp(2.8rem,6vw,4.2rem)] font-bold leading-none tracking-wide text-bone">
                  {result.score.toLocaleString("en-US")}
                </div>
              </div>
              <div className="mb-1.5 flex-1">
                <div className="mb-1 flex items-center justify-between font-mono text-[7px] tracking-[0.12em] text-mist/35">
                  <span>TARGET {TARGET_SCORE.toLocaleString("en-US")}</span>
                  <span>{Math.min(100, Math.round((result.score / TARGET_SCORE) * 100))}%</span>
                </div>
                <div className="h-1 bg-bone/10">
                  <div
                    className={`h-full ${success ? "bg-acid" : "bg-rust"}`}
                    style={{ width: `${Math.min(100, (result.score / TARGET_SCORE) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-4">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <div className="flex items-center gap-1 font-mono text-[7px] tracking-[0.1em] text-mist/40">
                    {stat.icon}
                    <span className="truncate">{stat.label}</span>
                  </div>
                  <div className="mt-1 font-display text-2xl font-semibold leading-none text-bone/90">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex flex-col justify-between border-t border-bone/10 bg-bone/[0.025] p-5 sm:border-l sm:border-t-0 sm:p-6">
            <div className="pointer-events-none absolute inset-0 grid-fine opacity-20" />
            <div className="relative">
              <div className="font-mono text-[7px] tracking-[0.18em] text-mist/40">COMBAT RATING</div>
              <div className="relative mt-1 flex items-end">
                <span className={`font-display text-[7rem] font-bold leading-[0.74] ${success ? "text-acid" : "text-bone/70"}`}>
                  {rank}
                </span>
                <span className="absolute -right-1 bottom-2 font-mono text-[7px] tracking-[0.16em] text-mist/40">
                  RANK
                </span>
              </div>
              <div className="mt-3 h-px w-full bg-bone/10" />
              <div className="mt-3 space-y-2 font-mono text-[8px] tracking-[0.1em]">
                <div className="flex justify-between gap-2 text-mist/45">
                  <span>BEST SCORE</span>
                  <span className="text-bone/75">{Math.max(result.score, 0).toLocaleString("en-US")}</span>
                </div>
                <div className="flex justify-between gap-2 text-mist/45">
                  <span>HEADSHOT RATE</span>
                  <span className="text-bone/75">
                    {result.kills ? Math.round((result.headshots / result.kills) * 100) : 0}%
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-mist/45">
                  <span>FIELD TIME</span>
                  <span className="text-bone/75">{Math.round((result.timeSurvived / ROUND_SECONDS) * 100)}%</span>
                </div>
              </div>
            </div>
            <div className="relative mt-6 space-y-2">
              <button
                type="button"
                onClick={onRedeploy}
                className="clip-btn group flex w-full items-center justify-between bg-acid px-3 py-3 text-void transition hover:bg-[#e4ff7a]"
              >
                <span className="flex items-center gap-2">
                  <PlayIcon className="h-3.5 w-3.5" />
                  <span className="font-display text-base font-bold uppercase tracking-wide">Redeploy</span>
                </span>
                <ArrowIcon className="h-4 w-4 transition group-hover:translate-x-1" />
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex w-full items-center justify-center gap-2 border border-bone/18 px-3 py-2.5 font-mono text-[8px] tracking-[0.14em] text-bone/70 transition hover:border-bone/40 hover:text-bone"
              >
                RETURN TO BASE
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-bone/10 px-5 py-2 font-mono text-[7px] tracking-[0.12em] text-mist/30 sm:px-7">
          <span>TELEMETRY LOGGED / NULLPOINT OPS</span>
          <span>SECTOR 07 / DEBRIEF CLOSED</span>
        </div>
      </div>
    </div>
  );
}

function PauseOverlay({
  hud,
  muted,
  onResume,
  onRestart,
  onExit,
  onToggleMute,
}: {
  hud: HudState;
  muted: boolean;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  onToggleMute: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-void/70 p-4 backdrop-blur-md anim-fade-in">
      <div className="pointer-events-none absolute inset-0 grid-fine opacity-20" />
      <div className="clip-panel relative w-full max-w-[620px] border border-bone/18 bg-[#080e0a]/96 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.95)]">
        <div className="flex items-center justify-between border-b border-bone/12 px-5 py-3">
          <div className="flex items-center gap-2 font-mono text-[8px] tracking-[0.18em] text-acid/80">
            <PauseIcon className="h-3.5 w-3.5" /> SIMULATION INTERRUPTED
          </div>
          <span className="font-mono text-[8px] tracking-[0.14em] text-mist/40">SECTOR 07 / SOLO</span>
        </div>
        <div className="p-5 sm:p-7">
          <div className="font-mono text-[8px] tracking-[0.18em] text-mist/40">NULLPOINT // OPERATOR GHOST-07</div>
          <h2 className="mt-1 font-display text-5xl font-bold uppercase leading-[0.84] sm:text-6xl">
            Simulation
            <br />
            <span className="text-acid">Paused</span>
          </h2>
          <div className="mt-4 grid grid-cols-3 divide-x divide-bone/10 border-y border-bone/10 py-3">
            <div className="pr-2">
              <div className="font-mono text-[7px] tracking-widest text-mist/35">SCORE</div>
              <div className="mt-0.5 font-display text-xl font-semibold leading-none">{hud.score.toLocaleString("en-US")}</div>
            </div>
            <div className="px-3">
              <div className="font-mono text-[7px] tracking-widest text-mist/35">CLOCK HELD</div>
              <div className="mt-0.5 font-mono text-base font-semibold leading-none text-acid">
                {Math.floor(Math.ceil(hud.timeLeft) / 60).toString().padStart(2, "0")}:
                {(Math.ceil(hud.timeLeft) % 60).toString().padStart(2, "0")}
              </div>
            </div>
            <div className="pl-3">
              <div className="font-mono text-[7px] tracking-widest text-mist/35">WAVE</div>
              <div className="mt-0.5 font-display text-xl font-semibold leading-none">{hud.wave.toString().padStart(2, "0")}</div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_190px]">
            <div>
              <div className="font-mono text-[8px] tracking-[0.14em] text-bone/55">QUICK REFERENCE</div>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-[8px] tracking-wide text-mist/50">
                <div className="flex items-center justify-between gap-2 border-b border-bone/8 py-1">
                  <span>MOVE</span>
                  <span className="text-bone/70">W A S D</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-bone/8 py-1">
                  <span>FIRE</span>
                  <span className="text-bone/70">LMB</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-bone/8 py-1">
                  <span>AIM</span>
                  <span className="text-bone/70">RMB</span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-bone/8 py-1">
                  <span>RELOAD</span>
                  <span className="text-bone/70">R</span>
                </div>
              </div>
              <button
                type="button"
                onClick={onToggleMute}
                className="mt-3 flex items-center gap-2 font-mono text-[8px] tracking-[0.12em] text-mist/50 transition hover:text-acid"
              >
                <SoundIcon muted={muted} className="h-3.5 w-3.5" />
                AUDIO {muted ? "MUTED" : "ENABLED"}
              </button>
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={onResume}
                className="clip-btn flex w-full items-center justify-between bg-acid px-3 py-3 text-void transition hover:bg-[#e4ff7a]"
              >
                <span className="flex items-center gap-2">
                  <PlayIcon className="h-3.5 w-3.5" />
                  <span className="font-display text-base font-bold uppercase tracking-wide">Resume</span>
                </span>
                <ArrowIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="flex w-full items-center justify-between border border-bone/18 px-3 py-2.5 font-mono text-[8px] tracking-[0.14em] text-bone/70 transition hover:border-bone/40 hover:text-bone"
              >
                RESTART RUN <span>↺</span>
              </button>
              <button
                type="button"
                onClick={onExit}
                className="flex w-full items-center justify-between border border-rust/25 bg-rust/[0.06] px-3 py-2.5 font-mono text-[8px] tracking-[0.14em] text-rust/80 transition hover:bg-rust/15"
              >
                ABORT TO BASE <span>×</span>
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-bone/10 bg-bone/[0.02] px-5 py-2.5 font-mono text-[7px] tracking-[0.12em] text-mist/35">
          <span>MOUSE RELEASED</span>
          <span>PRESS P TO TOGGLE PAUSE</span>
        </div>
      </div>
    </div>
  );
}

export default function GameView({ config, bestScore, muted, onToggleMute, onExit, onRunEnd }: GameViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const bestRef = useRef(bestScore);
  bestRef.current = bestScore;
  const runEndRef = useRef(onRunEnd);
  runEndRef.current = onRunEnd;
  const [runKey, setRunKey] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [hud, setHud] = useState<HudState>(() => createInitialHud(config.weapon));
  const [isTouch] = useState(() => window.matchMedia("(pointer: coarse)").matches);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const engine = new GameEngine(container, config, {
      onHud: setHud,
      onEnd: (run) => {
        const previousBest = bestRef.current;
        setResult(run);
        setNewBest(run.score > previousBest);
        runEndRef.current(run);
      },
    });
    engineRef.current = engine;
    engine.start();
    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // A new run is intentionally created when the key, difficulty or starting weapon changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey, config.difficulty, config.weapon]);

  useEffect(() => {
    engineRef.current?.setMuted(muted);
  }, [muted]);

  const restart = () => {
    setResult(null);
    setNewBest(false);
    setHud(createInitialHud(config.weapon));
    setRunKey((key) => key + 1);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-void">
      <div ref={containerRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 z-10 opacity-[0.14] [background:repeating-linear-gradient(to_bottom,transparent_0,transparent_3px,rgba(0,0,0,0.7)_4px)]" />
      <HUD
        hud={hud}
        muted={muted}
        isTouch={isTouch}
        engineRef={engineRef}
        onPause={() => engineRef.current?.pause()}
        onToggleMute={onToggleMute}
      />
      {hud.phase === "paused" && !result && (
        <PauseOverlay
          hud={hud}
          muted={muted}
          onResume={() => engineRef.current?.resume()}
          onRestart={restart}
          onExit={onExit}
          onToggleMute={onToggleMute}
        />
      )}
      {result && (
        <ResultOverlay result={result} newBest={newBest} onRedeploy={restart} onExit={onExit} />
      )}
    </div>
  );
}
