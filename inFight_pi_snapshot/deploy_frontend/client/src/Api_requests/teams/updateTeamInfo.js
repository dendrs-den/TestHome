const updateTeamInfo = async ({ id, name, number }) => {
  try {
    const response = await fetch(`/teams/update`, {
      method: "POST",
      body: JSON.stringify({
        id: id,
        name: name,
        number: number,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("updated team with: ", id, name, number);

    return data;
  } catch (error) {
    console.log("Log error /teams/update request failed", error);
  }
};

export default updateTeamInfo;
