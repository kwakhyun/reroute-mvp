export class MatchingMutationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchingMutationError";
  }
}
