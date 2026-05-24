const roundStartRemoteCross = async () => {
  try {
    const response = await fetch(`/rounds/first_cross_remotely`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("remote cross event: ", data);
    return data;
  } catch (error) {
    console.log("Log error roundStartRemoteCross request failed", error);
    console.log("waiting for bluetooth crossing aborted", error);
  }
};
export default roundStartRemoteCross;
