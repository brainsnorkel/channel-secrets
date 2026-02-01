// Type declarations for reedsolomon package
// https://www.npmjs.com/package/reedsolomon

declare module 'reedsolomon' {
  export class GenericGF {
    static QR_CODE_FIELD_256(): GenericGF
    static AZTEC_DATA_12(): GenericGF
    static AZTEC_DATA_10(): GenericGF
    static AZTEC_DATA_6(): GenericGF
    static AZTEC_PARAM(): GenericGF
    static DATA_MATRIX_FIELD_256(): GenericGF
    static MAXICODE_FIELD_64(): GenericGF
  }

  export class ReedSolomonEncoder {
    constructor(field: GenericGF)
    encode(toEncode: Int32Array, ecBytes: number): void
  }

  export class ReedSolomonDecoder {
    constructor(field: GenericGF)
    decode(received: Int32Array, twoS: number): number
  }
}
