const serviceCross = async () => {
  try {
    const response = await fetch("/actions/service/cross", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (err) {
    console.log("Service cross emulation failed");
  }
};

export default serviceCross;
