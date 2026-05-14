export class InvalidMoneyAmountError extends Error {
  constructor(message = "Money amount must be greater than or equal to zero") {
    super(message);
    this.name = "InvalidMoneyAmountError";
  }
}

export class InsufficientFundsError extends Error {
  constructor() {
    super("Insufficient funds");
    this.name = "InsufficientFundsError";
  }
}

export class InvalidWalletOwnerError extends Error {
  constructor() {
    super("Wallet owner id is required");
    this.name = "InvalidWalletOwnerError";
  }
}
