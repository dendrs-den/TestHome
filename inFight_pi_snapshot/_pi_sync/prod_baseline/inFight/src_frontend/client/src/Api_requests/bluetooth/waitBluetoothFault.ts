const waitBluetoothFault = async ()=>{
  try{
    console.log('waiting for bluetooth fault');
    const response = await fetch('/bluetooth/waitfault', {
      method:'GET',
      headers: {
        'Content-Type':'application/json',
      },
    }) 
  
    const data = await response.json();
    console.log("recieved a bluetooth fault: ", data);
    return data;
  } catch (err) {
    console.log('waiting for bluetooth fault aborted');
  }
  
}

export default waitBluetoothFault;