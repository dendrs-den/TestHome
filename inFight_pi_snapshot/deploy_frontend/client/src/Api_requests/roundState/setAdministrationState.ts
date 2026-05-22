const setAdministrationState = async () => {
  try {
    const response = await fetch(`/actions/setadministration`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    await response.json();
  } catch (error) {
    console.log("Log error /actions/setadministration request failed", error);
  }
};

export default setAdministrationState;
