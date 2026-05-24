const swapTeamPositions = async (from, to) => {
  try {
    await fetch("/rounds/swap", {
      method: "POST",
      body: JSON.stringify([from, to]),
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.log("Log error swapTeamPositions request failed", err);
    console.log("err in swap commands");
  }
};

export default swapTeamPositions;
