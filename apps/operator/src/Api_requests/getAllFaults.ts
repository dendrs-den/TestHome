import coreBaseUrl, { operatorJsonHeaders } from "./coreBaseUrl";

const getAllFaults = async () => {
  try {
    const response = await fetch(`${coreBaseUrl}/actions/getallfaults`, {
      method: "GET",
      headers: operatorJsonHeaders(),
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Log error /actions/getallfaults request failed", error);
  }
};

export default getAllFaults;
