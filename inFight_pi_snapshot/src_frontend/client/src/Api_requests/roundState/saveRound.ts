const saveRound = async ()=>{

  try{

    const response = await fetch(`/actions/saveround`, {
      method:'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    console.log('round saved', data);
  } catch (err){
    console.log('Failed to save round');
  }
}

export default saveRound;