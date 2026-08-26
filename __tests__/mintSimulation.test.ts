import { mintSimulationCreatedAsset } from "../utils/server/mintSimulationCore";

describe("mint simulation validation", () => {
  it("accepts only a successful simulation that created the requested asset", () => {
    expect(mintSimulationCreatedAsset({
      err: null,
      logs: ["Program success"],
      accounts: [{ data: ["", "base64"] }],
    })).toBe(true);
  });

  it("rejects bot-tax success, runtime errors, and missing assets", () => {
    expect(mintSimulationCreatedAsset({
      err: null,
      logs: ["Candy Guard Botting is taxed at 10000000 lamports"],
      accounts: [null],
    })).toBe(false);
    expect(mintSimulationCreatedAsset({
      err: { InstructionError: [0, "Custom"] },
      accounts: [{ data: ["", "base64"] }],
    })).toBe(false);
    expect(mintSimulationCreatedAsset({ err: null, accounts: [null] }))
      .toBe(false);
  });
});
