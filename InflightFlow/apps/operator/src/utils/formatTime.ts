const formatTime = (millisecCount: number) => {
  if (millisecCount === 0) return { fullTime: () => "000:000" };
  if (millisecCount < 0) return { fullTime: () => "incorrect format" };

  const minutes = Math.floor(millisecCount / 1000 / 60);
  const seconds = Math.floor(millisecCount / 1000);
  const milliseconds = Math.floor(millisecCount % 1000);

  return {
    minutes: () => formatDisplay(minutes),
    seconds: () => formatDisplay(seconds),
    fullTime: () =>
      `${formatDisplay(seconds)}.${formatDisplayMS(
        milliseconds
      )}`,
  };
};

function formatDisplay(time) {
  if (Number(time) < 10) return `00${time}`;
  if (Number(time) < 100) return `0${time}`;
  return Number(time) < 10 ? `0${time}` : Number(time);
}
function formatFaultInputs(time: string): string {
  if (time.length < 1) return "00";
  if (time.length < 2) return `0${time}`;
  return time;
}
function formatDisplayMS(time) {
  return Number(time) < 10
    ? `00${time}`
    : Number(time) < 100
    ? `0${time}`
    : Number(time);
}

export default formatTime;
export { formatDisplay, formatFaultInputs };
