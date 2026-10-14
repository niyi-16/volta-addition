// Drops and recreates the `pinboard` schema in POSTGRES_URL, then loads the mock seed data.
// Usage: npm run db:reset
import { loadEnvConfig } from "@next/env";
import { closePool, resetDatabase } from "../lib/pinboard/db";

loadEnvConfig(process.cwd());

resetDatabase({ recreate: true })
  .then((s) =>
    console.log(
      `pinboard schema ready: ${s.founders.length} founders, ${s.topics.length} topics, ` +
        `${s.updates.length} updates, ${s.shares.length} shares, ${s.groups.length} groups`,
    ),
  )
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(closePool);
