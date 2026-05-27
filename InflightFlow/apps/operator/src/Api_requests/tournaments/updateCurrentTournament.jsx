// UPDATE CURRENT TOURNAMENT ROUND ORDER
import coreBaseUrl from "../coreBaseUrl";

export default async function updateCurrentTournament(tourData) {
  try {
    const response = await fetch(`${coreBaseUrl}/tournaments/current/update`, {
      method: "POST",
      headers: {
        "Content-type": "application/json",
      },
      body: JSON.stringify(tourData),
    });

    const res = await response.json();
    return res;
  } catch (error) {
    console.log("Log error /tournaments/current/update request failed", error);
  }
}
