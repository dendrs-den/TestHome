const editFaults = async (faultData) => {
  await fetch(`/actions/editfaults`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(faultData),
  }).then((response) => {
    if (!response.ok) {
      throw new Error("HTTP error" + response.status);
    }
  });

  console.log("Edited faults array");
};

export default editFaults;
