const API_BASE =
  process.env.REACT_APP_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

const getCurrentState = async () => {
  const requestOptions = {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  };

  try {
    const response = await fetch(`${API_BASE}/actions/getstate`, requestOptions);
    const data = await response.json();
    return data?.state || "Administration";
  } catch (primaryError) {
    try {
      const fallbackResponse = await fetch(`/actions/getstate`, requestOptions);
      const fallbackData = await fallbackResponse.json();
      return fallbackData?.state || "Administration";
    } catch (fallbackError) {
      console.log("Failed to fetch current state", primaryError, fallbackError);
      return "Administration";
    }
  }
};

export default getCurrentState;
