import { RoundInfo } from "../../types/general_types";

const getInfo = async (): Promise<RoundInfo> => {
  try {
    const response = await fetch("/actions/getinfo", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Log error getInfo request failed", error);
  }
};

export default getInfo;
