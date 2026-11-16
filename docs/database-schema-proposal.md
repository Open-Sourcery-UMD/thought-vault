# Initial Prisma data model proposal

Status: proposed for team review (W2-3, Second Work Wave). Merging this document
records the proposal; it does not approve or apply a database migration.

## Project context and scope

Thought Vault stores personal notes, finds them by meaning, and eventually groups
them into a topic tree. React calls the Express backend; PostgreSQL holds durable
data, while the Python ML service produces embeddings and clustering results.

On `main` at `777148b`, Prisma is already configured, but its only model is
`StubUser`. [Auth PR #9](https://github.com/Open-Sourcery-UMD/thought-vault/pull/9)
is still open at the time of this proposal. Its `User` model, auth queries, JWT
payload, and account deletion route are the compatibility baseline below:
integer user IDs, unique email/username, and `passwordHash`. This proposal extends
that shape rather than introducing a competing authentication model.

The deliverable is a proposed schema and rationale. The active backend schema,
existing migrations, generated client, API routes, and dependencies are unchanged.
Persistence and migrations follow team review in a separate implementation ticket.

## Proposed schema.prisma

This is a complete candidate for `backend/prisma/schema.prisma`, using the
repository's Prisma 7 PostgreSQL provider and generated-client settings. The
connection URL remains in the CLI config, not in this schema.

```prisma
generator client {
  provider            = "prisma-client"
  output              = "../src/generated/prisma"
  moduleFormat        = "esm"
  importFileExtension = "js"
}

datasource db {
  provider = "postgresql"
}

model User {
  id           Int      @id @default(autoincrement())
  email        String   @unique @db.VarChar(255)
  username     String   @unique @db.VarChar(100)
  passwordHash String   @db.VarChar(255)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  notes        Note[]
}

model Note {
  id        Int            @id @default(autoincrement())
  userId    Int
  user      User           @relation(fields: [userId], references: [id], onDelete: Cascade, onUpdate: Cascade)
  title     String         @db.VarChar(255)
  content   String         @db.Text
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  embedding NoteEmbedding?

  @@index([userId, updatedAt, id])
}

model NoteEmbedding {
  noteId      Int      @id
  note        Note     @relation(fields: [noteId], references: [id], onDelete: Cascade, onUpdate: Cascade)
  vector      Float[]
  model       String   @db.VarChar(255)
  contentHash String   @db.Char(64)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

## Entities, fields, and constraints

| Entity | Purpose and constraints |
| --- | --- |
| `User` | One account owns zero or more notes. `id` is a generated integer primary key, matching the auth PR's numeric `userId` claim. Email and username are required and separately unique. `passwordHash` is required and stores the auth service's Argon2id hash, never plaintext. |
| `Note` | Every note belongs to exactly one existing user through required `userId`. Title and content are required strings; neither is unique, so repeated titles/content are allowed. The API should trim and require a nonblank title (maximum 255 characters) and nonblank content, with a request-size limit agreed separately. |
| `NoteEmbedding` | Optional derived data for a note. `noteId` is both primary key and foreign key, enforcing at most one embedding per note without a redundant ID. A missing row means the note is saved but has no usable embedding yet. All fields in an existing embedding row are required. |
| Timestamps | Every model has required `createdAt` and `updatedAt`. `now()` supplies creation time; Prisma manages `@updatedAt` on writes. Direct SQL writers must maintain `updatedAt` themselves. Keep the existing auth timestamp type for compatibility and expose timestamps as UTC ISO 8601 values at the API boundary. |

Relation fields (`notes`, `user`, `note`, `embedding`) describe Prisma relations;
the persisted foreign keys are `Note.userId` and `NoteEmbedding.noteId`.
`embedding` is the only optional singular relation; notes never wait for ML work
to finish before being saved. No optional profile fields are needed for the MVP.

The composite note index supports owner-scoped listing ordered by `updatedAt`
and then `id` as a stable tie-breaker. It also covers lookups by `userId` without
a second owner-only index. Primary keys and the unique user fields already have
indexes; no speculative content or vector index is proposed.

### Identity and authentication compatibility

- Keep auto-incrementing integers across users and notes for a small, single
  PostgreSQL deployment. They match existing auth code and make joins simple.
  Predictable IDs are not an authorization boundary: every Notes read/update/
  delete and semantic-search candidate query must be scoped to the authenticated
  user's ID, never an owner supplied in the request body.
- Keep `username` and the auth PR's column sizes to avoid breaking signup, safe
  user responses, or JWT types. Its request validator currently limits usernames
  to 3-32 characters even though the database column can hold 100; retain that
  stricter API rule. Any email longer than the database limit must be rejected
  before insertion.
- The auth PR trims/lowercases email before lookup and insertion. All future
  writers must use the same rule: plain PostgreSQL text uniqueness alone is
  case-sensitive. Username uniqueness is also case-sensitive in this proposal
  (`Alice` and `alice` differ), matching the current implementation; changing that
  policy requires agreement and a data/constraint migration.
- Only select safe profile fields for responses, as the auth PR already does.
  `passwordHash` is internal authentication data and must never be serialized to
  clients or sent to the ML service.

### Deletion behavior

Deleting a user permanently deletes their notes; deleting a note permanently
deletes its embedding. Explicit `onDelete: Cascade` foreign keys enforce both
steps. This fits the auth PR's self-service account deletion route and prevents
orphaned private data. `onUpdate: Cascade` preserves references if a key changes,
although application code should treat IDs as immutable.

There is no trash or soft deletion in this MVP proposal. If account recovery or
retention becomes a requirement, review the policy before implementing these
foreign keys. Workers must tolerate a note disappearing while ML work is running;
they must not recreate a deleted note to store its embedding.

## Embedding storage decision

Use a separate optional `NoteEmbedding` table rather than embedding columns on
`Note`. This keeps derived ML data out of ordinary note queries, allows note
creation when the ML service is unavailable, and lets embeddings be replaced
without changing the note's last-edited timestamp. It adds one small relation,
not a job queue or embedding-history system.

For the first implementation, propose PostgreSQL `Float[]` as the portable
storage shape supported by Prisma, with similarity calculations in the Python
service. This array is not a pgvector column and provides no database vector
index or efficient nearest-neighbor search. Fetch candidates only for the
authenticated owner. Revisit pgvector and its migration/query strategy when
measured corpus size requires database-side search; no extension is installed by
this proposal.

`model` identifies the exact embedding model/version or pinned revision and
preprocessing convention, not just a mutable display name. Use one active
configuration for the MVP. Do not compare embeddings from different model
configurations, even if their lengths happen to match. Vector length is derived
from the array instead of stored redundantly; the ML integration must validate
a nonempty vector of finite numbers with the active model's expected dimension.
The Prisma list type does not enforce these checks or prevent an empty array.

`contentHash` is the lowercase hexadecimal SHA-256 digest of the exact UTF-8 text
sent to the model. The proposed input is `title + "\n\n" + content`, using the
stored strings without additional normalization. This detects stale results
after edits; title changes also invalidate an embedding. The hash is neither an
authentication secret nor a unique constraint (different notes may contain the
same text). Its character format must be validated by the writer; `Char(64)`
alone does not guarantee a valid digest.

The persistence integration should follow these rules:

1. Save a new note immediately with no embedding row. If generation fails, the
   note remains available for ordinary CRUD and can be retried later.
2. On title/content edits, update the note and delete its existing embedding in
   the same transaction. An unchanged text payload needs no invalidation.
3. Generate against a captured input/hash and model configuration outside the
   database transaction. Before upserting the result, lock/recheck the note in a
   transaction and ensure its current input hash still matches the captured hash.
   Serialize that check and write with note edits/deletes (for example, using a
   PostgreSQL row lock); a standalone check followed by an upsert permits a race.
4. Search only rows matching the active model configuration, with query vectors
   produced by that same configuration. Missing/stale embeddings simply exclude
   a note from semantic results until regeneration; they never hide it from the
   user's ordinary note list.

No dimension is hardcoded because the ML service currently only exposes its
FastAPI scaffold. Agree on the model and input contract before implementing
generation. A one-row-per-note design intentionally excludes chunking, multiple
simultaneous models, and embedding history.

## Decisions requiring team agreement

| Proposed default | Confirm before persistence work |
| --- | --- |
| Extend the `User` from auth PR #9 | Recheck its final merged schema, validators, and numeric JWT claims before implementing. Add `updatedAt` without changing existing safe response shapes. |
| Private notes with required title/content | Agree on title fallback behavior, blank-note drafts, and maximum content/request size with the Notes API owner; this proposal requires nonblank saved notes. |
| Permanent cascading deletion | Confirm account/note deletion should have no recovery period. |
| Lowercase email, case-sensitive username | Confirm product identity rules; database uniqueness does not normalize input. |
| One optional embedding per note, stored as `Float[]` | Agree with the ML owner on the pinned model, dimensions, input/preprocessing convention, retry behavior, and acceptable MVP search scale. |

Topic-tree nodes, clusters, tags, folders, sharing, teams, attachments, revision
history, sessions/refresh tokens, and ML job tables are deferred. The README's
topic-tree goal is acknowledged, but no clustering contract yet establishes
whether that tree must be persisted or can be recomputed. A later design can
add it once the ML/API contract is known.

## Integration handoff and verification

After schema review, reconcile the auth branch with `main` before creating a new
forward migration. `main` currently creates `StubUser`, while the auth PR has its
own initial `User` migration; do not rewrite applied migration history or blindly
drop stub data. Decide whether existing development records need preserving and
how missing credentials/usernames would be handled. This document performs no
data conversion.

The implementation ticket should apply the approved schema, generate the client,
and test against PostgreSQL: duplicate email/username rejection, missing owner
rejection, two users with identical note titles, at most one embedding per note,
note/account cascade deletion, owner-scoped CRUD/search, and embedding invalidation
including concurrent edits. Also verify the existing auth flows still work.

For this design-only ticket, extract the `prisma` code block to a temporary file
and run the backend's installed `prisma validate --schema <temporary-file>`.
This checks schema syntax and relations without applying it or connecting to a
database. Validation does not prove the application policies or concurrency rules
above; those belong to the persistence implementation tests.

References: [Prisma schema reference](https://docs.prisma.io/docs/orm/reference/prisma-schema-reference),
[Prisma 7 relation modes](https://www.prisma.io/docs/orm/v7/prisma-schema/data-model/relations/relation-mode),
and the repository's [architecture and development workflow](../README.md).
