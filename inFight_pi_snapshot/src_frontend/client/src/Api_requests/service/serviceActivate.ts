const serviceActivate = async () => {
  try {
    const response = await fetch("/actions/service/activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    return await response.json();
  } catch (err) {
    console.log("Service activate failed");
  }
};

export default serviceActivate;
