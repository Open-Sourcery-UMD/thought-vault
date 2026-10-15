import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();

const port = Number(process.env.PORT) || 3000;
const frontendUrl =
  process.env.FRONTEND_URL ?? 'http://localhost:5173';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    error: 'Too many requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use(
  cors({
    origin: frontendUrl,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'thought-vault-backend',
  });
});

// Mount routers here

// Centralized error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('Backend error:', err.message);

    res.status(500).json({
      error: 'Internal server error',
    });
  },
);

app.listen(port, () => {
  console.log(`Thought Vault backend listening on port ${port}`);
});
