const roundReplay = async () => {
  try {
    const response = await fetch("/rounds/replay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Log error roundReplay request failed", error);
  }
};

export default roundReplay;
