import { Router } from "express";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.get("/", authenticate, (req, res) => {
  res.json({
    message: "You have access to this protected route",
    user: req.user,
  });
});

export default router;
