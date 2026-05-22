const roundUpdateTeam = async (roundIndex, teamId) => {
  try {
    await fetch("/rounds/updateTeam", {
      method: "POST",
      body: JSON.stringify({ roundIndex, teamId }),
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.log("err in swap commands");
  }
};

export default roundUpdateTeam;
