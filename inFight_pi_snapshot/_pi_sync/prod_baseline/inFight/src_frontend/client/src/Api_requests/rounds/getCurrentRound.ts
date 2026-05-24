const getCurrentRound = async () => {
  try {
    const response = await fetch("/actions/getCurrentRound", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.log("failed to get current round");
  }
};

export default getCurrentRound;
