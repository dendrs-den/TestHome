const updateDisciplineInfo = async ({ id, name }) => {
  const response = await fetch(`/disciplines/update`, {
    method: "POST",
    body: JSON.stringify({
      id: id,
      name: name,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  return data;
};

export default updateDisciplineInfo;
