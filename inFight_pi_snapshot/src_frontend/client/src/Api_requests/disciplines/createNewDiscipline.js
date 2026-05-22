const createNewDiscipline = async ({ name }) => {
  const response = await fetch(`/disciplines/add`, {
    method: "POST",
    body: JSON.stringify({ name: name }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  console.log(" created discipline ", data);
  return data;
};

export default createNewDiscipline;
