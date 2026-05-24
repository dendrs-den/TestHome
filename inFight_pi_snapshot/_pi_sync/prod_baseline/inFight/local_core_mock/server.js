const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");

const PORT = Number(process.env.CORE_MOCK_PORT || 15000);
const DATA_PATH = path.join(__dirname, "data.json");
const AUTO_REMOTE_CROSS = process.env.MOCK_AUTO_REMOTE_CROSS === "1";
const AUTO_REMOTE_FAULT = process.env.MOCK_AUTO_REMOTE_FAULT === "1";

const mkId = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let id = "";
  for (let i = 0; i < 30; i += 1) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
};

const defaultDb = {
  state: "Administration",
  led: { enabled: true },
  history: [],
  currentTournamentId: null,
  currentRoundIndex: 0,
  rounds: [],
  faults: [],
  crosses: [],
  devices: {
    bluetoothDevices: [],
    connectedDevices: [],
    maps: [],
  },
  teams: [],
  disciplines: [],
  stages: [],
  tournaments: [],
};

const loadDb = () => {
  if (!fs.existsSync(DATA_PATH)) return { ...defaultDb };
  try {
    return { ...defaultDb, ...JSON.parse(fs.readFileSync(DATA_PATH, "utf8")) };
  } catch {
    return { ...defaultDb };
  }
};

let db = loadDb();

const saveDb = () => {
  fs.writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
};

const getCurrentTournament = () => db.tournaments.find((t) => t.id === db.currentTournamentId) || null;
const buildRoundsForTournament = (tournament) => {
  const teams = Array.isArray(tournament?.teams) ? tournament.teams : [];
  const stages = Array.isArray(tournament?.stages) ? tournament.stages : [];
  if (!teams.length || !stages.length) return [];

  const rounds = [];
  for (const stage of stages) {
    for (const team of teams) {
      rounds.push({
        team,
        stage,
        faults: [],
        crossings: [],
        round_start: 0,
        time_real: null,
        time_result: null,
        stage_rank: null,
        tournament_rank: null,
      });
    }
  }
  return rounds;
};

const ensureTournamentRounds = (tournament) => {
  if (!tournament) return null;
  if (!Array.isArray(tournament.round) || tournament.round.length === 0) {
    tournament.round = buildRoundsForTournament(tournament);
  }
  return tournament;
};
const ensureRounds = () => {
  if (!db.rounds.length) {
    const t = getCurrentTournament();
    const teamId = t?.teams?.[0]?.id || "";
    db.rounds = [{ index: 0, teamId, time: 0, valid: true }];
  }
};

const recalcCurrentRoundMetrics = () => {
  ensureRounds();
  const current = db.rounds[db.currentRoundIndex];
  if (!current) return null;

  const sortedCrosses = [...(db.crosses || [])]
    .map((c) => Number(c?.cross || 0))
    .filter((v) => Number.isFinite(v) && v >= 0)
    .sort((a, b) => a - b);
  const factTime = sortedCrosses.length ? sortedCrosses[sortedCrosses.length - 1] : 0;

  const validFaults = (db.faults || []).filter((f) => f?.valid === true);
  const bustCount = validFaults.filter((f) => f?.type === "bust").length;
  const skipCount = validFaults.filter((f) => f?.type === "skip").length;

  const tournament = getCurrentTournament();
  const bustPriceSec = Number(tournament?.bust_value ?? 0);
  const skipPriceSec = Number(tournament?.skip_value ?? 0);
  const faultPenaltyMs = bustCount * bustPriceSec * 1000 + skipCount * skipPriceSec * 1000;
  const resultTime = factTime + faultPenaltyMs;

  current.crossings = db.crosses || [];
  current.faults = db.faults || [];
  current.time_real = factTime;
  current.time_result = resultTime;
  current.round_start = Date.now() - factTime;

  const stageName = current?.stage?.name;
  const sameStage = db.rounds.filter((r) => r?.stage?.name === stageName);
  const completed = sameStage
    .filter((r) => Number.isFinite(r?.time_result) && r.time_result > 0)
    .sort((a, b) => a.time_result - b.time_result);
  completed.forEach((r, idx) => {
    r.stage_rank = idx + 1;
  });

  return {
    factTime,
    resultTime,
    bustCount,
    skipCount,
    bustPriceSec,
    skipPriceSec,
    tournamentName: tournament?.name || "",
    disciplineName: tournament?.disciplines?.[0]?.name || "",
    stageName: current?.stage?.name || "",
    isBattle: Boolean(current?.stage?.battle),
    teamName: current?.team?.name || "",
  };
};

