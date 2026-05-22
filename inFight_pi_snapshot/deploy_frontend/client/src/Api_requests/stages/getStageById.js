const getStageById = async (stageId) => {
  try {
    const response = await fetch(`/stages/getbyid/${stageId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    // console.log('found stage: ', data);

    return data;
  } catch (error) {
    console.log("Log error /stages/getbyid request failed", error);
  }
};

export default getStageById;