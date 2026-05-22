const bluetoothRebind = async (guid)=>{
  const response = await fetch(`/bluetooth/dropkeys/${guid}`,{
    method: 'GET',
    headers: {
      'Content-Type':'application/json',
    },
  });
  
    const data = await response.json();
    console.log(data);
    return data;
}

export default bluetoothRebind;