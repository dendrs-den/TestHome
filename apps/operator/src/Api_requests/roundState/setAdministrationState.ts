import coreBaseUrl, { operatorJsonHeaders } from "../coreBaseUrl";

const setAdministrationState = async () => {
  try {
    const response = await fetch(`${coreBaseUrl}/actions/setadministration`, {
      method: "POST",
      headers: operatorJsonHeaders(),
    });
    await response.json();
  } catch (error) {
    console.log("Log error /actions/setadministration request failed", error);
  }
};

export default setAdministrationState;
