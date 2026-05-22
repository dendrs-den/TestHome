const formatTeamNumber = (number: number) => {
  if (number > 999) return;

  return `${"0".repeat(4 - `${number}`.length)}${number}`;
};

export default formatTeamNumber;
