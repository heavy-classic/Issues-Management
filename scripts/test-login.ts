import app from "../src/app";

const server = app.listen(3099, async () => {
  try {
    const res = await fetch("http://localhost:3099/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "admin123" }),
    });
    console.log("Status:", res.status);
    const body = await res.text();
    console.log("Body:", body.substring(0, 500));
  } catch (e: any) {
    console.error("Fetch error:", e.message);
  }
  server.close();
  process.exit(0);
});
