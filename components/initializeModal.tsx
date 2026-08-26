import { createLutForCandyMachineAndGuard } from "../utils/createLutForCandyGuard";
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Input,
  Separator,
} from "@chakra-ui/react";
import {
  Umi,
  publicKey,
  some,
  transactionBuilder,
} from "@metaplex-foundation/umi";
import {
  setComputeUnitPrice,
  setComputeUnitLimit,
} from "@metaplex-foundation/mpl-toolbox";
import { useEffect, useState } from "react";
import { allowLists } from "@/allowlist";
import { getRequiredCU } from "@/utils/mintHelper";
import {
  CandyGuard,
  CandyMachine,
  getMerkleRoot,
  route,
  updateCandyGuard,
} from "@metaplex-foundation/mpl-core-candy-machine";
import { buildDualPricingConfig } from "../utils/dualPricing";
import { parsePriorityFeeMicroLamports } from "../utils/mintUiConfig";

import { toaster } from "../utils/toaster";

// Update candy guard with dual pricing
const updateDualPricing = async (
  umi: Umi,
  candyGuard: CandyGuard,
  publicPrice: number,
  holderPrice: number,
  discountTokenMint: string,
  treasuryAddressStr: string,
  isNftCollection: boolean,
  setLoading: (loading: boolean) => void,
  setStatus: (status: string) => void
) => {
  setLoading(true);
  setStatus("🔄 Updating candy guard...");

  try {
    // Validate inputs
    if (publicPrice <= 0 || holderPrice <= 0) {
      throw new Error("Prices must be greater than 0");
    }
    if (holderPrice >= publicPrice) {
      throw new Error("Holder price should be less than public price");
    }
    // Validate Solana address format (base58, 32-44 chars)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!discountTokenMint || !base58Regex.test(discountTokenMint)) {
      throw new Error("Invalid token/collection address format");
    }
    if (!treasuryAddressStr || !base58Regex.test(treasuryAddressStr)) {
      throw new Error("Invalid treasury address format - this is where mint payments go!");
    }

    const treasury = publicKey(treasuryAddressStr);
    const tokenMint = publicKey(discountTokenMint);

    const updatedConfig = buildDualPricingConfig(
      candyGuard,
      publicPrice,
      holderPrice,
      tokenMint,
      treasury,
      isNftCollection
    );

    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Update the on-chain Candy Guard prices? Existing unrelated guards and groups will be preserved."
      )
    ) {
      setStatus("Cancelled");
      return;
    }

    // Build the update transaction
    let builder = transactionBuilder().add(
      updateCandyGuard(umi, {
        candyGuard: candyGuard.publicKey,
        guards: updatedConfig.guards,
        groups: updatedConfig.groups,
      })
    );

    // Add priority fee
    builder = builder.prepend(
      setComputeUnitPrice(umi, {
        microLamports: parsePriorityFeeMicroLamports(),
      })
    );

    const latestBlockhash = (await umi.rpc.getLatestBlockhash()).blockhash;
    builder = builder.setBlockhash(latestBlockhash);

    const requiredCu = await getRequiredCU(umi, builder.build(umi));
    builder = builder.prepend(setComputeUnitLimit(umi, { units: requiredCu }));

    await builder.sendAndConfirm(umi, {
      confirm: { commitment: "finalized" },
      send: { skipPreflight: false },
    });

    setStatus("✅ Dual pricing configured successfully! Reloading...");
    toaster.create({
      title: "✅ Dual Pricing Set!",
      description: `Holders: ${holderPrice} SOL | Public: ${publicPrice} SOL. Page will reload to apply changes.`,
      type: "success",
      duration: 3000,
    });
    // Reload to fetch updated candy guard from on-chain
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    setStatus(`❌ Failed: ${errorMsg}`);
    toaster.create({
      title: "❌ Failed to update pricing",
      description: errorMsg,
      type: "error",
      duration: 10000,
    });
  } finally {
    setLoading(false);
  }
};

