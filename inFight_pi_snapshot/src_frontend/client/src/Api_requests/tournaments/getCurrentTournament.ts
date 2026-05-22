
const API_BASE =
  process.env.REACT_APP_API_BASE ||
  `${window.location.protocol}//${window.location.hostname}:3001`;

const EMPTY_TOURNAMENT = {
  name: "",
  teams: [],
  stages: [],
  round: [],
  disciplines: [],
};

const getCurrentTournament = async () => {
  try {
    const response = await fetch(`${API_BASE}/tournaments/getcurrent`);
    const data = await response.json();
    return data || EMPTY_TOURNAMENT;
  } catch (primaryError) {
    try {
      const fallbackResponse = await fetch(`/tournaments/getcurrent`);
      const fallbackData = await fallbackResponse.json();
      return fallbackData || EMPTY_TOURNAMENT;
    } catch (fallbackError) {
      console.log(
        "Failed to fetch current tournament",
        primaryError,
        fallbackError
      );
      return EMPTY_TOURNAMENT;
    }
  }
};

export default getCurrentTournament;