const buildLiveHistory = () => {
  const rows = [];
  const tournaments = Array.isArray(db.tournaments) ? db.tournaments : [];

  tournaments.forEach((tournament) => {
    const tournamentName = tournament?.name || "";
    const disciplineName = tournament?.disciplines?.[0]?.name || "";
    const bustPrice = Number(tournament?.bust_value ?? 0);
    const skipPrice = Number(tournament?.skip_value ?? 0);
    const rounds = Array.isArray(tournament?.round) ? tournament.round : [];

    rounds.forEach((round) => {
      const faults = Array.isArray(round?.faults) ? round.faults : [];
      const validFaults = faults.filter((f) => f?.valid === true);
      const bustCount = validFaults.filter((f) => f?.type === "bust").length;
      const skipCount = validFaults.filter((f) => f?.type === "skip").length;

      rows.push({
        tournament: tournamentName,
        team: round?.team?.name || "",
        discipline: disciplineName,
        stage: round?.stage?.name || "",
        is_battle: Boolean(round?.stage?.battle),
        bust_price: bustPrice,
        skip_price: skipPrice,
        bust_count: bustCount,
        skip_count: skipCount,
        actual_time: Number(round?.time_real ?? 0),
        result_time: Number(round?.time_result ?? 0),
      });
    });
  });

  return rows;
};

const app = express();
app.use(cors());
app.use(express.json());

app.get("/__mock/health", (_req, res) => {
  const current = getCurrentTournament();
  res.json({
    service: "local_core_mock",
    currentTournamentId: db.currentTournamentId,
    currentRoundIndex: db.currentRoundIndex,
    roundsCount: Array.isArray(db.rounds) ? db.rounds.length : 0,
    tournamentRoundCount: Array.isArray(current?.round) ? current.round.length : 0,
  });
});

app.get("/tournament/all", (_req, res) => res.json(db.tournaments));
app.get("/tournament/current", (_req, res) => {
  const tournament = ensureTournamentRounds(getCurrentTournament());
  saveDb();
  res.json(tournament);
});
app.post("/tournament/current", (req, res) => {
  db.currentTournamentId = req.body?.id || null;
  db.currentRoundIndex = 0;
  const tournament = ensureTournamentRounds(getCurrentTournament());
  db.rounds = tournament?.round || [];
  ensureRounds();
  saveDb();
  res.json({ ok: true, id: db.currentTournamentId });
});
app.post("/tournament/add", (req, res) => {
  const t = ensureTournamentRounds({ id: mkId(), ...req.body });
  db.tournaments.push(t);
  if (!db.currentTournamentId) db.currentTournamentId = t.id;
  if (db.currentTournamentId === t.id) {
    db.rounds = t.round || [];
  }
  db.history.unshift({ type: "tournament.add", at: Date.now(), payload: { id: t.id, name: t.name } });
  saveDb();
  res.json(t.id);
});
app.post("/tournament/delete", (req, res) => {
  const id = req.body?.id;
  db.tournaments = db.tournaments.filter((t) => t.id !== id);
  if (db.currentTournamentId === id) db.currentTournamentId = db.tournaments[0]?.id || null;
  saveDb();
  res.json("");
});
app.post("/tournament/update", (req, res) => {
  const idx = db.tournaments.findIndex((t) => t.id === req.body?.id);
  if (idx !== -1) db.tournaments[idx] = ensureTournamentRounds({ ...db.tournaments[idx], ...req.body });
  if (db.tournaments[idx]?.id === db.currentTournamentId) {
    db.rounds = db.tournaments[idx].round || [];
  }
  saveDb();
  res.json(db.tournaments[idx] || req.body);
});
app.post("/tournament/current/update", (req, res) => {
  const idx = db.tournaments.findIndex((t) => t.id === db.currentTournamentId || t.id === req.body?.id);
  if (idx !== -1) db.tournaments[idx] = ensureTournamentRounds({ ...db.tournaments[idx], ...req.body });
  if (idx !== -1) {
    db.rounds = db.tournaments[idx].round || [];
  }
  saveDb();
  res.json(db.tournaments[idx] || req.body);
});
app.post("/tournament/test", (_req, res) => res.json({ ok: true }));
app.get("/tournament/lastround", (_req, res) => res.json(db.rounds[db.rounds.length - 1] || null));

