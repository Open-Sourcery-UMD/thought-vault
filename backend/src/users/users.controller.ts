import type { Request, Response, NextFunction } from "express";
import { deleteUser } from "./users.service.js";
import { UserNotFoundError } from "./users.errors.js";

export async function deleteUserHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "Invalid user id" });
    return;
  }

  // Self-service only — a user can delete their own account, nothing else.
  // No admin role exists yet; add a check here if that's ever needed.
  if (req.user?.userId !== id) {
    res.status(403).json({ error: "You can only delete your own account" });
    return;
  }

  try {
    await deleteUser(id);
    res.status(204).send();
  } catch (err) {
    if (err instanceof UserNotFoundError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}
