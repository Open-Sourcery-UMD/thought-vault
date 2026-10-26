import type { Request, Response, NextFunction } from "express";
import { loginSchema, signupSchema } from "./auth.schemas.js";
import { login, signup } from "./auth.service.js";
import { AuthError } from "./auth.errors.js";

export async function signupHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid signup request",
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const { token, user } = await signup(parsed.data);
    res.status(201).json({ token, user });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid login request",
      details: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  try {
    const { token, user } = await login(parsed.data);
    res.status(200).json({ token, user });
  } catch (err) {
    if (err instanceof AuthError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
}
