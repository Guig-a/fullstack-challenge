export class RoundVerificationUnavailableError extends Error {
  constructor() {
    super("Round verification is only available after the round crashes.");
    this.name = "RoundVerificationUnavailableError";
  }
}
