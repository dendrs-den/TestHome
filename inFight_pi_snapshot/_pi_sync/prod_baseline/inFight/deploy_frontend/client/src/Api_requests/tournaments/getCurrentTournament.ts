const getCurrentTournament = async () => {
  try {
    const response = await fetch(`/tournaments/getcurrent`);
    const data = await response.json();

    return data;
  } catch (error) {
    console.log("Log error /tournaments/getcurrent request failed", error);
  }
};

export default getCurrentTournament;
