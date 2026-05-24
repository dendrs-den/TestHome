const getLightStatus = async (): Promise<{ is_on: boolean } | never> => {
  try {
    const response = await fetch("/actions/getled", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return data;
  } catch (error) {
    console.log("failed to get next cross");
  }
};

export default getLightStatus;