// new function createLUT that is called when the button is clicked and which calls createLutForCandyMachineAndGuard and returns a success toast
const createLut =
  (
    umi: Umi,
    candyMachine: CandyMachine,
    candyGuard: CandyGuard,
    recentSlot: number,
    onLutCreated: (address: string) => void
  ) =>
  async () => {
    const [initialBuilder, AddressLookupTableInput] =
      await createLutForCandyMachineAndGuard(
        umi,
        recentSlot,
        candyMachine,
        candyGuard
      );
    let builder = initialBuilder;
    try {
      const latestBlockhash = (await umi.rpc.getLatestBlockhash()).blockhash;
      builder = builder.setBlockhash(latestBlockhash);

      builder = builder.prepend(
        setComputeUnitPrice(umi, {
          microLamports: parsePriorityFeeMicroLamports(),
        })
      );
      const requiredCu = await getRequiredCU(umi, builder.build(umi));
      builder = builder.prepend(
        setComputeUnitLimit(umi, { units: requiredCu })
      );
      await builder.sendAndConfirm(umi, {
        confirm: { commitment: "processed" },
        send: {
          skipPreflight: false,
        },
      });

      const lutAddress = AddressLookupTableInput.publicKey.toString();

      // Update state with newly created LUT
      onLutCreated(lutAddress);

      // Show success toast
      toaster.create({
        title: "✅ LUT Created Successfully!",
        description: `LUT Address: ${lutAddress}\n\nSet this deployment variable and redeploy:\nNEXT_PUBLIC_LUT=${lutAddress}`,
        type: "success",
        duration: 20000, // 20 seconds so user can copy
      });

      // Also log to console for easy copying
    } catch (e) {
      toaster.create({
        title: "❌ LUT Creation Failed!",
        description: `Error: ${e}`,
        type: "error",
        duration: 10000,
      });
    }
  };

const initializeGuards =
  (umi: Umi, candyMachine: CandyMachine, candyGuard: CandyGuard, onStatusUpdate: (status: string) => void, setLoading: (loading: boolean) => void) =>
  async () => {
    setLoading(true);

    if (!candyGuard.groups) {
      onStatusUpdate("No guard groups found");
      toaster.create({
        title: "No guard groups found",
        type: "info",
        duration: 5000,
      });
      setLoading(false);
      return;
    }

    onStatusUpdate("🔄 Initializing guards...");

    for (const group of candyGuard.groups) {
      let builder = transactionBuilder();
      if (
        group.guards.freezeSolPayment.__option === "Some" ||
        group.guards.freezeTokenPayment.__option === "Some"
      ) {
        toaster.create({
          title: "FreezeSolPayment!",
          description: `Make sure that you ran sugar freeze initialize!`,
          type: "info",
          duration: 9000,
        });
      }
      if (group.guards.allocation.__option === "Some") {
        builder = builder.add(
          route(umi, {
            guard: "allocation",
            candyMachine: candyMachine.publicKey,
            candyGuard: candyMachine.mintAuthority,
            group: some(group.label),
            routeArgs: {
              candyGuardAuthority: umi.identity,
              id: group.guards.allocation.value.id,
            },
          })
        );
      }
      if (builder.items.length > 0) {
        try {
          builder = builder.prepend(
            setComputeUnitPrice(umi, {
              microLamports: parsePriorityFeeMicroLamports(),
            })
          );
          const latestBlockhash = (await umi.rpc.getLatestBlockhash()).blockhash;
          builder = builder.setBlockhash(latestBlockhash);
          const requiredCu = await getRequiredCU(umi, builder.build(umi));
          builder = builder.prepend(
            setComputeUnitLimit(umi, { units: requiredCu })
          );
          await builder.sendAndConfirm(umi, {
            confirm: { commitment: "processed" },
            send: {
              skipPreflight: false,
            },
          });
          onStatusUpdate(`✅ Routes for ${group.label} created successfully!`);
          toaster.create({
            title: `✅ Routes for ${group.label} created successfully!`,
            type: "success",
            duration: 9000,
          });
        } catch (e) {
          onStatusUpdate(`❌ Failed to create routes for ${group.label}`);
          toaster.create({
            title: `❌ Failed to create routes for ${group.label}`,
            description: `Error: ${e}`,
            type: "error",
            duration: 9000,
          });
        }
      } else {
        onStatusUpdate(`ℹ️ Nothing to create for group ${group.label}`);
        toaster.create({
          title: `ℹ️ Nothing to create for group ${group.label}`,
          type: "info",
          duration: 9000,
        });
      }
    }

    setLoading(false);
  };


