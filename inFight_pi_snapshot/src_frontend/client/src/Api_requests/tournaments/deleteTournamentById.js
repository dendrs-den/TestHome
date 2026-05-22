import deleteDisciplineById from "../disciplines/deleteDisciplineById";
import deleteStageById from "../stages/deleteStage";
import deleteTeamById from "../teams/deleteTeamById";
import getAllTournaments from "./getAllTournaments";

const deleteTournamentById = async (tourId) => {
  const tours = await getAllTournaments();
  const thisTour = tours.filter((tour) => tour.id === tourId)[0];
  console.log(thisTour);
  for (const { id } of thisTour.teams) {
    await deleteTeamById(id);
    console.count("deletedTeam: ");
  }

  for (const { id } of thisTour.stages) {
    await deleteStageById(id);
    console.count("deletedStage");
  }

  for (const { id } of thisTour.disciplines) {
    await deleteDisciplineById(id);
    console.count("deletedDiscipline");
  }

  const response = await fetch(`/tournaments/delete`, {
    method: "POST",
    body: JSON.stringify({ id: tourId }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("deleted tournament", data);
  return data;
};

export default deleteTournamentById;
