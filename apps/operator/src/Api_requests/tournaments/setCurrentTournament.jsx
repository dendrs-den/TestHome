import coreBaseUrl, { operatorJsonHeaders } from "../coreBaseUrl";

const setCurrentTournamentById = async (tourId) => {
  try {
    const response = await fetch(`${coreBaseUrl}/tournaments/current`, {
      method: "POST",
      body: JSON.stringify({ id: tourId }),
      headers: operatorJsonHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Log error /tournaments/current request failed", error);
  }
};

export default setCurrentTournamentById;
