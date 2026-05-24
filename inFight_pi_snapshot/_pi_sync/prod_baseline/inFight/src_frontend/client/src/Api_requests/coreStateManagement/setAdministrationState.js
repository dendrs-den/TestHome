const setAdministrationState = async () => {
  const response = await fetch("/actions/setAdministration", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  console.log("setAdministrationState");
  return data;
};

export default setAdministrationState;
