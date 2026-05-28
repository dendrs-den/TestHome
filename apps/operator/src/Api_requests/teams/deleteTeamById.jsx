const deleteTeamById = async (teamId) => {
  try {
    const response = await fetch(`/teams/delete`, {
      method: "POST",
      body: JSON.stringify({ id: teamId }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Log error /teams/delete request failed", error);
  }
};

export default deleteTeamById;
