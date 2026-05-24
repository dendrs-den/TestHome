export default async function updateTournament(data) {
  try {
    console.log(data);
    const response = await fetch("/tournaments/update", {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify({
        id: data.id,
        name: data.name,
        teams: data.teams,
        disciplines: data.disciplines,
        stages: data.stages,
        bust_value: data.bust_value,
        skip_value: data.skip_value,
      }),
    });

    const res = await response.json();
    return res;
  } catch (error) {
    console.log("Log error /tournaments/update request failed", error);
  }
}
