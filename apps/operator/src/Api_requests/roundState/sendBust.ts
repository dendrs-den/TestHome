import coreBaseUrl, { operatorJsonHeaders } from "../coreBaseUrl";

const sendBust = async (timeStamp = null) => {
  try {
    const response = await fetch(`${coreBaseUrl}/actions/sendbust`, {
      method: "POST",
      headers: operatorJsonHeaders(),
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
            },
      ),
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.log("Log error /actions/sendbust request failed", err);
    console.log("Aborted bust");
  }
};

export default sendBust;
