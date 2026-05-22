const deleteStageById = async (stageId) => {
  const response = await fetch(`/stages/delete`, {
    method: "POST",
    body: JSON.stringify({ id: stageId }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();

  return data;
};

export default deleteStageById;
