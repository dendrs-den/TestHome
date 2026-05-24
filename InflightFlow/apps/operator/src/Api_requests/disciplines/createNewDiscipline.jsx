const createNewDiscipline = async ({ name }) => {
  try {
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
  } catch (error) {
    console.log("Log error /disciplines/add request failed", error);
  }
};

export default createNewDiscipline;
