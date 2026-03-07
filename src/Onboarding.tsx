import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Game } from "./GameCard";
import { Gamepad2, Check, Loader } from "lucide-react";

interface OnboardingProps {
  onComplete: (games: Game[]) => void;
}

const STEPS = [
  { id: "steam", label: "Steam", icon: "", command: "scan_steam_games", platform: "Steam" },
  { id: "epic", label: "Epic Games", icon: "", command: "scan_epic_games", platform: "Epic" },
  { id: "ubisoft", label: "Ubisoft Connect", icon: "", command: "scan_ubisoft_games", platform: "Ubisoft" },
  { id: "gog", label: "GOG Galaxy", icon: "", command: "scan_gog_games", platform: "GOG" },
];

type StepStatus = "waiting" | "scanning" | "done" | "error";

interface StepResult {
  status: StepStatus;
  count: number;
}

function Onboarding({ onComplete }: OnboardingProps) {
  const [stepResults, setStepResults] = useState<Record<string, StepResult>>({
    steam: { status: "waiting", count: 0 },
    epic: { status: "waiting", count: 0 },
    ubisoft: { status: "waiting", count: 0 },
    gog: { status: "waiting", count: 0 },
  });
  const [totalGames, setTotalGames] = useState(0);
  const [finished, setFinished] = useState(false);
  const [allGames, setAllGames] = useState<Game[]>([]);

  const mapGames = (games: any[], platform: string): Game[] =>
    games.map((g) => ({
      id: g.id,
      title: g.name,
      genre: "Unknown",
      platform,
      playtime: g.playtime,
      hltb: 0,
      lastPlayed: g.last_played > 0
        ? new Date(g.last_played * 1000).toISOString().split("T")[0]
        : null,
      cover: g.cover,
      launchCommand: g.launch_command,
    }));

  useEffect(() => {
    const runScan = async () => {
      const collected: Game[] = [];

      for (const step of STEPS) {
        // Set scanning
        setStepResults((prev) => ({
          ...prev,
          [step.id]: { status: "scanning", count: 0 },
        }));

        await new Promise((r) => setTimeout(r, 600));

        try {
          const raw = await invoke<any[]>(step.command);
          const mapped = mapGames(raw, step.platform);
          collected.push(...mapped);

          setStepResults((prev) => ({
            ...prev,
            [step.id]: { status: "done", count: mapped.length },
          }));

          setTotalGames((prev) => prev + mapped.length);
        } catch {
          setStepResults((prev) => ({
            ...prev,
            [step.id]: { status: "error", count: 0 },
          }));
        }

        await new Promise((r) => setTimeout(r, 400));
      }

      setAllGames(collected);
      await new Promise((r) => setTimeout(r, 800));
      setFinished(true);
    };

    runScan();
  }, []);

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        {/* Logo */}
        <div className="onboarding-logo">
          <Gamepad2 size={40} color="var(--accent)" />
          <h1>Aura</h1>
          <p>Setting up your library...</p>
        </div>

        {/* Steps */}
        <div className="onboarding-steps">
          {STEPS.map((step) => {
            const result = stepResults[step.id];
            return (
              <div key={step.id} className={`onboarding-step ${result.status}`}>
                <div className="onboarding-step-icon">
                  {result.status === "scanning" && <Loader size={16} className="spinning-icon" />}
                  {result.status === "done" && <Check size={16} color="var(--accent)" />}
                  {result.status === "waiting" && <span style={{ opacity: 0.3 }}>{step.icon}</span>}
                  {result.status === "error" && <span>⚠️</span>}
                </div>
                <div className="onboarding-step-info">
                  <span className="onboarding-step-label">{step.label}</span>
                  {result.status === "scanning" && (
                    <span className="onboarding-step-status">Scanning...</span>
                  )}
                  {result.status === "done" && (
                    <span className="onboarding-step-count">
                      {result.count} game{result.count !== 1 ? "s" : ""} found
                    </span>
                  )}
                  {result.status === "waiting" && (
                    <span className="onboarding-step-status">Waiting...</span>
                  )}
                  {result.status === "error" && (
                    <span className="onboarding-step-status">Not found</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Total */}
        {totalGames > 0 && (
          <div className="onboarding-total">
            <span className="onboarding-total-count">{totalGames}</span>
            <span className="onboarding-total-label">games found across your library</span>
          </div>
        )}

        {/* Launch button */}
        {finished && (
          <button
            className="onboarding-launch-btn"
            onClick={() => onComplete(allGames)}
          >
            Open My Library →
          </button>
        )}
      </div>
    </div>
  );
}

export default Onboarding;