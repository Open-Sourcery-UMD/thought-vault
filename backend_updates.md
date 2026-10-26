# Backend Updates: Auth (sign-up / login)

Implements `auth_plan.md`: JWT-based `POST /api/auth/signup` and `POST /api/auth/login`, Argon2id password hashing, Prisma `User` model and Postgres migration. Everything is under `backend/`.

## New files

```
backend/
  prisma.config.ts                 # Prisma CLI config (schema path, DATABASE_URL for migrate)
  prisma/
    schema.prisma                  # User model + prisma-client generator (adapter-based, Prisma 7)
    migrations/20261026210331_init/migration.sql
  src/
    generated/prisma/              # prisma generate output — gitignored, regenerate with `npm run db:generate`
    db/
      prisma.ts                    # shared PrismaClient, wired to @prisma/adapter-pg
    config/
      env.ts                       # validates JWT_SECRET (>=32 chars)/JWT_EXPIRES_IN at startup; fails fast
    auth/
      auth.schemas.ts              # zod request validation (signup/login)
      auth.queries.ts               # createUser, findUserByEmail, findUserByUsername
      auth.service.ts              # argon2 hash/verify, JWT sign, signup/login orchestration
      auth.controller.ts           # Express handlers, maps AuthError -> HTTP status
      auth.router.ts               # POST /signup, POST /login + per-route rate limiter
      auth.errors.ts               # AuthError, EmailTakenError, UsernameTakenError, InvalidCredentialsError
      auth.types.ts                # JwtPayload, SafeUser
    users/
      users.queries.ts             # deleteUser(id)
      users.service.ts             # maps Prisma P2025 (not found) -> UserNotFoundError
      users.controller.ts          # ownership check + error mapping for DELETE /:id
      users.router.ts              # DELETE /:id, behind `authenticate`
      users.errors.ts              # UserNotFoundError
    middleware/
      authenticate.ts              # Bearer-JWT middleware, sets req.user — now used by users.router.ts
      errorHandler.ts              # catch-all error middleware
```

## Modified files

- **`src/index.ts`** — imports `./config/env.js` (fail-fast validation), mounts `app.use("/api/auth", authRouter)`, `app.use("/api/users", usersRouter)`, and `app.use(errorHandler)` at the former placeholder comment.
- **`package.json`** — added deps `argon2`, `jsonwebtoken`, `zod`, `@prisma/client`, `@prisma/adapter-pg`; dev deps `prisma`, `@types/jsonwebtoken`; scripts `postinstall`/`db:generate` (`prisma generate`) and `db:migrate` (`prisma migrate dev`).
- **`Dockerfile`** — copies `prisma.config.ts` and `prisma/` before `npm ci` so `postinstall`'s `prisma generate` has the schema available during the image build.
- **`.env.example`** — added `JWT_SECRET` (generate with `openssl rand -hex 32`) and `JWT_EXPIRES_IN=7d`.
- **`.gitignore`** (root) — ignores `backend/src/generated/` (regenerated, not committed).

## Endpoints

| Method | Path | Body | Success | Failure |
|---|---|---|---|---|
| POST | `/api/auth/signup` | `{ email, username, password }` | `201 { token, user }` | `400` validation, `409` email/username taken |
| POST | `/api/auth/login` | `{ email, password }` | `200 { token, user }` | `400` validation, `401` invalid credentials |
| DELETE | `/api/users/:id` | — (Bearer token) | `204` no body | `400` invalid id, `401` no/invalid token, `403` not your account, `404` already gone |

- `user` is always `{ id, email, username, createdAt }` — the password hash never leaves the server.
- Password: Argon2id (`argon2` package defaults). Login verifies against a cached dummy hash when the email isn't found, so the response timing doesn't reveal whether an account exists.
- JWT: payload `{ userId, username }`, `HS256`, signed with `JWT_SECRET`, expires per `JWT_EXPIRES_IN` (default 7d). Returned in the response body; clients send it back as `Authorization: Bearer <token>`.
- `/api/auth/*` has its own rate limiter (20 requests / 15 min / IP), on top of the app-wide one in `index.ts`.

### `DELETE /api/users/:id` — delete a user

- Requires `Authorization: Bearer <token>` (the `authenticate` middleware sets `req.user = { userId, username }`). No token / invalid / expired token → `401`.
- `:id` must be a positive integer → otherwise `400`.
- Self-service only: `req.user.userId` must equal `:id`, or `403 "You can only delete your own account"`. There's no admin role yet, so there's no way to delete *someone else's* account — only your own, while logged in as that account.
- Success: `204`, empty body. Deleting an id that's already gone (or never existed) → `404`.
- No cascading-delete concerns yet since `User` has no related tables in this schema; add that logic here if/when one shows up (e.g. projects/collections owned by the user).

## Running it locally

```sh
cd backend
cp .env.example .env        # fill in DATABASE_URL and JWT_SECRET
npm install                  # postinstall runs `prisma generate`
npm run db:migrate           # applies prisma/migrations against your DATABASE_URL
npm run dev
```

Verified end-to-end against a real Postgres 17 container: signup, duplicate-email/username (409), validation errors (400), login success/failure (401, identical message for wrong password vs. unknown email), JWT payload/expiry, Argon2id hash stored in the DB, rate-limit 429, the no-`JWT_SECRET` startup failure, and the full delete-user matrix below (401/403/400/204/404, plus confirming a deleted user can no longer log in).

## Deleting users

`DELETE /api/users/:id` exists now (see the endpoint table and detail above) — closes the gap `huemetry_authentication.md` calls out in its own codebase, which this backend no longer has. A user can delete only their own account while authenticated; there's no admin override, since no admin role exists yet.
