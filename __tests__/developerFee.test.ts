import {
  DEVELOPER_FEE_LAMPORTS,
  DEVELOPER_FEE_RECIPIENT,
  DEVELOPER_FEE_SOL,
  getDeveloperFeeLamports,
  getDeveloperFeeSol,
  isDeveloperFeeEnabled,
} from "../utils/developerFee";

describe("developer fee configuration", () => {
  const original = process.env.NEXT_PUBLIC_DEVELOPER_FEE_ENABLED;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_DEVELOPER_FEE_ENABLED;
    else process.env.NEXT_PUBLIC_DEVELOPER_FEE_ENABLED = original;
  });

  it("includes the fixed fee when enabled", () => {
    process.env.NEXT_PUBLIC_DEVELOPER_FEE_ENABLED = "true";
    expect(isDeveloperFeeEnabled()).toBe(true);
    expect(getDeveloperFeeLamports()).toBe(BigInt(DEVELOPER_FEE_LAMPORTS));
    expect(getDeveloperFeeSol()).toBe(DEVELOPER_FEE_SOL);
  });

  it("uses the documented project support wallet", () => {
    expect(DEVELOPER_FEE_RECIPIENT).toBe(
      "E4jpuwa7ppY2hmF2RWcfYrQ2FAXfLeVwPVGZZJVq9sk5"
    );
  });

  it("returns zero when disabled", () => {
    process.env.NEXT_PUBLIC_DEVELOPER_FEE_ENABLED = "false";
    expect(isDeveloperFeeEnabled()).toBe(false);
    expect(getDeveloperFeeLamports()).toBe(BigInt(0));
    expect(getDeveloperFeeSol()).toBe(0);
  });
});
