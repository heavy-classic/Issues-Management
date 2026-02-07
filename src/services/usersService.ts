import db from "../db";

export async function listUsers() {
  return db("users")
    .select("id", "email", "name", "full_name", "role", "status", "created_at")
    .where("status", "active")
    .orderBy("email", "asc");
}
