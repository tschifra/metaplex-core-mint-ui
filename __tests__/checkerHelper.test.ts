import {
  calculateMintable,
  addressGateChecker,
  remainingBeforeRedeemedLimit,
} from '../utils/checkerHelper';
import { publicKey } from '@metaplex-foundation/umi';

describe('checkerHelper', () => {
  describe('calculateMintable', () => {
    // Clear the env variable for these tests
    const originalEnv = process.env.NEXT_PUBLIC_MAXMINTAMOUNT;

    beforeAll(() => {
      delete process.env.NEXT_PUBLIC_MAXMINTAMOUNT;
    });

    afterAll(() => {
      if (originalEnv !== undefined) {
        process.env.NEXT_PUBLIC_MAXMINTAMOUNT = originalEnv;
      }
    });

    it('should return 0 when current mintable is 0', () => {
      expect(calculateMintable(0, 10)).toBe(0);
    });

    it('should return 0 when check amount is 0', () => {
      expect(calculateMintable(10, 0)).toBe(0);
    });

    it('should return the smaller of the two values', () => {
      process.env.NEXT_PUBLIC_MAXMINTAMOUNT = '15';
      expect(calculateMintable(10, 5)).toBe(5);
      expect(calculateMintable(5, 10)).toBe(5);
      delete process.env.NEXT_PUBLIC_MAXMINTAMOUNT;
    });

    it('should return the same value when both are equal', () => {
      process.env.NEXT_PUBLIC_MAXMINTAMOUNT = '15';
      expect(calculateMintable(5, 5)).toBe(5);
      delete process.env.NEXT_PUBLIC_MAXMINTAMOUNT;
    });

    it('should handle large numbers', () => {
      process.env.NEXT_PUBLIC_MAXMINTAMOUNT = '15';
      expect(calculateMintable(1000000, 500000)).toBe(15);
      delete process.env.NEXT_PUBLIC_MAXMINTAMOUNT;
    });

    it('should respect NEXT_PUBLIC_MAXMINTAMOUNT when set', () => {
      process.env.NEXT_PUBLIC_MAXMINTAMOUNT = '3';
      expect(calculateMintable(10, 5)).toBe(3);
      expect(calculateMintable(2, 5)).toBe(2);
      delete process.env.NEXT_PUBLIC_MAXMINTAMOUNT;
    });

    it('floors fractional guard limits', () => {
      process.env.NEXT_PUBLIC_MAXMINTAMOUNT = '15';
      expect(calculateMintable(10, 2.9)).toBe(2);
      delete process.env.NEXT_PUBLIC_MAXMINTAMOUNT;
    });
  });

  describe('redeemed amount', () => {
    it('returns remaining mints before the cap', () => {
      expect(remainingBeforeRedeemedLimit(BigInt(10), BigInt(6))).toBe(4);
    });

    it('blocks at and beyond the cap', () => {
      expect(remainingBeforeRedeemedLimit(BigInt(10), BigInt(10))).toBe(0);
      expect(remainingBeforeRedeemedLimit(BigInt(10), BigInt(11))).toBe(0);
    });
  });

  describe('addressGateChecker', () => {
    // Using valid Solana addresses for testing
    const testAddress1 = publicKey('11111111111111111111111111111112'); // System Program
    const testAddress2 = publicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'); // Token Program

    it('should return true for matching addresses', () => {
      expect(addressGateChecker(testAddress1, testAddress1)).toBe(true);
    });

    it('should return false for non-matching addresses', () => {
      expect(addressGateChecker(testAddress1, testAddress2)).toBe(false);
    });
  });
});
