const setServerTrainingMode = async () => {
  try {
    const response = await fetch(`/tournaments/training`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.log("Log error /tournaments/training request failed", error);
  }
};

export default setServerTrainingMode;
