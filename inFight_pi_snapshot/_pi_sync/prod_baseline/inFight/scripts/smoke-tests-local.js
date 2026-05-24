/* eslint-disable no-console */
const BASE_URL = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3001";

const getJson = async (url, init) => {
  const response = await fetch(url, init);
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

const run = async () => {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, status: "PASS" });
    } catch (error) {
      results.push({ name, status: "FAIL", error: error.message });
    }
  };

  await test("Health: get current state", async () => {
    const res = await getJson(`${BASE_URL}/actions/getstate`, { method: "GET" });
    assert(res.ok, `Expected 200, got ${res.status}`);
  });

  await test("Service activate", async () => {
    const res = await getJson(`${BASE_URL}/actions/service/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(res.ok, `Expected 200, got ${res.status}`);
    assert(res.data?.ok === true, "Expected {ok:true}");
  });

  await test("Service cross #1", async () => {
    const res = await getJson(`${BASE_URL}/actions/service/cross`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(res.ok, `Expected 200, got ${res.status}`);
    assert(typeof res.data?.cross?.cross === "number", "Expected numeric cross");
  });

  await test("Service cross #2", async () => {
    const res = await getJson(`${BASE_URL}/actions/service/cross`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(res.ok, `Expected 200, got ${res.status}`);
    assert(typeof res.data?.cross?.cross === "number", "Expected numeric cross");
  });

  await test("Service stop should save", async () => {
    const res = await getJson(`${BASE_URL}/actions/service/stop`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(res.ok, `Expected 200, got ${res.status}`);
    assert(res.data?.result === true, "Expected result=true");
    assert(typeof res.data?.fact_time === "number", "Expected fact_time");
  });

  await test("Round end should include stop result", async () => {
    const startRes = await getJson(`${BASE_URL}/rounds/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(startRes.ok, `Start failed: ${startRes.status}`);
    const endRes = await getJson(`${BASE_URL}/rounds/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    assert(endRes.ok, `End failed: ${endRes.status}`);
  });

  await test("Get info after stop", async () => {
    const res = await getJson(`${BASE_URL}/actions/getinfo`, { method: "GET" });
    assert(res.ok, `Expected 200, got ${res.status}`);
    assert(typeof res.data === "object" && res.data !== null, "Expected object response");
  });

  console.log("SMOKE TEST RESULTS");
  console.table(results);

  const failed = results.filter((r) => r.status === "FAIL");
  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

run().catch((e) => {
  console.error("Smoke test runner crashed:", e);
  process.exit(1);
});

