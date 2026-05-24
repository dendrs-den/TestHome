const roundStop = async () => {
  try {
    const response = await fetch("/rounds/end", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.log("set STOP aborted");
    return { err };
  }
};

export default roundStop;
