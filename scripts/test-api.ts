import app from "../src/app";

const server = app.listen(3001, () => console.log("Test server on 3001"));

setTimeout(async () => {
  try {
    const res = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "admin123" }),
    });
    const data = (await res.json()) as any;
    const token = data.accessToken;
    console.log("Got token:", !!token);

    const res2 = await fetch(
      "http://localhost:3001/api/issues/3ed7204d-0817-47fb-87e9-dd1ac6daf9b3",
      { headers: { Authorization: "Bearer " + token } }
    );
    console.log("Status:", res2.status);
    const body = await res2.text();
    console.log("Body:", body.substring(0, 500));
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  server.close();
  process.exit(0);
}, 2000);
