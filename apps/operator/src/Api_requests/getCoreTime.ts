const getCoreTime = async (): Promise<{ time: number } | never> => {
  return { time: Date.now() };
};

export default getCoreTime;
