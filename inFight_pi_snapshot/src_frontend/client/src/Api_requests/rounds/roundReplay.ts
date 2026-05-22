const roundReplay = async () => {
  const response = await fetch("/rounds/replay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  return data;
};

export default roundReplay;
