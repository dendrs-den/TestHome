const roundStartRemote = async () => {
  try {
    const response = await fetch(`/rounds/activate_remotely`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const parsedResponse = await response.json();

    return parsedResponse;
  } catch (error) {
    console.log("Log error roundStartRemote request failed", error);
    console.log("aborted waiting for remote activation");
    return false;
  }
};
export default roundStartRemote;
