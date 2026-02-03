// Shim for the reedsolomon package which uses `this.X = X` export pattern
// This pattern breaks in ESM strict mode where `this` is undefined

// Import the module - in production build this gets the CJS interop
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import * as rsModule from 'reedsolomon';

// The module attaches exports to `this` which becomes the module object
// in CommonJS interop, or may need to be accessed differently
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rs = rsModule as any;

// Re-export with proper named exports
export const GenericGF = rs.GenericGF || rs.default?.GenericGF;
export const ReedSolomonEncoder = rs.ReedSolomonEncoder || rs.default?.ReedSolomonEncoder;
export const ReedSolomonDecoder = rs.ReedSolomonDecoder || rs.default?.ReedSolomonDecoder;

// Validate exports at module load time
if (!GenericGF) {
  throw new Error('Failed to import GenericGF from reedsolomon package');
}
if (!ReedSolomonEncoder) {
  throw new Error('Failed to import ReedSolomonEncoder from reedsolomon package');
}
if (!ReedSolomonDecoder) {
  throw new Error('Failed to import ReedSolomonDecoder from reedsolomon package');
}
