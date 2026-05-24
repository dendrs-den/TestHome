const getAllBluetoothConnections = async () => {
  try {
    const response = await fetch("/bluetooth/getall", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("All devices :", JSON.parse(data));
    return JSON.parse(data);
  } catch (err) {
    console.log("Log error /bluetooth/getall request failed", err);
    console.log("failed loading bluetooth devices list");
  }
};

export default getAllBluetoothConnections;
