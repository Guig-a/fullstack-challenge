export class InvalidCrashSeedError extends Error {
  constructor() {
    super("Crash seed must not be empty.");
    this.name = "InvalidCrashSeedError";
  }
}

export class InvalidSeedHashError extends Error {
  constructor() {
    super("Seed hash must be a valid SHA-256 hex digest.");
    this.name = "InvalidSeedHashError";
  }
}

export class InvalidNonceError extends Error {
  constructor() {
    super("Nonce must be greater than or equal to zero.");
    this.name = "InvalidNonceError";
  }
}

export class InvalidRoundProofError extends Error {
  constructor() {
    super("Round proof is invalid.");
    this.name = "InvalidRoundProofError";
  }
}
