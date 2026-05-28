import coreBaseUrl, { operatorJsonHeaders } from "../coreBaseUrl";

const setAdministrationState = async () => {
  try {
    const response = await fetch(`${coreBaseUrl}/actions/setAdministration`, {
      method: "POST",
      headers: operatorJsonHeaders(),
    });

    const data = await response.json();
    console.log("setAdministrationState");
    return data;
  } catch (error) {
    console.log("Log error /actions/setAdministration request failed", error);
  }
};

export default setAdministrationState;
