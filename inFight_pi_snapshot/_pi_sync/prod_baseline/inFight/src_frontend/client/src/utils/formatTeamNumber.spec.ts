import formatTeamNumber from "./formatTeamNumber";

describe("FormatTeam number function", () => {
  it("should return correct string", () => {
    expect(formatTeamNumber(10)).toBe("010");
  });
});
