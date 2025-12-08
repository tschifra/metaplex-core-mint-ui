import type { GuardRepository } from "@metaplex-foundation/mpl-core-candy-machine";

declare module "@metaplex-foundation/umi" {
  interface Umi {
    coreGuards: GuardRepository;
  }
}

declare module "@metaplex-foundation/umi/dist/types/Umi" {
  interface Umi {
    coreGuards: GuardRepository;
  }
}
