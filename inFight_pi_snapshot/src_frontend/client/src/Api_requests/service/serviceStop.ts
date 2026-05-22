const serviceStop = async () => {
  try {
    const response = await fetch("/actions/service/stop", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (err) {
    console.log("Service stop failed");
    return { err };
  }
};

export default serviceStop;
