const createTournament = async (tourParams) => {
  const response = await fetch(`/tournaments/add`, {
    method: "POST",
    body: JSON.stringify(tourParams),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to create tournament: HTTP ${response.status}`);
  }

  const data = await response.json();
  console.log("created tournament: ", data);
  return data;
};

export default createTournament;
