const getLastRound = async () => {
  try {
    const response = await fetch("/actions/getLastRound", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    if (data.status) {
      return false;
    }
    return data;
  } catch (error) {
    console.log("Log error /actions/getLastRound request failed", error);
  }
};

export default getLastRound;
