import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder/TextDecoder for Node.js test environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill structuredClone for older Node.js versions
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj) => {
    if (obj === undefined) return undefined;
    if (obj === null) return null;
    return JSON.parse(JSON.stringify(obj));
  };
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock AudioContext for sound tests
class MockAudioContext {
  createOscillator() {
    return {
      connect: jest.fn(),
      frequency: { value: 0 },
      type: 'sine',
      start: jest.fn(),
      stop: jest.fn(),
    };
  }
  createGain() {
    return {
      connect: jest.fn(),
      gain: {
        setValueAtTime: jest.fn(),
        linearRampToValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn(),
      },
    };
  }
  get currentTime() {
    return 0;
  }
  get destination() {
    return {};
  }
}

window.AudioContext = MockAudioContext;
