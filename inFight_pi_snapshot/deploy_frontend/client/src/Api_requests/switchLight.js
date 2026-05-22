const switchLight = async (is_on) => {
  try {
    const response = await fetch("/actions/switchLED", {
      method: "POST",
      body: JSON.stringify({ is_on }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return data;
  } catch (error) {
    console.log("Log error /actions/switchLED request failed", error);
  }
};

export default switchLight;
