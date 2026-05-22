const getIp = async () => {
  try {
    const response = await fetch("/utils/getIp", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.log("Log error roundNext request failed", err);
    console.log("Error trying to set next round");
  }
};

export default getIp;
