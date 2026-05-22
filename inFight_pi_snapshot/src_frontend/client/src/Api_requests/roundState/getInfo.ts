import { RoundInfo } from "../../types/general_types";

const getInfo = async (): Promise<RoundInfo> => {
  const response = await fetch("/actions/getinfo", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  return data;
};

export default getInfo;
