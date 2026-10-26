import { prisma } from "../db/prisma.js";

export function deleteUser(id: number) {
  return prisma.user.delete({ where: { id } });
}
