import crypto from "node:crypto";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Prisma } from "../generated/prisma/client.js";
import { createUser, findUserByEmail, findUserByUsername } from "./auth.queries.js";
import {
  EmailTakenError,
  InvalidCredentialsError,
  UsernameTakenError,
} from "./auth.errors.js";
import type { JwtPayload, SafeUser } from "./auth.types.js";
import type { LoginInput, SignupInput } from "./auth.schemas.js";

// An Argon2id hash of a random value that no real password will ever match.
// Verifying against it when a user isn't found keeps login's timing roughly
// the same whether or not the email exists, so response time can't be used
// to probe for registered accounts. Computed once and cached.
let dummyHashPromise: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash(crypto.randomUUID());
  return dummyHashPromise;
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    algorithm: "HS256",
    expiresIn: env.jwtExpiresIn as NonNullable<jwt.SignOptions["expiresIn"]>,
  });
}

export async function signup(
  input: SignupInput
): Promise<{ token: string; user: SafeUser }> {
  const { email, username, password } = input;

  const [existingByEmail, existingByUsername] = await Promise.all([
    findUserByEmail(email),
    findUserByUsername(username),
  ]);
  if (existingByEmail) throw new EmailTakenError();
  if (existingByUsername) throw new UsernameTakenError();

  const passwordHash = await argon2.hash(password);

  let user: SafeUser;
  try {
    user = await createUser({ email, username, passwordHash });
  } catch (err) {
    // Race: another request created the same email/username between the
    // check above and this insert. The DB's unique constraint is the real
    // guard; this just maps it back to a sensible error.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const target = (err.meta?.target as string[] | undefined) ?? [];
      if (target.includes("username")) throw new UsernameTakenError();
      throw new EmailTakenError();
    }
    throw err;
  }

  const token = signToken({ userId: user.id, username: user.username });
  return { token, user };
}

export async function login(
  input: LoginInput
): Promise<{ token: string; user: SafeUser }> {
  const { email, password } = input;

  const user = await findUserByEmail(email);
  const passwordMatches = await argon2.verify(
    user?.passwordHash ?? (await getDummyHash()),
    password
  );

  if (!user || !passwordMatches) {
    throw new InvalidCredentialsError();
  }

  const token = signToken({ userId: user.id, username: user.username });
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    },
  };
}
