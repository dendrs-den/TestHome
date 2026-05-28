const getAllCrosses = async () => {
  try {
    const response = await fetch(`/actions/getallCrosses`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const data = await response.json();
    return data;
  } catch (err) {
    console.log("Log error /actions/getallCrosses request failed", err);
    console.log("canceled getting all crosses");
    return;
  }
};
export default getAllCrosses;
