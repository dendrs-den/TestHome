const getCurrentState = async () => {
  const response = await fetch(`/actions/getstate`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data.state;
};

export default getCurrentState;
