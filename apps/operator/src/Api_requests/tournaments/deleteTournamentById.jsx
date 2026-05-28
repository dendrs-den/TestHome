import coreBaseUrl, { operatorJsonHeaders } from "../coreBaseUrl";

const deleteTournamentById = async (tourId) => {
  try {
    const response = await fetch(`${coreBaseUrl}/tournaments/delete`, {
      method: "POST",
      body: JSON.stringify({ id: tourId }),
      headers: operatorJsonHeaders(),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Log error /tournaments/delete request failed", error);
  }
};

export default deleteTournamentById;
