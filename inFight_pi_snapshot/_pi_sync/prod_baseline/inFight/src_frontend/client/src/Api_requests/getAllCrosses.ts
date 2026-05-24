const getAllCrosses = async () => {
  const response = await fetch(`/actions/getallCrosses`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  return data;
};
export default getAllCrosses;
