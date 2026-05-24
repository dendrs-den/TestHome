const createNewStage = async ({ name, battle }) => {
  const response = await fetch(`/stages/add`, {
    method: "POST",
    body: JSON.stringify({ name: name, battle: battle }),
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();

  return data;
};

export default createNewStage;
