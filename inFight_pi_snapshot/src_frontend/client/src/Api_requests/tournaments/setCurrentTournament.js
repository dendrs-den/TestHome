const setCurrentTournamentById =  async (tourId) => {

  const response = await fetch(`/tournaments/current`, {
    method: 'POST',
    body: JSON.stringify({id: tourId}),
    headers: {
      'Content-Type': 'application/json',
    }
  });

  const data = await response.json();
  return data;
}

export default setCurrentTournamentById;