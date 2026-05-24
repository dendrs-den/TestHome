const setAdministrationState = async () => {
  const response = await fetch(`/actions/setadministration`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  await response.json();
};

export default setAdministrationState;
