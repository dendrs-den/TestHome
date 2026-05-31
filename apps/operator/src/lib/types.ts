export type CoreHealth = {
  status: string;
  service: string;
  hardwareMode: string;
};

export type RoundState = "idle" | "prepared" | "running" | "completed" | "cancelled";

export type DomainState = {
  TournamentID: string;
  RoundID: string;
  RoundState: RoundState;
  Crossings: number;
  RoundStartedAt?: number;
  RoundResultMs: number;
  RoundFaults?: Array<{
    id?: string;
    type?: string;
    time?: number;
    device_type?: string;
    device_id?: number;
    valid?: boolean;
  }>;
  BustCount?: number;
  SkipCount?: number;
  RoundTimeRealMs?: number | null;
  RoundTimeResultMs?: number | null;
  StageName?: string;
  TeamName?: string;
};

export type SensorHealthPayload = {
  enabled: boolean;
  health: {
    level: "OK" | "WARNING" | "CRITICAL";
    action: "NONE" | "CHECK_WIRING" | "RESTART_SENSOR" | "HOLD_START";
    reasons: string[];
  };
};

export type ReadinessPayload = {
  canStartRound: boolean;
  health: SensorHealthPayload["health"];
};

export type PreflightStep = {
  name: string;
  pass: boolean;
  message: string;
};

export type PreflightStatus = {
  running: boolean;
  overall: "pending" | "pass" | "fail";
  steps: PreflightStep[];
};

export type Snapshot = {
  core: CoreHealth;
  domain: DomainState;
  sensor: SensorHealthPayload;
  readiness: ReadinessPayload;
  preflight: PreflightStatus;
};
