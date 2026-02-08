import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import db from "../db";

const router = Router();

router.get("/", authenticate, async (req, res) => {
  const userRecord = await db("users")
    .select("id", "email", "name", "full_name", "role")
    .where({ id: req.user!.userId })
    .first();

  res.json({
    message: "You have access to this protected route",
    user: userRecord
      ? {
          userId: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
          fullName: userRecord.full_name,
          role: userRecord.role,
        }
      : req.user,
  });
});

export default router;
