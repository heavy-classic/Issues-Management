import type { Knex } from "knex";
import bcrypt from "bcryptjs";

const TEST_USERS = [
  { name: "Alex Rivera",     email: "arivera@example.com",   role: "user" },
  { name: "Beth Nguyen",     email: "bnguyen@example.com",   role: "user" },
  { name: "Carlos Mendez",   email: "cmendez@example.com",   role: "manager" },
  { name: "Dana Kim",        email: "dkim@example.com",      role: "user" },
  { name: "Ethan Brooks",    email: "ebrooks@example.com",   role: "user" },
  { name: "Fiona Patel",     email: "fpatel@example.com",    role: "manager" },
  { name: "George Larson",   email: "glarson@example.com",   role: "user" },
  { name: "Hana Yoshida",    email: "hyoshida@example.com",  role: "user" },
  { name: "Ivan Torres",     email: "itorres@example.com",   role: "user" },
  { name: "Julia Chen",      email: "jchen@example.com",     role: "manager" },
  { name: "Kevin Walsh",     email: "kwalsh@example.com",    role: "user" },
  { name: "Laura Scott",     email: "lscott@example.com",    role: "user" },
];

export async function seed(knex: Knex): Promise<void> {
  const passwordHash = await bcrypt.hash("issue123!", 12);

  for (const u of TEST_USERS) {
    const existing = await knex("users").where({ email: u.email }).first();
    if (!existing) {
      await knex("users").insert({
        email: u.email,
        password_hash: passwordHash,
        name: u.name,
        full_name: u.name,
        role: u.role,
        status: "active",
      });
    }
  }

  console.log(`✓ Seeded ${TEST_USERS.length} test users (password: issue123!)`);
  console.log("  Users: arivera, bnguyen, cmendez, dkim, ebrooks, fpatel, glarson, hyoshida, itorres, jchen, kwalsh, lscott");
}
