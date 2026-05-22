const getDisciplineById = async (discId) => {
  try {
    const response = await fetch(`/disciplines/getbyid/${discId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    // console.log('found discipline: ', data);

    return data;
  } catch (error) {
    console.log("Log error /disciplines/getbyid request failed", error);
  }
};

export default getDisciplineById;
