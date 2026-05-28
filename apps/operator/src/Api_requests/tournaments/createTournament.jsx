import coreBaseUrl, { operatorJsonHeaders } from "../coreBaseUrl";

const createTournament = async (tourParams) => {
  try {
    const response = await fetch(`${coreBaseUrl}/tournaments/add`, {
      method: "POST",
      body: JSON.stringify(tourParams),
      headers: operatorJsonHeaders(),
    });

    const data = await response.json();
    console.log("created tournament: ", data);
    return data;
  } catch (error) {
    console.log("Log error /tournaments/add request failed", error);
  }
};

export default createTournament;
