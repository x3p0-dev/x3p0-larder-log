import type { ReadDatabaseOf, WriteDatabaseOf } from '@spacefast/zero/server';
import type { schema } from './index';

/**
 * The `ctx.db` types, derived from the schema.
 *
 * The schema itself lives in `server/index.ts` and cannot move back here: the
 * capsule compiler reads the server entry's source and never follows an import,
 * so tables declared in this file compile away to nothing. The header comment
 * over `schema` in `server/index.ts` has the details.
 *
 * The import above is type-only and so is erased at build time — the cycle
 * between this file and the entry never exists at runtime.
 */

/** `ctx.db` inside a query — reads only. */
export type ReadDb = ReadDatabaseOf<{ schema: typeof schema }>;

/** `ctx.db` inside a mutation — reads and writes. */
export type WriteDb = WriteDatabaseOf<{ schema: typeof schema }>;
