const sendBust = async (timeStamp = null) => {
  try {
    const response = await fetch(`/actions/sendbust`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        timeStamp
          ? {
              time: timeStamp,
              type: "bust",
              device_type: "terminal",
            }
          : {
              type: "bust",
              device_type: "terminal",
            }
      ),
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.log("Aborted bust");
  }
};

export default sendBust;
