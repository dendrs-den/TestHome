// const sendSkip = async (timeStamp)=>{
const sendSkip = async (timeStamp = null) => {
  try {
    const response = await fetch(`/actions/sendskip`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        timeStamp
          ? {
              time: timeStamp,
              type: "skip",
              device_type: "terminal",
            }
          : {
              type: "skip",
              device_type: "terminal",
            },
      ),
    });

    const data = await response.json();
    return data;
  } catch (err) {
    console.log("Log error /actions/sendskip request failed", err);
    console.log("aborted skip");
  }
};

export default sendSkip;
