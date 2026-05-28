const setPrepareState = async () => {
  try {
    const response = await fetch(`/actions/setPrepare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
  } catch (err) {
    console.log("Log error /actions/setPrepare request failed", err);
    console.log("An error during setPrepare:", err);
  }
};

export default setPrepareState;
