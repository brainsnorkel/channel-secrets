// Re-export from vendored ESM version of reedsolomon
// The npm package uses `this.X = X` exports which break in ESM strict mode
export { GenericGF, ReedSolomonEncoder, ReedSolomonDecoder } from '../../lib/reedsolomon';
