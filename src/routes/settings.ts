import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import db from "../db";

const router = Router();

// Public read (authenticated) — anyone logged in can fetch settings
router.get("/:key", authenticate, async (req, res) => {
  const row = await db("app_settings").where({ key: req.params.key }).first();
  res.json({ key: req.params.key, value: row?.value ?? "" });
});

// Admin-only write
router.put("/:key", authenticate, authorize("admin"), async (req, res) => {
  const { value } = req.body;
  await db("app_settings")
    .insert({ key: req.params.key, value, updated_at: new Date() })
    .onConflict("key")
    .merge({ value, updated_at: new Date() });
  res.json({ success: true });
});

export default router;
