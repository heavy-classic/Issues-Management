import db from "../src/db";
import bcrypt from "bcrypt";

async function run() {
  const email = "mattsacks@yahoo.com";
  const password = "Test1234!";
  const hash = await bcrypt.hash(password, 12);

  const existing = await db("users").where({ email }).first();
  if (existing) {
    console.log("User already exists:", existing.email);
    await db.destroy();
    return;
  }

  const [user] = await db("users")
    .insert({
      email,
      password_hash: hash,
      name: "Matt",
      full_name: "Matt Sacks",
      role: "admin",
      status: "active",
    })
    .returning("*");

  console.log("Created user:", user.email, "role:", user.role);
  await db.destroy();
}
run();
