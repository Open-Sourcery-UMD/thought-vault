import type { Request, Response, NextFunction } from "express";

// Catch-all error middleware. Must be mounted last, after all routers.
// Never leaks internals (stack traces, hashes, raw DB errors) to the client.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  console.error(err);

  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
}
