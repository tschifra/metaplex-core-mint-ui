import { publicKey, type Signer, type Umi } from "@metaplex-foundation/umi";
import { verifyTx } from "../utils/verifyTx";

describe("verifyTx", () => {
  it("confirms through HTTP transaction polling without a WebSocket subscription", async () => {
    const mint = publicKey("11111111111111111111111111111111");
    const getTransaction = jest.fn().mockResolvedValue({
      message: { accounts: [mint] },
      meta: { err: null, logs: [] },
    });
    const confirmTransaction = jest.fn();
    const umi = {
      rpc: { getTransaction, confirmTransaction },
    } as unknown as Umi;
    const signer = { publicKey: mint } as unknown as Signer;

    await expect(
      verifyTx(umi, [new Uint8Array([1, 2, 3])], [signer], "confirmed")
    ).resolves.toEqual([mint]);

    expect(getTransaction).toHaveBeenCalledWith(expect.any(Uint8Array), {
      commitment: "confirmed",
    });
    expect(confirmTransaction).not.toHaveBeenCalled();
  });
});
