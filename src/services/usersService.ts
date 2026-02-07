import db from "../db";

export async function listUsers() {
  return db("users")
    .select("id", "email", "name", "created_at")
    .orderBy("email", "asc");
}
