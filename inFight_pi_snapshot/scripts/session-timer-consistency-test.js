/* eslint-disable no-console */
const BASE_URL = process.env.SESSION_TEST_BASE_URL || "http://127.0.0.1:3001";
const TOLERANCE_MS = Number(process.env.SESSION_TEST_TOLERANCE_MS || 10);
const MIN_EDGE_CROSSES = 1;
const MAX_EDGE_CROSSES = 5;
const MAX_MIDDLE_BUSTS = 7;
const MAX_MIDDLE_SKIPS = 1;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const requestJson = async (path, init = {}) => {
  const response = await fetch(`${BASE_URL}${path}`, init);
  let data = null;
  try {
    data = await response.json();
  } catch (_e) {
    data = null;
  }
  return { ok: response.ok, status: response.status, data };
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const main = async () => {
  console.log("Session consistency test started");

  // 1) Prepare service session
  const activate = await requestJson("/actions/service/activate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  assert(activate.ok && activate.data?.ok === true, "service activate failed");

  // 2) Start timer with first cross
  const firstCross = await requestJson("/actions/service/cross", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  assert(firstCross.ok, "first service cross failed");
  const t0 = Date.now();

  // 3) Emulate realistic mixed timeline:
  // start burst of crosses [1..5], then middle penalties (bust [0..7], skip [0..1]),
  // then end burst of crosses [1..5].
  const startBurstExtra = randInt(MIN_EDGE_CROSSES, MAX_EDGE_CROSSES);
  const middleBusts = randInt(0, MAX_MIDDLE_BUSTS);
  const middleSkips = randInt(0, MAX_MIDDLE_SKIPS);
  const endBurst = randInt(MIN_EDGE_CROSSES, MAX_EDGE_CROSSES);

  for (let i = 0; i < startBurstExtra; i += 1) {
    await sleep(randInt(60, 180));
    const cross = await requestJson("/actions/service/cross", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(cross.ok, `start burst cross #${i + 1} failed`);
  }

  for (let i = 0; i < middleBusts; i += 1) {
    await sleep(randInt(50, 220));
    const bust = await requestJson("/actions/sendbust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "bust", device_type: "terminal" }),
    });
    assert(bust.ok, `middle bust #${i + 1} failed`);
  }

  for (let i = 0; i < middleSkips; i += 1) {
    await sleep(randInt(50, 220));
    const skip = await requestJson("/actions/sendskip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "skip", device_type: "terminal" }),
    });
    assert(skip.ok, `middle skip #${i + 1} failed`);
  }

  for (let i = 0; i < endBurst; i += 1) {
    await sleep(randInt(60, 200));
    const cross = await requestJson("/actions/service/cross", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(cross.ok, `end burst cross #${i + 1} failed`);
  }

  await sleep(randInt(100, 180));

  // 4) Stop and collect result
  const tStopCall = Date.now();
  const stop = await requestJson("/actions/service/stop", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  assert(stop.ok, `service stop failed with status ${stop.status}`);
  assert(stop.data?.result === true, "service stop did not return result=true");
  assert(
    Number.isFinite(stop.data?.fact_time) && stop.data.fact_time > 0,
    "service stop did not return fact_time"
  );

  // 5) Fetch current info to validate arrays
  const info = await requestJson("/actions/getinfo", { method: "GET" });
  assert(info.ok, "getinfo failed");
  const crossed = info.data?.round?.crossings || info.data?.crossed || [];
  const faults = info.data?.round?.faults || info.data?.faults || [];

  // 6) Consistency checks
  assert(Array.isArray(crossed), "crossings is not an array");
  assert(Array.isArray(faults), "faults is not an array");
  assert(
    crossed.length >= 1 + startBurstExtra + endBurst,
    `expected >=${1 + startBurstExtra + endBurst} crossings, got ${crossed.length}`
  );
  assert(
    faults.filter((f) => f?.type === "bust").length >= middleBusts,
    `expected >=${middleBusts} busts`
  );
  assert(
    faults.filter((f) => f?.type === "skip").length >= middleSkips,
    `expected >=${middleSkips} skips`
  );

  const crossTimes = crossed
    .map((c) => Number(c?.cross || 0))
    .filter((x) => Number.isFinite(x))
    .sort((a, b) => a - b);
  const lastCross = crossTimes[crossTimes.length - 1] || 0;

  const measuredElapsed = tStopCall - t0;
  const factTime = Number(stop.data.fact_time);
  const diff = Math.abs(measuredElapsed - factTime);

  assert(
    lastCross <= factTime + TOLERANCE_MS,
    `last crossing (${lastCross}) is greater than fact_time (${factTime})`
  );
  assert(
    diff <= TOLERANCE_MS,
    `fact_time mismatch too big: measured=${measuredElapsed}ms, fact=${factTime}ms, diff=${diff}ms`
  );

  console.log("Session consistency test passed");
  console.table([
    {
      measured_elapsed_ms: measuredElapsed,
      fact_time_ms: factTime,
      diff_ms: diff,
      last_cross_ms: lastCross,
      start_burst_extra: startBurstExtra,
      end_burst: endBurst,
      expected_busts: middleBusts,
      expected_skips: middleSkips,
      busts: faults.filter((f) => f?.type === "bust").length,
      skips: faults.filter((f) => f?.type === "skip").length,
      crosses: crossed.length,
      tolerance_ms: TOLERANCE_MS,
    },
  ]);
};

main().catch((error) => {
  console.error("Session consistency test failed:", error.message);
  process.exit(1);
});
