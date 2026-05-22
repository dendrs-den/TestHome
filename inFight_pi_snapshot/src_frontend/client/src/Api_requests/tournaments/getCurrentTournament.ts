
const getCurrentTournament =  async () => {
  const response = await fetch(`/tournaments/getcurrent`);
  const data = await response.json();
  
  return data;
}

export default getCurrentTournament;