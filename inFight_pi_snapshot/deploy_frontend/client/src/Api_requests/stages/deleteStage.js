const deleteStageById = async (stageId) => {
  try {
    const response = await fetch(`/stages/delete`, {
      method: "POST",
      body: JSON.stringify({ id: stageId }),
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    return data;
  } catch (error) {
    console.log("Log error /stages/delete request failed", error);
  }
};

export default deleteStageById;
