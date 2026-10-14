// Postgres persistence for the Pinboard store. Every action loads the current
// rows, runs the same pure reducer as the tests, and writes back only the rows
// that changed. Rows edited by hand in the database are picked up next request.
import { readFileSync } from "node:fs";
import path from "node:path";
import { Pool, type PoolClient } from "pg";
import { initialState, type PinboardState } from "./state";

type Key = keyof PinboardState;

const TABLES: Array<{ key: Key; table: string; fields: string[]; order: string }> = [
  { key: "founders", table: "founders", fields: ["id", "email", "displayName", "companyName", "isAdmin", "role", "companyDescription", "stage", "teamSize", "location", "visitsVolta"], order: "is_admin, display_name" },
  { key: "topics", table: "topics", fields: ["id", "label", "category", "keywords", "hidden", "mergedInto"], order: "created_at, label" },
  { key: "events", table: "events", fields: ["id", "title", "startsAt", "location", "kind", "listByDefault"], order: "starts_at, id" },
  { key: "rsvps", table: "rsvps", fields: ["id", "eventId", "founderId", "showOnList", "signupTopic", "createdAt", "cancelledAt"], order: "created_at, id" },
  { key: "updates", table: "updates", fields: ["id", "founderId", "submittedAt"], order: "submitted_at, id" },
  { key: "shares", table: "shares", fields: ["id", "founderId", "topicId", "updateId", "kind", "consentedAt", "withdrawnAt", "endedReason"], order: "consented_at, id" },
  { key: "groups", table: "groups", fields: ["id", "topicId", "status", "introducedAt"], order: "id" },
  { key: "members", table: "group_members", fields: ["id", "groupId", "founderId", "confirmedAt", "leftAt"], order: "confirmed_at, id" },
  { key: "asks", table: "asks", fields: ["id", "askerId", "recipientId", "topicId", "note", "status", "createdAt", "respondedAt"], order: "created_at, id" },
  { key: "connections", table: "connections", fields: ["id", "source", "sourceId", "founderIds", "createdAt"], order: "created_at, id" },
  { key: "emails", table: "email_log", fields: ["id", "template", "toFounderIds", "subject", "body", "mode", "sentAt"], order: "sent_at, id" },
  { key: "audit", table: "audit_log", fields: ["id", "founderId", "action", "entity", "entityId", "at"], order: "at, id" },
  { key: "notices", table: "notices", fields: ["id", "founderId", "text", "at"], order: "at, id" },
  { key: "nudges", table: "nudges", fields: ["id", "founderId", "topicId", "sentAt"], order: "sent_at, id" },
];

const snake = (f: string) => f.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
type Row = Record<string, unknown> & { id: string };

const globalForPool = globalThis as unknown as { pinboardPool?: Pool };

function pool(): Pool {
  if (!process.env.POSTGRES_URL) throw new Error("POSTGRES_URL is not set");
  globalForPool.pinboardPool ??= new Pool({ connectionString: process.env.POSTGRES_URL, max: 5 });
  return globalForPool.pinboardPool;
}

export async function closePool() {
  await globalForPool.pinboardPool?.end();
  globalForPool.pinboardPool = undefined;
}

async function load(client: PoolClient): Promise<PinboardState> {
  const state = {} as Record<Key, Row[]>;
  for (const { key, table, fields, order } of TABLES) {
    const { rows } = await client.query(`select ${fields.map(snake).join(", ")} from pinboard.${table} order by ${order}`);
    state[key] = rows.map((r) =>
      Object.fromEntries(
        fields.map((f) => {
          const v = r[snake(f)];
          return [f, v instanceof Date ? v.toISOString() : v];
        }),
      ) as Row,
    );
  }
  return state as unknown as PinboardState;
}

async function persistDiff(client: PoolClient, before: PinboardState, after: PinboardState) {
  // Inserts/updates parent tables first, deletes child tables first, so foreign keys hold.
  for (const { key, table, fields } of TABLES) {
    const sig = (r: Row) => JSON.stringify(fields.map((f) => r[f] ?? null));
    const old = new Map((before[key] as unknown as Row[]).map((r) => [r.id, sig(r)]));
    const cols = fields.map(snake);
    const sql =
      `insert into pinboard.${table} (${cols.join(", ")}) values (${cols.map((_, i) => `$${i + 1}`).join(", ")}) ` +
      `on conflict (id) do update set ${cols.slice(1).map((c) => `${c} = excluded.${c}`).join(", ")}`;
    for (const row of after[key] as unknown as Row[]) {
      if (old.get(row.id) === sig(row)) continue;
      await client.query(sql, fields.map((f) => row[f] ?? null));
    }
  }
  for (const { key, table } of [...TABLES].reverse()) {
    const keep = new Set((after[key] as unknown as Row[]).map((r) => r.id));
    const gone = (before[key] as unknown as Row[]).map((r) => r.id).filter((id) => !keep.has(id));
    if (gone.length) await client.query(`delete from pinboard.${table} where id = any($1)`, [gone]);
  }
}

async function inTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("begin");
    // One writer at a time; the whole dataset is tiny.
    await client.query("select pg_advisory_xact_lock(hashtext('pinboard'))");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

export async function loadState(): Promise<PinboardState> {
  const client = await pool().connect();
  try {
    return await load(client);
  } finally {
    client.release();
  }
}

export function updateState(fn: (state: PinboardState) => PinboardState): Promise<PinboardState> {
  return inTransaction(async (client) => {
    const before = await load(client);
    const after = fn(before);
    await persistDiff(client, before, after);
    return after;
  });
}

const emptyState = () =>
  Object.fromEntries(TABLES.map(({ key }) => [key, []])) as unknown as PinboardState;

/** Adds tables introduced after the first reset, without touching existing rows. */
export function migrate(): Promise<string[]> {
  return inTransaction(async (client) => {
    await client.query(readFileSync(path.join(process.cwd(), "db/schema.sql"), "utf8"));
    const done = ["schema up to date"];
    const { rows } = await client.query("select count(*)::int as n from pinboard.events");
    if (rows[0].n === 0) {
      const seed = initialState();
      const before = { ...seed, events: [], rsvps: [] };
      await persistDiff(client, before, { ...before, events: seed.events, rsvps: seed.rsvps });
      done.push(`seeded ${seed.events.length} events and ${seed.rsvps.length} RSVPs`);
    }
    return done;
  });
}

/** Reseeds the mock data. `recreate` drops and recreates the pinboard schema first. */
export function resetDatabase({ recreate = false } = {}): Promise<PinboardState> {
  return inTransaction(async (client) => {
    if (recreate) {
      await client.query("drop schema if exists pinboard cascade");
      await client.query(readFileSync(path.join(process.cwd(), "db/schema.sql"), "utf8"));
    } else {
      await client.query(`truncate ${TABLES.map((t) => `pinboard.${t.table}`).join(", ")} cascade`);
    }
    const seed = initialState();
    await persistDiff(client, emptyState(), seed);
    return seed;
  });
}
