import { Prisma } from "../generated/prisma/client.js";
import { deleteUser as deleteUserQuery } from "./users.queries.js";
import { UserNotFoundError } from "./users.errors.js";

export async function deleteUser(id: number): Promise<void> {
  try {
    await deleteUserQuery(id);
  } catch (err) {
    // P2025 = "record to delete does not exist" (already deleted, or never did).
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      throw new UserNotFoundError();
    }
    throw err;
  }
}
