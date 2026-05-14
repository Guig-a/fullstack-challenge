export class RoundNotFoundError extends Error {
  constructor() {
    super("Round was not found.");
    this.name = "RoundNotFoundError";
  }
}
