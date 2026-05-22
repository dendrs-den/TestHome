const getHistory = async () => {
  try {
    const response = await fetch("/actions/gethistory", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.log("failed to load history", error);
    return [];
  }
};

export default getHistory;
