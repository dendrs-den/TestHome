const createNewTeam = async ({ name, number }) => {
  console.log(JSON.stringify({ name, number }));

  const response = await fetch(`/teams/add`, {
    method: "POST",
    body: JSON.stringify({ name: name, number: number }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  return data;
};

export default createNewTeam;
