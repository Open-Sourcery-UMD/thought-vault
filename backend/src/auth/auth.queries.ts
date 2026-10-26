import { prisma } from "../db/prisma.js";
import type { SafeUser } from "./auth.types.js";

const safeUserSelect = {
  id: true,
  email: true,
  username: true,
  createdAt: true,
} as const;

export function findUserByEmail(email: string) {
  // Includes passwordHash — only for internal use (login comparison).
  return prisma.user.findUnique({ where: { email } });
}

export function findUserByUsername(username: string) {
  return prisma.user.findUnique({ where: { username } });
}

export function createUser(data: {
  email: string;
  username: string;
  passwordHash: string;
}): Promise<SafeUser> {
  return prisma.user.create({
    data,
    select: safeUserSelect,
  });
}
