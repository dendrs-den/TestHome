const deleteDisciplineById = async (discId) => {
  const response = await fetch(`/disciplines/delete`, {
    method: "POST",
    body: JSON.stringify({ id: discId }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  return data;
};

export default deleteDisciplineById;
