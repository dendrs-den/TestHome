import getCurrentTournament from "../tournaments/getCurrentTournament";
import updateCurrentTournament from "../tournaments/updateCurrentTournament";

const swapTeamPositions = async (from, to) => {
  try {
    const currentTournament = await getCurrentTournament();
    const rounds = Array.isArray(currentTournament?.round) ? [...currentTournament.round] : [];

    if (!rounds[from] || !rounds[to]) {
      return;
    }

    const temp = rounds[from];
    rounds[from] = rounds[to];
    rounds[to] = temp;

    await updateCurrentTournament({
      ...currentTournament,
      round: rounds,
    });
  } catch (err) {
    console.log("Log error swapTeamPositions request failed", err);
    console.log("failed to swap round positions");
  }
};

export default swapTeamPositions;
