export interface JwtPayload {
  userId: number;
  username: string;
}

// User shape that is safe to send back to a client — never the password hash.
export interface SafeUser {
  id: number;
  email: string;
  username: string;
  createdAt: Date;
}
