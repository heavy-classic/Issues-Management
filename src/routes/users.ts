import { Router } from "express";
import { authenticate } from "../middleware/authenticate";
import * as usersService from "../services/usersService";

const router = Router();

router.get("/", authenticate, async (_req, res) => {
  const users = await usersService.listUsers();
  res.json({ users });
});

export default router;
