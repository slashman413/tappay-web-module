// Normalised error type for every failure this module can produce.
//
// TapPay's SDK reports failures in several shapes: a numeric `status` with a
// `msg`, a thrown JS Error, or a Google Pay `statusCode` string. We collapse
// all of them into one object so consumers only ever handle `TapPayError`.

export class TapPayError extends Error {
  /**
   * @param {string} message  Human readable description.
   * @param {object} [meta]
   * @param {number|string} [meta.status]  SDK status/error code when present.
   * @param {string} [meta.code]           Stable machine code, see CODES below.
   * @param {unknown} [meta.cause]         Original error/object from the SDK.
   */
  constructor(message, { status, code, cause } = {}) {
    super(message);
    this.name = 'TapPayError';
    this.status = status;
    this.code = code ?? TapPayError.CODES.UNKNOWN;
    this.cause = cause;
  }

  /** Build a TapPayError from a TapPay `getPrime` failure result. */
  static fromPrimeResult(result) {
    return new TapPayError(result?.msg || 'Failed to get prime', {
      status: result?.status,
      code: TapPayError.CODES.GET_PRIME_FAILED,
      cause: result,
    });
  }
}

TapPayError.CODES = Object.freeze({
  UNKNOWN: 'unknown',
  SDK_LOAD_FAILED: 'sdk_load_failed',
  NOT_CONFIGURED: 'not_configured',
  INVALID_FIELDS: 'invalid_fields',
  GET_PRIME_FAILED: 'get_prime_failed',
  GOOGLE_PAY_UNAVAILABLE: 'google_pay_unavailable',
  USER_CANCELLED: 'user_cancelled',
});
