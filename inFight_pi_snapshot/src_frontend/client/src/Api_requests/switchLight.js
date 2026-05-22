const switchLight = async (is_on) => {
  const response = await fetch("/actions/switchLED", {
    method: "POST",
    body: JSON.stringify({ is_on }),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  return data;
};

export default switchLight;
