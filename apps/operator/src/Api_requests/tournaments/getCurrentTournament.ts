import coreBaseUrl, { operatorJsonHeaders } from "../coreBaseUrl";

const getCurrentTournament = async () => {
  try {
    const response = await fetch(`${coreBaseUrl}/tournaments/getcurrent`, {
      headers: operatorJsonHeaders(),
    });
    const data = await response.json();

    return data || {};
  } catch (error) {
    console.log("Log error /tournaments/getcurrent request failed", error);
    return {};
  }
};

export default getCurrentTournament;
