const waitCrossed = async () => {
  try {
    const response = await fetch("/rounds/waitcrossing", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    if (error.response) {
      console.log(error.response?.data);
    }
  }
};

export default waitCrossed;
