const getAllFaults = async () => {
  try {
    const response = await fetch(`/actions/getallfaults`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Log error /actions/getallfaults request failed", error);
  }
};

export default getAllFaults;