type Props = {
  umi: Umi;
  candyMachine: CandyMachine;
  candyGuard: CandyGuard | undefined;
};

export const InitializeModal = ({ umi, candyMachine, candyGuard }: Props) => {
  const [recentSlot, setRecentSlot] = useState<number>(0);
  const [newlyCreatedLut, setNewlyCreatedLut] = useState<string>("");
  const [guardStatus, setGuardStatus] = useState<string>("");
  const [isInitializingGuards, setIsInitializingGuards] = useState<boolean>(false);

  // Dual pricing state
  const [publicPrice, setPublicPrice] = useState<string>("0.3");
  const [holderPrice, setHolderPrice] = useState<string>("0.2");
  const [discountTokenMint, setDiscountTokenMint] = useState<string>("");
  const [treasuryAddress, setTreasuryAddress] = useState<string>("");
  const [isNftCollection, setIsNftCollection] = useState<boolean>(true);
  const [isUpdatingPricing, setIsUpdatingPricing] = useState<boolean>(false);
  const [pricingStatus, setPricingStatus] = useState<string>("");

  useEffect(() => {
    (async () => {
      setRecentSlot(await umi.rpc.getSlot());
    })();
  }, [umi]);

  if (!candyGuard) {
    return (
      <VStack gap={4} align="stretch" p={2}>
        <Text color="red.600" fontWeight="bold">⚠️ No Candy Guard Found!</Text>
        <Text color="rgba(255, 255, 255, 0.8)" fontSize="sm">
          Create and wrap a Core Candy Machine before using this admin panel.
          See CANDY_MACHINE_SETUP.md for the required on-chain setup.
        </Text>
      </VStack>
    );
  }

  //key value object with label and roots
  const roots = new Map<string, string>();

  allowLists.forEach((value, key) => {
    const root = Array.from(getMerkleRoot(value))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    if (!roots.has(key)) {
      roots.set(key, root);
    }
  });

  //put each root into a <Text> element
  const rootElements = Array.from(roots).map(([key, value]) => {
    return (
      <Box key={key}>
        <Text fontWeight="semibold" color="white" key={key}>
          {key}:
        </Text>
        <Text color="rgba(255, 255, 255, 0.7)" fontSize="sm" wordBreak="break-all">{value}</Text>
      </Box>
    );
  });
  // Check whether the deployment has a compiled LUT value.
  const currentLUT = process.env.NEXT_PUBLIC_LUT;

  return (
    <>
      <VStack gap={4} align="stretch" p={2}>
        {/* Deployment configuration is read-only at runtime. */}
        <Box
          p={4}
          bg="rgba(59, 130, 246, 0.1)"
          borderRadius="12px"
          border="1px solid rgba(59, 130, 246, 0.3)"
        >
          <VStack gap={3} align="stretch">
            <Text fontWeight="bold" color="white" fontSize="lg">
              🌐 Deployment Configuration
            </Text>
            <Box
              p={3}
              bg="rgba(34, 197, 94, 0.08)"
              border="1px solid rgba(34, 197, 94, 0.25)"
              borderRadius="8px"
            >
              <Text color="rgba(255, 255, 255, 0.85)" fontSize="xs" fontWeight="600">
                🔒 RPC credentials are server-managed
              </Text>
              <Text color="rgba(255, 255, 255, 0.55)" fontSize="xs" mt={1}>
                Network, Candy Machine and RPC are deployment settings. Browser requests use the rate-limited same-origin /api/rpc proxy.
              </Text>
            </Box>
            <Box>
              <Text color="rgba(255, 255, 255, 0.8)" fontSize="xs" mb={1}>
                🍬 Candy Machine
              </Text>
              <Text color="white" fontSize="xs" fontFamily="mono" wordBreak="break-all">
                {process.env.NEXT_PUBLIC_CANDY_MACHINE_ID || "Not configured"}
              </Text>
            </Box>
          </VStack>
        </Box>

        <Separator borderColor="rgba(59, 130, 246, 0.3)" />

        {/* Show current LUT if exists */}
        {currentLUT && (
          <Box
            p={3}
            bg="rgba(78, 205, 196, 0.1)"
            borderRadius="8px"
            border="1px solid"
            borderColor="rgba(78, 205, 196, 0.3)"
          >
            <Text fontWeight="bold" color="white" fontSize="sm" mb={1}>
              ℹ️ Current LUT Configured:
            </Text>
            <Text color="rgba(255, 255, 255, 0.8)" fontSize="xs" fontFamily="mono" wordBreak="break-all">
              {currentLUT}
            </Text>
          </Box>
        )}

        {/* Show newly created LUT */}
        {newlyCreatedLut && (
          <Box
            p={3}
            bg="rgba(102, 126, 234, 0.15)"
            borderRadius="8px"
            border="2px solid"
            borderColor="rgba(102, 126, 234, 0.5)"
            boxShadow="0 0 20px rgba(102, 126, 234, 0.3)"
          >
            <Text fontWeight="bold" color="white" fontSize="sm" mb={1}>
              🎉 New LUT Created:
            </Text>
            <Text color="rgba(255, 255, 255, 0.9)" fontSize="xs" fontFamily="mono" wordBreak="break-all" mb={2}>
              {newlyCreatedLut}
            </Text>
            <Text color="rgba(255, 255, 255, 0.7)" fontSize="xs" fontStyle="italic">
              Set NEXT_PUBLIC_LUT in Vercel (or the local environment) and redeploy
            </Text>
          </Box>
        )}

        <VStack align="stretch" gap={2}>
          <Button
            onClick={createLut(umi, candyMachine, candyGuard, recentSlot, setNewlyCreatedLut)}
            bg="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
            color="white"
            borderRadius="12px"
            fontWeight="bold"
            _hover={{
              transform: "translateY(-2px)",
              boxShadow: "0 8px 24px rgba(102, 126, 234, 0.4)"
            }}
            _active={{ transform: "translateY(0px)" }}
            transition="all 0.3s ease"
          >
            Create LUT
          </Button>
          <Text color="rgba(255, 255, 255, 0.8)" fontSize="sm">Reduces transaction size errors. Address will appear above.</Text>
        </VStack>

        <VStack align="stretch" gap={2}>
          <Button
            onClick={initializeGuards(umi, candyMachine, candyGuard, setGuardStatus, setIsInitializingGuards)}
            bg="linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)"
            color="white"
            borderRadius="12px"
            fontWeight="bold"
            loading={isInitializingGuards}
            disabled={isInitializingGuards}
            _hover={{
              transform: !isInitializingGuards ? "translateY(-2px)" : "none",
              boxShadow: "0 8px 24px rgba(78, 205, 196, 0.4)"
            }}
            _active={{ transform: "translateY(0px)" }}
            transition="all 0.3s ease"
          >
            {isInitializingGuards ? "Initializing..." : "Initialize Guards"}
          </Button>
          <Text color="rgba(255, 255, 255, 0.8)" fontSize="sm">Required for some guards. Check status below after clicking.</Text>
          {guardStatus && (
            <Box
              p={2}
              bg="rgba(78, 205, 196, 0.15)"
              borderRadius="8px"
              border="1px solid"
              borderColor="rgba(78, 205, 196, 0.3)"
            >
              <Text color="white" fontSize="sm">
                {guardStatus}
              </Text>
            </Box>
          )}
        </VStack>

        <Separator my={4} borderColor="rgba(139, 92, 246, 0.3)" />

        {/* Dual Pricing Section */}
        <Box
          p={4}
          bg="rgba(139, 92, 246, 0.1)"
          borderRadius="12px"
          border="1px solid rgba(139, 92, 246, 0.3)"
        >
          <Text fontWeight="bold" color="white" fontSize="lg" mb={3}>
            🎫 Dual Price Setup
          </Text>
          <Text color="rgba(255, 255, 255, 0.7)" fontSize="sm" mb={4}>
            Set different prices for token/NFT holders vs public.
          </Text>

          <VStack gap={3} align="stretch">
            {/* Price inputs */}
            <HStack gap={3}>
              <Box flex={1}>
                <Text color="rgba(255, 255, 255, 0.8)" fontSize="xs" mb={1}>
                  Public Price (SOL)
                </Text>
                <Input
                  type="number"
                  step="0.01"
                  value={publicPrice}
                  onChange={(e) => setPublicPrice(e.target.value)}
                  placeholder="0.3"
                  bg="rgba(0, 0, 0, 0.3)"
                  border="1px solid rgba(255, 255, 255, 0.2)"
                  borderRadius="8px"
                  color="white"
                  _placeholder={{ color: "rgba(255, 255, 255, 0.4)" }}
                  _focus={{ borderColor: "#8b5cf6", boxShadow: "0 0 0 1px #8b5cf6" }}
                />
              </Box>
              <Box flex={1}>
                <Text color="rgba(255, 255, 255, 0.8)" fontSize="xs" mb={1}>
                  Holder Price (SOL)
                </Text>
                <Input
                  type="number"
                  step="0.01"
                  value={holderPrice}
                  onChange={(e) => setHolderPrice(e.target.value)}
                  placeholder="0.2"
                  bg="rgba(0, 0, 0, 0.3)"
                  border="1px solid rgba(255, 255, 255, 0.2)"
                  borderRadius="8px"
                  color="white"
                  _placeholder={{ color: "rgba(255, 255, 255, 0.4)" }}
                  _focus={{ borderColor: "#10b981", boxShadow: "0 0 0 1px #10b981" }}
                />
              </Box>
            </HStack>

            {/* Treasury address - WHERE PAYMENTS GO */}
            <Box>
              <Text color="rgba(255, 255, 255, 0.8)" fontSize="xs" mb={1}>
                💰 Treasury Address (receives SOL payments)
              </Text>
              <Input
                value={treasuryAddress}
                onChange={(e) => setTreasuryAddress(e.target.value)}
                placeholder="Your treasury wallet address..."
                bg="rgba(0, 0, 0, 0.3)"
                border="1px solid rgba(16, 185, 129, 0.3)"
                borderRadius="8px"
                color="white"
                fontFamily="mono"
                fontSize="sm"
                _placeholder={{ color: "rgba(255, 255, 255, 0.4)" }}
                _focus={{ borderColor: "#10b981", boxShadow: "0 0 0 1px #10b981" }}
              />
              <Text color="rgba(16, 185, 129, 0.8)" fontSize="xs" mt={1}>
                ⚠️ IMPORTANT: This wallet receives mint payments!
              </Text>
            </Box>

            {/* Holder Type Selection - More prominent */}
            <Box
              p={3}
              bg={isNftCollection ? "rgba(139, 92, 246, 0.15)" : "rgba(245, 158, 11, 0.15)"}
              borderRadius="12px"
              border={isNftCollection ? "2px solid rgba(139, 92, 246, 0.5)" : "2px solid rgba(245, 158, 11, 0.5)"}
            >
              <Text color="rgba(255, 255, 255, 0.9)" fontSize="sm" fontWeight="bold" mb={2}>
                🎯 What type of holder discount?
              </Text>
              <HStack gap={2} mb={2}>
                <Button
                  flex={1}
                  size="md"
                  onClick={() => setIsNftCollection(true)}
                  bg={isNftCollection ? "linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)" : "rgba(255, 255, 255, 0.1)"}
                  color="white"
                  borderRadius="10px"
                  fontWeight="700"
                  border={isNftCollection ? "2px solid #a78bfa" : "2px solid transparent"}
                  _hover={{ opacity: 0.9, transform: "scale(1.02)" }}
                  transition="all 0.2s"
                >
                  🖼️ Core NFT Collection
                </Button>
                <Button
                  flex={1}
                  size="md"
                  onClick={() => setIsNftCollection(false)}
                  bg={!isNftCollection ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "rgba(255, 255, 255, 0.1)"}
                  color="white"
                  borderRadius="10px"
                  fontWeight="700"
                  border={!isNftCollection ? "2px solid #fbbf24" : "2px solid transparent"}
                  _hover={{ opacity: 0.9, transform: "scale(1.02)" }}
                  transition="all 0.2s"
                >
                  🪙 SPL Token
                </Button>
              </HStack>
              <Text color="rgba(255, 255, 255, 0.7)" fontSize="xs" textAlign="center">
                {isNftCollection
                  ? "✅ Selected: Holders of Metaplex Core NFTs get the discount"
                  : "✅ Selected: Holders of SPL tokens get the discount"}
              </Text>
            </Box>

            {/* Token/Collection address */}
            <Box>
              <Text color="rgba(255, 255, 255, 0.8)" fontSize="xs" mb={1}>
                {isNftCollection ? "🖼️ Core NFT Collection Address" : "🪙 SPL Token Mint Address"}
              </Text>
              <Input
                value={discountTokenMint}
                onChange={(e) => setDiscountTokenMint(e.target.value)}
                placeholder={isNftCollection ? "Core NFT collection address..." : "SPL token mint address..."}
                bg="rgba(0, 0, 0, 0.3)"
                border={isNftCollection ? "1px solid rgba(139, 92, 246, 0.3)" : "1px solid rgba(245, 158, 11, 0.3)"}
                borderRadius="8px"
                color="white"
                fontFamily="mono"
                fontSize="sm"
                _placeholder={{ color: "rgba(255, 255, 255, 0.4)" }}
                _focus={{
                  borderColor: isNftCollection ? "#8b5cf6" : "#f59e0b",
                  boxShadow: isNftCollection ? "0 0 0 1px #8b5cf6" : "0 0 0 1px #f59e0b"
                }}
              />
            </Box>

            {/* Apply button */}
            <Button
              onClick={() =>
                updateDualPricing(
                  umi,
                  candyGuard,
                  parseFloat(publicPrice),
                  parseFloat(holderPrice),
                  discountTokenMint,
                  treasuryAddress,
                  isNftCollection,
                  setIsUpdatingPricing,
                  setPricingStatus
                )
              }
              bg="linear-gradient(135deg, #10b981 0%, #059669 100%)"
              color="white"
              borderRadius="12px"
              fontWeight="bold"
              height="44px"
              loading={isUpdatingPricing}
              disabled={isUpdatingPricing || !discountTokenMint || !treasuryAddress}
              _hover={{
                transform: !isUpdatingPricing ? "translateY(-2px)" : "none",
                boxShadow: "0 8px 24px rgba(16, 185, 129, 0.4)",
              }}
              _active={{ transform: "translateY(0px)" }}
              transition="all 0.3s ease"
            >
              {isUpdatingPricing ? "Updating..." : "Apply Dual Pricing"}
            </Button>

            {/* Status */}
            {pricingStatus && (
              <Box
                p={2}
                bg={pricingStatus.includes("✅") ? "rgba(16, 185, 129, 0.15)" : pricingStatus.includes("❌") ? "rgba(239, 68, 68, 0.15)" : "rgba(139, 92, 246, 0.15)"}
                borderRadius="8px"
                border="1px solid"
                borderColor={pricingStatus.includes("✅") ? "rgba(16, 185, 129, 0.3)" : pricingStatus.includes("❌") ? "rgba(239, 68, 68, 0.3)" : "rgba(139, 92, 246, 0.3)"}
              >
                <Text color="white" fontSize="sm">
                  {pricingStatus}
                </Text>
              </Box>
            )}
          </VStack>
        </Box>

        {rootElements.length > 0 && (
          <>
            <Text fontWeight="bold" color="white" mt={4}>Merkle trees for your allowlist.ts:</Text>
            <VStack align="stretch" gap={2}>
              {rootElements.map((element) => (
                <Box
                  key={element.key}
                  p={3}
                  bg="rgba(138, 43, 226, 0.15)"
                  borderRadius="8px"
                  border="1px solid"
                  borderColor="rgba(138, 43, 226, 0.3)"
                >
                  {element}
                </Box>
              ))}
            </VStack>
          </>
        )}
      </VStack>
    </>
  );
};
