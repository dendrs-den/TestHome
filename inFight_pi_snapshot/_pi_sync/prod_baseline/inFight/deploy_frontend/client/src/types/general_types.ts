export type RoundInfo = {
  round: Round;
  state: string;
  tournament: Tournament;
};

export type LastRound = {
  crossings: Array<{ cross: string }>;
  faults: Fault[];
  round_start: number;
  stage_rank: number;
  team: Team;
  time_real: number;
  time_result: number;
};

export type Team = {
  id: string;
  name: string;
  number: string;
  totalRank: number;
  totalResult: number;
};

export type Stage = {
  id: string;
  name: string;
  battle: boolean;
};

export type Round = {
  crossings: Cross[];
  stage_rank: number | null;
  tournament_rank: number | null;
  faults: Fault[];
  stage: Stage;
  team: Team;
  time_real: number | null;
  time_result: number | null;
  round_start?: number;
};

export type Tournament = {
  id: string;
  name: string;
  round: Round[];
  skip_value: number;
  stages: Stage[];
  teams: Team[];
  is_traning?: boolean;
};

export type Fault = {
  device_id: number;
  device_type: string;
  time: number;
  type: string;
  valid: boolean;
};

export type Cross = {
  cross: number;
};

export enum CrossErrors {
  zeroCross = "Can't end round, only have 0 crossing",
  wrongState = "Can't move state from Expectation to Completion",
  wrongState2 = "Can't move state from Completion to Completion",
  wrongState3 = "Can't move state from Administration to Completion",
  singleCross = "Can't end round, only have 1 crossing",
}
