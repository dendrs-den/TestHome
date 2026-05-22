const getStageById =  async (stageId) => {
  const response = await fetch(`/stages/getbyid/${stageId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  const data = await response.json();
  // console.log('found stage: ', data);

  return data;

}

export default getStageById;