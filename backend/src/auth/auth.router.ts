import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginHandler, signupHandler } from "./auth.controller.js";

// Tighter than the app-wide limiter in index.ts — blunts credential-stuffing
// and brute-force attempts against these two routes specifically.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many auth requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRouter = Router();

authRouter.use(authLimiter);
authRouter.post("/signup", signupHandler);
authRouter.post("/login", loginHandler);
