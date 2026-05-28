const bluetoothDisconnect = async (deviceMac) => {
  try {
    const response = await fetch(`/bluetooth/disconnect/${deviceMac}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("disconnect client answer:", JSON.parse(data));

    return !JSON.parse(data).status;
  } catch (error) {
    console.log("Log error bluetooth/disconnect request failed", error);
  }
};

export default bluetoothDisconnect;
