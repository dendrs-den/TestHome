const updateStageInfo = async ({ id, name, battle }) => {
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
};

export default updateStageInfo;
