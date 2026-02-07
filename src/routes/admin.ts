import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import * as adminUsersService from "../services/adminUsersService";

const router = Router();

router.use(authenticate);
router.use(authorize("admin"));

const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().max(255).optional(),
  full_name: z.string().max(255).optional(),
  role: z.enum(["user", "manager", "admin"]).optional(),
});

const updateUserSchema = z.object({
  name: z.string().max(255).optional(),
  full_name: z.string().max(255).optional(),
  role: z.enum(["user", "manager", "admin"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

router.get("/users", async (req, res) => {
  const filters = {
    role: req.query.role as string | undefined,
    status: req.query.status as string | undefined,
  };
  const users = await adminUsersService.listAllUsers(filters);
  res.json({ users });
});

router.get("/users/:id", async (req, res) => {
  const user = await adminUsersService.getUserById(req.params.id as string);
  res.json({ user });
});

router.post("/users", validate(createUserSchema), async (req, res) => {
  const user = await adminUsersService.createUser(req.body);
  res.status(201).json({ user });
});

router.patch("/users/:id", validate(updateUserSchema), async (req, res) => {
  const user = await adminUsersService.updateUser(req.params.id as string, req.body);
  res.json({ user });
});

router.post("/users/:id/disable", async (req, res) => {
  const user = await adminUsersService.disableUser(req.params.id as string);
  res.json({ user });
});

router.post("/users/:id/enable", async (req, res) => {
  const user = await adminUsersService.enableUser(req.params.id as string);
  res.json({ user });
});

export default router;
