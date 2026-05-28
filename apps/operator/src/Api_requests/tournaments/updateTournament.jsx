import coreBaseUrl, { operatorJsonHeaders } from "../coreBaseUrl";

export default async function updateTournament(data) {
  try {
    const response = await fetch(`${coreBaseUrl}/tournaments/update`, {
      method: "POST",
      headers: operatorJsonHeaders(),
      body: JSON.stringify({
        id: data.id,
        name: data.name,
        teams: data.teams,
        disciplines: data.disciplines,
        stages: data.stages,
        round: data.round,
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
