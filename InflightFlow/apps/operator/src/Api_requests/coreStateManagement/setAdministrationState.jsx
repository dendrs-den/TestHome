const setAdministrationState = async () => {
  try {
    const response = await fetch("/actions/setAdministration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("setAdministrationState");
    return data;
  } catch (error) {
    console.log("Log error /actions/setAdministration request failed", error);
  }
};

export default setAdministrationState;
