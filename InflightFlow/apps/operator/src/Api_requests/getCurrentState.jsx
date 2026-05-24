const getCurrentState = async () => {
  try {
    const response = await fetch(`/actions/getstate`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return data.state;
  } catch (err) {
    console.log("Log error /actions/getstate request failed", err);
    console.log("Error occurred while trying to get current state");
    return "";
  }
};

export default getCurrentState;
