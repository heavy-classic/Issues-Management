import db from "../src/db";
import bcrypt from "bcrypt";

async function test() {
  const user = await db("users").where({ email: "admin@example.com" }).first();
  if (user) {
    console.log("User:", user.email, "status:", user.status, "role:", user.role);
    const match = await bcrypt.compare("admin123", user.password_hash);
    console.log("Password match:", match);
    console.log("Hash length:", user.password_hash.length);
  } else {
    console.log("NO ADMIN USER FOUND");
  }

  const count = await db("users").count("* as c").first();
  console.log("Total users:", count?.c);

  await db.destroy();
}
test();
