import { Router } from "express";
import { z } from "zod";
import { validate } from "../middleware/validate";
import * as authService from "../services/authService";

const router = Router();

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

const logoutSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

router.post("/register", validate(registerSchema), async (req, res) => {
  const user = await authService.registerUser(req.body.email, req.body.password, req.body.name);
  res.status(201).json({ user });
});

router.post("/login", validate(loginSchema), async (req, res) => {
  const tokens = await authService.loginUser(req.body.email, req.body.password);
  res.json(tokens);
});

router.post("/refresh", validate(refreshSchema), async (req, res) => {
  const result = await authService.refreshAccessToken(req.body.refreshToken);
  res.json(result);
});

router.post("/logout", validate(logoutSchema), async (req, res) => {
  await authService.logoutUser(req.body.refreshToken);
  res.json({ message: "Logged out successfully" });
});

export default router;
