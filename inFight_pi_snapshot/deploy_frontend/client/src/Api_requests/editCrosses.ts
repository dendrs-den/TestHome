const editCrosses = async (crossArray) => {
  try {
    await fetch(`/actions/editCrosses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(crossArray),
    }).then((response) => {
      if (!response.ok) {
        throw new Error("HTTP error" + response.status);
      }
    });

    console.log("Edited crosses array");
  } catch (error) {
    console.log("Log error /actions/editCrosses request failed", error);
  }
};

export default editCrosses;
