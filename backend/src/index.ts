import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import './config/env.js'; // validated eagerly so the process fails fast if misconfigured
import { authRouter } from './auth/auth.router.js';
import { usersRouter } from './users/users.router.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

const port = Number(process.env.PORT) || 3000;

const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:5173";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests from this IP, please try again later.',
  headers: true,
});
app.use(limiter);

app.use(cors({
  origin: frontendUrl,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "thought-vault-backend",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);

app.use(errorHandler);

app.listen(port, () => console.log(`Listening on port ${port}...`));