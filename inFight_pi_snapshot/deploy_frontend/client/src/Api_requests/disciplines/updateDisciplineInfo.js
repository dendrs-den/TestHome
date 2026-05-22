const updateDisciplineInfo = async ({ id, name }) => {
  try {
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
  } catch (error) {
    console.log("Log error /disciplines/update request failed", error);
  }
};

export default updateDisciplineInfo;
