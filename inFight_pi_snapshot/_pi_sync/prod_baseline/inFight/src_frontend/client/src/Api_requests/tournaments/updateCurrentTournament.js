// UPDATE CURRENT TOURNAMENT ROUND ORDER
export default async function updateCurrentTournament(tourData) {
  const response = await fetch("/tournaments/current/update", {
    method: "POST",
    headers: {
      "Content-type": "application/json",
    },
    body: JSON.stringify(tourData),
  });

  const res = await response.json();
  return res;
}
