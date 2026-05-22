const roundNext = async () => {
  try {
    const response = await fetch("/rounds/set/next", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.log("Error trying to set next round");
  }
};

export default roundNext;
