const deleteTeamById = async (teamId) => {

  const response = await fetch(`/teams/delete`, {
    method:'POST',
    body: JSON.stringify({id: teamId}),
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  
  const data = await response.json();
  return data;

}

export default deleteTeamById;