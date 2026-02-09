import "dotenv/config";
import type { Knex } from "knex";

const config: Knex.Config = {
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  },
  migrations: {
    directory: "./migrations",
    extension: "ts",
  },
  seeds: {
    directory: "./seeds",
    extension: "ts",
  },
};

export default config;
