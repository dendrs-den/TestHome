const createNewStage = async ({ name, battle }) => {
  try {
    const response = await fetch(`/stages/add`, {
      method: "POST",
      body: JSON.stringify({ name: name, battle: battle }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    return data;
  } catch (error) {
    console.log("Log error /stages/add request failed", error);
  }
};

export default createNewStage;