app.post("/team/add", (req, res) => {
  const team = { id: mkId(), name: req.body?.name || "", number: req.body?.number || 0 };
  db.teams.push(team);
  saveDb();
  res.json(team.id);
});
app.post("/team/delete", (req, res) => {
  db.teams = db.teams.filter((x) => x.id !== req.body?.id);
  saveDb();
  res.json("");
});
app.post("/team/update", (req, res) => {
  const i = db.teams.findIndex((x) => x.id === req.body?.id);
  if (i !== -1) db.teams[i] = { ...db.teams[i], ...req.body };
  saveDb();
  res.json(db.teams[i] || req.body);
});

app.post("/disciplines/add", (req, res) => {
  const item = { id: mkId(), name: req.body?.name || "" };
  db.disciplines.push(item);
  saveDb();
  res.json(item.id);
});
app.post("/disciplines/delete", (req, res) => {
  db.disciplines = db.disciplines.filter((x) => x.id !== req.body?.id);
  saveDb();
  res.json("");
});
app.post("/disciplines/update", (req, res) => {
  const i = db.disciplines.findIndex((x) => x.id === req.body?.id);
  if (i !== -1) db.disciplines[i] = { ...db.disciplines[i], ...req.body };
  saveDb();
  res.json(db.disciplines[i] || req.body);
});

app.post("/stage/add", (req, res) => {
  const item = { id: mkId(), name: req.body?.name || "", battle: !!req.body?.battle };
  db.stages.push(item);
  saveDb();
  res.json(item.id);
});
app.post("/stage/delete", (req, res) => {
  db.stages = db.stages.filter((x) => x.id !== req.body?.id);
  saveDb();
  res.json("");
});
app.post("/stage/update", (req, res) => {
  const i = db.stages.findIndex((x) => x.id === req.body?.id);
  if (i !== -1) db.stages[i] = { ...db.stages[i], ...req.body };
  saveDb();
  res.json(db.stages[i] || req.body);
});

app.post("/state/set/prepare", (_req, res) => {
  db.state = "Preparation";
  saveDb();
  res.json({ state: db.state });
});
app.post("/state/set/administration", (_req, res) => {
  db.state = "Administration";
  saveDb();
  res.json({ state: db.state });
});
app.get("/state/current", (_req, res) => res.json(db.state));

app.get("/round/info", (_req, res) => {
  ensureRounds();
  res.json({ state: db.state, round: db.rounds[db.currentRoundIndex] || null, faults: db.faults, crossed: db.crosses });
});
app.get("/round/current", (_req, res) => {
  ensureRounds();
  res.json(db.rounds[db.currentRoundIndex] || null);
});
app.get("/round/save", (_req, res) => res.json({ ok: true }));
app.get("/round/fault", (_req, res) => res.json(db.faults));
app.post("/round/fault", (req, res) => {
  const item = { id: mkId(), ...req.body, valid: true };
  db.faults.push(item);
  saveDb();
  res.json({ valid: true, item });
});
app.post("/round/fault/edit", (req, res) => {
  db.faults = Array.isArray(req.body) ? req.body : db.faults;
  recalcCurrentRoundMetrics();
  saveDb();
  res.json(db.faults);
});
app.get("/round/fault/remote", (_req, res) =>
  res.json(AUTO_REMOTE_FAULT ? { valid: true, remote: true } : { valid: false, remote: false })
);

