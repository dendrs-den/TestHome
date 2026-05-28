import coreBaseUrl, { operatorJsonHeaders } from "../coreBaseUrl";
import { RoundInfo } from "../../types/general_types";

function mapRoundState(roundState?: string) {
  switch (roundState) {
    case "prepared":
      return "Expectation";
    case "running":
      return "Performance";
    case "completed":
      return "Completion";
    case "cancelled":
      return "Preparation";
    case "idle":
    default:
      return "Administration";
  }
}

const getInfo = async (): Promise<RoundInfo> => {
  try {
    const [domainResponse, healthResponse] = await Promise.all([
      fetch(`${coreBaseUrl}/v1/domain/state`, {
        method: "GET",
        headers: operatorJsonHeaders(),
      }),
      fetch(`${coreBaseUrl}/health`, {
        method: "GET",
        headers: operatorJsonHeaders(),
      }),
    ]);

    const domain = await domainResponse.json();
    const health = await healthResponse.json();

    const roundState = mapRoundState(domain?.RoundState);
    const roundId = domain?.RoundID || "round-live";
    const tournamentId = domain?.TournamentID || "tournament-live";
    const resultMs = Number(domain?.RoundResultMs || 0);
    const roundStart =
      Number(domain?.RoundStartedAt || 0) ||
      Number(domain?.FirstCrossAt || 0) ||
      0;

    return {
      state: roundState,
      tournament: {
        id: tournamentId,
        name: tournamentId,
        round: [],
        skip_value: 0,
        stages: [],
        teams: [],
        disciplines: [{ name: health?.hardwareMode === "real" ? "Live sensor" : "Simulator" }],
        is_traning: false,
      } as any,
      round: {
        crossings: [],
        stage_rank: null,
        tournament_rank: null,
        faults: [],
        stage: {
          id: "live-stage",
          name: "Live run",
          battle: false,
        },
        team: {
          id: roundId,
          name: roundId,
          number: "",
          totalRank: 0,
          totalResult: 0,
        },
        time_real: resultMs || null,
        time_result: resultMs || null,
        round_start: roundStart || undefined,
      },
    };
  } catch (error) {
    console.log("Log error getInfo request failed", error);
    return {
      state: "Administration",
      tournament: {
        id: "unavailable",
        name: "core unavailable",
        round: [],
        skip_value: 0,
        stages: [],
        teams: [],
        disciplines: [{ name: "Unavailable" }],
        is_traning: false,
      } as any,
      round: {
        crossings: [],
        stage_rank: null,
        tournament_rank: null,
        faults: [],
        stage: { id: "offline", name: "Offline", battle: false },
        team: { id: "offline", name: "offline", number: "", totalRank: 0, totalResult: 0 },
        time_real: null,
        time_result: null,
      },
    };
  }
};

export default getInfo;
