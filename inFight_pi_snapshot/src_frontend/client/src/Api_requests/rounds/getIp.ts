const getIp = async () => {
  try {
    const response = await fetch("/utils/getIp", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const bodyText = await response.text();
    let data = null;
    try {
      data = bodyText ? JSON.parse(bodyText) : null;
    } catch (_) {
      // Ignore parse errors; handled below with safe fallback.
    }
    if (!response.ok) {
      console.log("getIp request failed:", response.status, data || bodyText);
      return { results: [] };
    }
    return data || { results: [] };
  } catch (err) {
    console.log("getIp request error", err);
    return { results: [] };
  }
};

export default getIp;
