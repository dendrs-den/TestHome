const setPrepareState = async () => {
  try {
    const response = await fetch(`/actions/setPrepare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();

    console.log("set state PREPARE ", data);
  } catch (err) {
    console.log("An error during setPrepare:", err);
  }
};

export default setPrepareState;
