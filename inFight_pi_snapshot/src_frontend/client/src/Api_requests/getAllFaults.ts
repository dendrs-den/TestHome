const getAllFaults = async () => {
  const response = await fetch(`/actions/getallfaults`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data;
};

export default getAllFaults;
