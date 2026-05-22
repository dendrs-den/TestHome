const bluetoothDropSetKeys = async (guid: string) => {
  try {
    console.log("dropSetKeys sent deviceMac : ", guid);
    const response = await fetch(`/bluetooth/dropSetkeys/${guid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log("dropSetKeys response: ", data);
    return data;
  } catch (err) {
    console.log("dropSetKeys request failed");
  }
};

export default bluetoothDropSetKeys;
