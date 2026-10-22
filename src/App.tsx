import { useCallback, useMemo, useState } from "react";
import StartScreen from "./components/StartScreen";
import type { CareerStats } from "./components/StartScreen";
import GameView from "./components/GameView";
import type { DifficultyId, RunConfig, RunResult, WeaponId } from "./game/config";

const CAREER_KEY = "nullpoint.career.v1";
const MUTED_KEY = "nullpoint.muted.v1";

const defaultCareer: CareerStats = {
  bestScore: 0,
  runs: 0,
  kills: 0,
  accuracy: 0,
  bestWave: 0,
};

function loadCareer(): CareerStats {
  try {
    const raw = window.localStorage.getItem(CAREER_KEY);
    if (!raw) return defaultCareer;
    const parsed = JSON.parse(raw) as Partial<CareerStats>;
    return {
      bestScore: Number(parsed.bestScore) || 0,
      runs: Number(parsed.runs) || 0,
      kills: Number(parsed.kills) || 0,
      accuracy: Number(parsed.accuracy) || 0,
      bestWave: Number(parsed.bestWave) || 0,
    };
  } catch {
    return defaultCareer;
  }
}

function loadMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTED_KEY) === "true";
  } catch {
    return false;
  }
}

export default function App() {
  const [screen, setScreen] = useState<"menu" | "game">("menu");
  const [difficulty, setDifficulty] = useState<DifficultyId>("VETERAN");
  const [weapon, setWeapon] = useState<WeaponId>("pulse");
  const [muted, setMuted] = useState(loadMuted);
  const [career, setCareer] = useState<CareerStats>(loadCareer);
  const [session, setSession] = useState(0);

  const deploy = () => {
    setSession((value) => value + 1);
    setScreen("game");
  };

  const toggleMute = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(MUTED_KEY, String(next));
      } catch {
        // Storage may be unavailable in private browsing; audio preference still applies.
      }
      return next;
    });
  }, []);

  const handleRunEnd = useCallback((result: RunResult) => {
    setCareer((current) => {
      const runs = current.runs + 1;
      const next: CareerStats = {
        bestScore: Math.max(current.bestScore, result.score),
        runs,
        kills: current.kills + result.kills,
        accuracy: Math.round((current.accuracy * current.runs + result.accuracy) / Math.max(1, runs)),
        bestWave: Math.max(current.bestWave, result.wave),
      };
      try {
        window.localStorage.setItem(CAREER_KEY, JSON.stringify(next));
      } catch {
        // Preference will still live for this session.
      }
      return next;
    });
  }, []);

  const config = useMemo<RunConfig>(
    () => ({ difficulty, weapon, muted }),
    [difficulty, weapon, muted],
  );

  if (screen === "game") {
    return (
      <GameView
        key={session}
        config={config}
        bestScore={career.bestScore}
        muted={muted}
        onToggleMute={toggleMute}
        onExit={() => setScreen("menu")}
        onRunEnd={handleRunEnd}
      />
    );
  }

  return (
    <StartScreen
      difficulty={difficulty}
      weapon={weapon}
      muted={muted}
      stats={career}
      onDifficulty={setDifficulty}
      onWeapon={setWeapon}
      onToggleMute={toggleMute}
      onDeploy={deploy}
    />
  );
}
