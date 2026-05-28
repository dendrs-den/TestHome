const updateStageInfo = async ({ id, name, battle }) => {
  try {
    const response = await fetch(`/stages/update`, {
      method: "POST",
      body: JSON.stringify({
        id: id,
        name: name,
        battle: battle === "Yes" ? true : false,
      }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Log error /stages/update request failed", error);
  }
};

export default updateStageInfo;
