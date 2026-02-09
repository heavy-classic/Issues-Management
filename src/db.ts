import knex from "knex";
import { config } from "./config";

const db = knex({
  client: "pg",
  connection: {
    connectionString: config.databaseUrl,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  },
});

export default db;
