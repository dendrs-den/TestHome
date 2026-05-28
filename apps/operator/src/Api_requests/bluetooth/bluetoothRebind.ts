const bluetoothRebind = async (guid) => {
  try {
    const response = await fetch(`/bluetooth/dropkeys/${guid}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.log("Log error /bluetooth/dropkeys request failed", error);
  }
};

export default bluetoothRebind;
