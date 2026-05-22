const getCoreTime = async (): Promise<{ time: number } | never> => {
  const response = await fetch(`/actions/getCoreTime`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();

  return data;
};

export default getCoreTime;
