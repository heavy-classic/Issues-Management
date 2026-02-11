import express from "express";

let app: express.Express;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  app = require("../src/app").default;
} catch (err: any) {
  // If the main app fails to load, expose the error for debugging
  app = express();
  app.use((_req, res) => {
    res.status(500).json({
      error: "App failed to initialize",
      message: err?.message || String(err),
      stack: err?.stack,
    });
  });
}

export default app;
