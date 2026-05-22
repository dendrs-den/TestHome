const roundStart = async () => {
  try {
    const response = await fetch("/rounds/start", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.log("Failed to start round");
  }
};

export default roundStart;
