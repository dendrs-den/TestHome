const updateTeamInfo = async ({ id, name, number }) => {
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
};

export default updateTeamInfo;
