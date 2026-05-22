const setCurrentRound = async (poss) => {
  try {
    const response = await fetch(`/rounds/set/${poss}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.log("error setting current round");
  }
};

export default setCurrentRound;
