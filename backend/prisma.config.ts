import "dotenv/config";
import { defineConfig } from "prisma/config";

// Used by the Prisma CLI (migrate, generate, studio) — not by the app at
// runtime, which goes through src/db/prisma.ts instead.
//
// `process.env.DATABASE_URL` (not the `env()` config helper) so `prisma
// generate` keeps working without a `.env` file present (e.g. in the
// Docker build); only `migrate`/`studio` actually need it resolved.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
