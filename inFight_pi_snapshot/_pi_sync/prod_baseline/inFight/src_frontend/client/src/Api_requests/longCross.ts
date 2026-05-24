const sendLongCross = async () => {
  const response = await fetch("/actions/longcross", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();

  return data;
};

export default sendLongCross;