app.get("/round/crossed", (_req, res) => res.json(db.crosses));
app.get("/round/crossed/remote", (_req, res) =>
  res.json(AUTO_REMOTE_CROSS ? { cross: 1, timestamp: Date.now() } : { cross: 0, timestamp: Date.now() })
);
app.post("/round/crossed/edit", (req, res) => {
  db.crosses = Array.isArray(req.body) ? req.body : db.crosses;
  recalcCurrentRoundMetrics();
  saveDb();
  res.json(db.crosses);
});

app.post("/round/start", (_req, res) => {
  db.state = "Performance";
  saveDb();
  res.json({ ok: true });
});
app.get("/round/start/bluetooth/remote", (_req, res) => res.json({ ok: true }));
app.get("/round/start/crossing/remote", (_req, res) =>
  res.json(AUTO_REMOTE_CROSS ? { cross: 1 } : { cross: 0 })
);
app.post("/round/end", (_req, res) => {
  recalcCurrentRoundMetrics();
  db.state = "Completion";
  saveDb();
  res.json({ ok: true });
});
app.get("/round/end/remote", (_req, res) => res.json({ ok: true }));
app.post("/round/replay", (_req, res) => res.json({ ok: true }));
app.post("/round/set/next", (_req, res) => {
  ensureRounds();
  db.currentRoundIndex = Math.min(db.currentRoundIndex + 1, db.rounds.length - 1);
  saveDb();
  res.json({ index: db.currentRoundIndex });
});
app.post("/round/set/:poss", (req, res) => {
  ensureRounds();
  const idx = Number(req.params.poss);
  db.currentRoundIndex = Number.isFinite(idx) ? Math.max(0, Math.min(idx, db.rounds.length - 1)) : 0;
  saveDb();
  res.json({ index: db.currentRoundIndex });
});
app.post("/round/swap", (_req, res) => res.json({ ok: true }));
app.post("/round/:roundIndex/update/team", (req, res) => res.json({ ok: true, roundIndex: req.params.roundIndex, id: req.body?.id }));

app.get("/history", (_req, res) => {
  res.json(buildLiveHistory());
});
app.get("/time", (_req, res) => res.json({ time: Date.now() }));
app.get("/led/status", (_req, res) => res.json(db.led));
app.post("/led/switch", (req, res) => {
  db.led = { ...db.led, ...req.body };
  saveDb();
  res.json(db.led);
});

app.get("/device/getAll", (_req, res) => res.json(db.devices));
app.get("/device/connect/:mac", (req, res) => res.json({ ok: true, mac: req.params.mac }));
app.get("/device/disconnect/:mac", (req, res) => res.json({ ok: true, mac: req.params.mac }));
app.get("/device/nextKey/:guid/:type", (req, res) => res.json({ ok: true, guid: req.params.guid, type: req.params.type }));
app.get("/device/dropKeys/:mac", (req, res) => res.json({ ok: true, mac: req.params.mac }));
app.get("/device/dropSetKeys/:mac", (req, res) => res.json({ ok: true, mac: req.params.mac }));

app.post("/lp/start", (_req, res) => res.json({ ok: true }));
app.post("/lp/tune", (_req, res) => res.json({ ok: true }));
app.post("/lp/loop", (_req, res) => res.json({ ok: true, events: [] }));

app.listen(PORT, () => {
  console.log(`Local core mock listening at http://127.0.0.1:${PORT}`);
});
