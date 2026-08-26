import { ChakraProvider, createSystem, defaultConfig } from "@chakra-ui/react";
import { render, screen } from "@testing-library/react";
import { publicKey } from "@metaplex-foundation/umi";
import { NFTRevealModal } from "../components/ui/NFTRevealModal";

const system = createSystem(defaultConfig);

describe("NFTRevealModal", () => {
  it("keeps a confirmed mint visible while its metadata is unavailable", () => {
    render(
      <ChakraProvider value={system}>
        <NFTRevealModal
          nfts={[{
            mint: publicKey("11111111111111111111111111111111"),
            offChainMetadata: undefined,
          }]}
          isMinting={false}
          workImage="/placeholder.png"
          onClose={jest.fn()}
        />
      </ChakraProvider>
    );

    expect(screen.getByText("Mint confirmed")).toBeInTheDocument();
    expect(screen.getByText(/metadata is still propagating/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /explorer/i })).toBeInTheDocument();
  });
});
