const getLastRound = async () => {
  const response = await fetch("/actions/getLastRound", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  if (data.status) {
    return false;
  }
  return data;
};

export default getLastRound;
