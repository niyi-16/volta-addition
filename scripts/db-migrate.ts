// Adds any new tables from db/schema.sql and seeds them if empty. Existing rows are kept.
// Usage: npm run db:migrate
import { loadEnvConfig } from "@next/env";
import { closePool, migrate } from "../lib/pinboard/db";

loadEnvConfig(process.cwd());

migrate()
  .then((done) => console.log(done.join("; ")))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(closePool);
