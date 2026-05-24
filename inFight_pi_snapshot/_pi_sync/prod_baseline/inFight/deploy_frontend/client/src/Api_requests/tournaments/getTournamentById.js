import getAllTournaments from "./getAllTournaments";

const getTournamentById = async (tourId) => {
  try {
    const tours = await getAllTournaments();

    return tours.filter((tour) => tour.id === tourId)[0];
  } catch (err) {
    console.log("Log error /tournaments/getall request failed", err);
    console.log(err);
  }
};

export default getTournamentById;
