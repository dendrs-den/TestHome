const API_BASE =
  process.env.REACT_APP_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

const serviceActivate = async () => {
  try {
    const response = await fetch(`${API_BASE}/actions/service/activate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (err) {
    console.log("Service activate failed");
  }
};

export default serviceActivate;
