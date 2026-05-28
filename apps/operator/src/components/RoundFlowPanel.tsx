import type { DomainState, ReadinessPayload } from "../lib/types";

type Props = {
  domain: DomainState | null;
  readiness: ReadinessPayload | null;
  busy: boolean;
  roundId: string;
  onPrepare: (roundId: string) => void;
  onFinish: () => void;
  onCancel: () => void;
};

function getStage(domain: DomainState | null, readiness: ReadinessPayload | null) {
  const state = domain?.RoundState ?? "idle";
  if (state === "prepared") return "prepared";
  if (state === "running") return "running";
  if (state === "completed") return "completed";
  if (state === "cancelled") return "cancelled";
  if (readiness?.canStartRound) return "ready";
  return "idle";
}

export function RoundFlowPanel(props: Props) {
  const stage = getStage(props.domain, props.readiness);

  let title = "Waiting";
  let hint = "Check readiness and press Prepare.";
  let action: JSX.Element | null = null;

  if (stage === "ready" || stage === "idle" || stage === "completed" || stage === "cancelled") {
    title = "Step 1: Prepare";
    hint = "Press Prepare. After that the first sensor crossing starts the round automatically.";
    action = (
      <button disabled={props.busy} onClick={() => props.onPrepare(props.roundId)}>
        Prepare
      </button>
    );
  }

  if (stage === "prepared") {
    title = "Step 2: Wait for start";
    hint = "Waiting for the first sensor crossing. Manual Start is not required.";
    action = (
      <button disabled={props.busy} onClick={props.onCancel}>
        Cancel
      </button>
    );
  }

  if (stage === "running") {
    title = "Step 3: Running";
    hint = "System is counting crossings. Press Finish when the run is complete.";
    action = (
      <div style={{ display: "flex", gap: 8 }}>
        <button disabled={props.busy} onClick={props.onFinish}>Finish</button>
        <button disabled={props.busy} onClick={props.onCancel}>Cancel</button>
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: 10, marginBottom: 12 }}>
      <h3>Round Flow</h3>
      <p>
        Stage: <b>{title}</b>
      </p>
      <p style={{ color: "#555" }}>{hint}</p>
      {action}
    </div>
  );
}
