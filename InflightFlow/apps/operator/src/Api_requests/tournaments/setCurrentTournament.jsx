import coreBaseUrl from "../coreBaseUrl";

const setCurrentTournamentById = async (tourId) => {
  try {
    const response = await fetch(`${coreBaseUrl}/tournaments/current`, {
      method: "POST",
      body: JSON.stringify({ id: tourId }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Log error /tournaments/current request failed", error);
  }
};

export default setCurrentTournamentById;
