const setNextBtn = async (guId: string, type: string) => {
  console.log("awating bust button...");
  try {
    const response = await fetch(`/bluetooth/bind/${guId}/${type}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("binding bust response: ", data);
    return JSON.parse(data);
  } catch (err: any) {
    if (err.name === "AbortError") {
      console.log("Aborted bust! due to timeout");
    } else {
      console.log("Failed to bind bust");
    }
  }
};

export default setNextBtn;
