import getCurrentTournament from "../tournaments/getCurrentTournament";
import updateCurrentTournament from "../tournaments/updateCurrentTournament";

const roundUpdateTeam = async (roundIndex, teamId) => {
  try {
    const currentTournament = await getCurrentTournament();
    const teams = Array.isArray(currentTournament?.teams) ? currentTournament.teams : [];
    const rounds = Array.isArray(currentTournament?.round) ? [...currentTournament.round] : [];
    const nextTeam = teams.find((team) => team?.id === teamId);

    if (!nextTeam || !rounds[roundIndex]) {
      return;
    }

    rounds[roundIndex] = {
      ...rounds[roundIndex],
      id:
        rounds[roundIndex].id ||
        `round-${rounds[roundIndex]?.stage?.id || "stage"}-${nextTeam.id || roundIndex}`,
      team: nextTeam,
    };

    await updateCurrentTournament({
      ...currentTournament,
      round: rounds,
    });
  } catch (err) {
    console.log("Log error roundUpdateTeam request failed", err);
    console.log("failed to update round team");
  }
};

export default roundUpdateTeam;
