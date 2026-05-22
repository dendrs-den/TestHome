const bluetoothConnect = async (deviceMac: string) => {
  try {
    const response = await fetch(`/bluetooth/connect/${deviceMac}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("connect client answer:", JSON.parse(data));

    return JSON.parse(data).status;
  } catch (error) {
    console.log("Log error bluetooth/connec request failed", error);
  }
};

export default bluetoothConnect;
