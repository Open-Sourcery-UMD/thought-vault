// Typed errors the auth service throws; the controller maps these to HTTP
// responses so the service itself stays framework-agnostic.
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export class EmailTakenError extends AuthError {
  constructor() {
    super("Email is already in use", 409);
    this.name = "EmailTakenError";
  }
}

export class UsernameTakenError extends AuthError {
  constructor() {
    super("Username is already in use", 409);
    this.name = "UsernameTakenError";
  }
}

export class InvalidCredentialsError extends AuthError {
  constructor() {
    super("Invalid email or password", 401);
    this.name = "InvalidCredentialsError";
  }
}
