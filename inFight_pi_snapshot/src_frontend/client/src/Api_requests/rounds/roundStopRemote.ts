type Response = {
  status?: string;
  result?: {
    act_time: number;
    result_time: string;
  };
};

const roundStopRemote = async (): Promise<Response | never> => {
  try {
    const response = await fetch(`/rounds/stop_remotely`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.status === 500) {
      const parsedResponse = await response.json();
      console.log("STATUS 500", parsedResponse);
    }
    const parsedResponse = await response.json();
    console.log(parsedResponse);

    return parsedResponse;
  } catch (error) {
    console.log("error waiting for remote stop");
    return error;
  }
};

export default roundStopRemote;
