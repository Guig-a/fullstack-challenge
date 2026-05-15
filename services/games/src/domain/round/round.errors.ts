export class InvalidBetAmountError extends Error {
  constructor() {
    super("Bet amount must be between 1.00 and 1,000.00.");
    this.name = "InvalidBetAmountError";
  }
}

export class InvalidMultiplierError extends Error {
  constructor() {
    super("Multiplier must be greater than or equal to 1.00x.");
    this.name = "InvalidMultiplierError";
  }
}

export class RoundNotBettingError extends Error {
  constructor() {
    super("Round is not accepting bets.");
    this.name = "RoundNotBettingError";
  }
}

export class RoundNotRunningError extends Error {
  constructor() {
    super("Round is not running.");
    this.name = "RoundNotRunningError";
  }
}

export class RoundAlreadyCrashedError extends Error {
  constructor() {
    super("Round has already crashed.");
    this.name = "RoundAlreadyCrashedError";
  }
}

export class DuplicateBetError extends Error {
  constructor() {
    super("Player already has a bet in this round.");
    this.name = "DuplicateBetError";
  }
}

export class BetNotFoundError extends Error {
  constructor() {
    super("Bet was not found for this player.");
    this.name = "BetNotFoundError";
  }
}

export class BetAlreadySettledError extends Error {
  constructor() {
    super("Bet has already been settled.");
    this.name = "BetAlreadySettledError";
  }
}

export class BetDebitNotConfirmedError extends Error {
  constructor() {
    super("Bet debit has not been confirmed by the wallet.");
    this.name = "BetDebitNotConfirmedError";
  }
}

export class InvalidRoundTransitionError extends Error {
  constructor() {
    super("Round state transition is invalid.");
    this.name = "InvalidRoundTransitionError";
  }
}
