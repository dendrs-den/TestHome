const getCrossRemote = async (): Promise<{ cross_count: number } | never> => {
  try {
    const response = await fetch(`/actions/getCrossRemote`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Log error /actions/getCrossRemote request failed", error);
    console.log("failed to get next cross");
  }
};

export default getCrossRemote;
