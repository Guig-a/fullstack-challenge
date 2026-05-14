export class CurrentRoundNotFoundError extends Error {
  constructor() {
    super("Current round was not found.");
    this.name = "CurrentRoundNotFoundError";
  }
}
