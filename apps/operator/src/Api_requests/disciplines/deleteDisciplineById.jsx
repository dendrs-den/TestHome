const deleteDisciplineById = async (discId) => {
  try {
    const response = await fetch(`/disciplines/delete`, {
      method: "POST",
      body: JSON.stringify({ id: discId }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return data;
  } catch (error) {
    console.log("Log error /disciplines/delete request failed", error);
  }
};

export default deleteDisciplineById;
