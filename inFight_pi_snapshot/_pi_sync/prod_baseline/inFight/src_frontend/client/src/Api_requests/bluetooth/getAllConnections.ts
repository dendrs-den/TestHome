const getAllBluetoothConnections = async () => {
  try {
    const response = await fetch("/bluetooth/getall", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const parsedData = typeof data === "string" ? JSON.parse(data) : data;
    console.log("All devices :", parsedData);
    return parsedData;
  } catch (err) {
    console.log("failed loading bluetooth devices list", err);
    return {
      bluetoothDevices: [],
      connectedDevices: [],
      maps: [],
    };
  }
};

export default getAllBluetoothConnections;
