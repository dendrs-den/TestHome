const setServerTrainingMode = async () => {
  const response = await fetch(`/tournaments/training`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export default setServerTrainingMode;
