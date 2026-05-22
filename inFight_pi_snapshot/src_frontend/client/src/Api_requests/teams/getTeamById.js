const getTeamById =  async (teamId) => {

  try{

    const response = await fetch(`/teams/getbyid/${teamId}`, {
      
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    const data = await response.json();
    // console.log('found team: ', data);
    
    return data;
  } catch(err){
    console.log('failed to load team');
  }

}

export default getTeamById;