const sendLongCross = async () => {
  try {
    const response = await fetch("/actions/longcross", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return data;
  } catch (error) {
    console.log("Log error /actions/longcross request failed", error);
  }
};

export default sendLongCross;
