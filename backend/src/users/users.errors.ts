// Mirrors the AuthError pattern in auth/auth.errors.ts: a typed error with
// an HTTP status, so the controller stays the only place that talks HTTP.
class UsersError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "UsersError";
  }
}

export class UserNotFoundError extends UsersError {
  constructor() {
    super("User not found", 404);
    this.name = "UserNotFoundError";
  }
}
