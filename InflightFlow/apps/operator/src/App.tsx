import { useEffect, useState } from "react";

type Health = {
  status: string;
  service: string;
  hardwareMode: string;
};

export default function App() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("http://localhost:8080/health")
      .then((r) => r.json())
      .then((data: Health) => setHealth(data))
      .catch(() => setHealth(null));
  }, []);

  return (
    <main style={{ fontFamily: "Segoe UI, sans-serif", padding: 24 }}>
      <h1>InflightFlow Operator</h1>
      <p>Desktop operator shell (Tauri/React) is initialized.</p>
      <pre>{JSON.stringify(health, null, 2)}</pre>
    </main>
  );
}
