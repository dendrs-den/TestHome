const API_BASE =
  process.env.REACT_APP_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

const roundStart = async () => {
  try {
    const response = await fetch(`${API_BASE}/rounds/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.log("Failed to start round");
  }
};

export default roundStart;
