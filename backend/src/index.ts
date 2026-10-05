import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

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

//mount routers and error handler catch-all 

app.listen(port, () => console.log(`Listening on port ${port}...`));