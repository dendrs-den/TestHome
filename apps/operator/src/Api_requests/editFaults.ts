const editFaults = async (faultData) => {
  try {
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
  } catch (error) {
    console.log("Log error /actions/editfaults request failed", error);
  }
};

export default editFaults;
