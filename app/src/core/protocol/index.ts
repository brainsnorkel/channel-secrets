// Module: core/protocol
// StegoChannel protocol implementation
export {
  encodeFrame,
  decodeFrame,
  frameToBits,
  bitsToFrame,
} from './framing';

export {
  computeSelectionHash,
  getSelectionValue,
  computeThreshold,
  isSignalPost,
} from './selection';

export {
  normalizeText,
  countGraphemes,
  extractLengthBit,
  extractMediaBit,
  extractQuestionBit,
  extractFirstWordBits,
  extractFeatures,
  type FeatureId
} from './features';

export {
  rsEncode,
  rsDecode,
} from './reed-solomon';
