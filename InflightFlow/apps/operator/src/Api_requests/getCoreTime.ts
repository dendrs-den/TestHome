const getCoreTime = async (): Promise<{ time: number } | never> => {
  try {
    const response = await fetch(`/actions/getCoreTime`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    return data;
  } catch (error) {
    console.log("Log error /actions/getCoreTime request failed", error);
  }
};

export default getCoreTime;
