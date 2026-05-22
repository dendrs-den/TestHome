const getDisciplineById =  async (discId) => {
  const response = await fetch(`/disciplines/getbyid/${discId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  // console.log('found discipline: ', data);

  return data;

}

export default getDisciplineById;