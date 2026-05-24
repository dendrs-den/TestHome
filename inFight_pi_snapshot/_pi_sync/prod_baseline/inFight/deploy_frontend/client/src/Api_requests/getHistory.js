const getHistory = async () => {
  try {
    const response = await fetch("/actions/gethistory", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return data;
  } catch (error) {
    console.log("Log error /actions/gethistory request failed", error);
  }
};

export default getHistory;
