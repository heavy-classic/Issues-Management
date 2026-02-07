import knex from "knex";
import { config } from "./config";

const db = knex({
  client: "pg",
  connection: config.databaseUrl,
});

export default db;
