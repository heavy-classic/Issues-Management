import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { authorize } from "../middleware/authorize";
import { validate } from "../middleware/validate";
import * as teamsService from "../services/teamsService";

const router = Router();

router.use(authenticate);

const createTeamSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().optional(),
});

const updateTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

const addMemberSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  role: z.enum(["member", "lead"]).optional(),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(["member", "lead"]),
});

// Read access for all authenticated users
router.get("/", async (_req, res) => {
  const teams = await teamsService.listTeams();
  res.json({ teams });
});

router.get("/:id", async (req, res) => {
  const team = await teamsService.getTeam(req.params.id as string);
  res.json({ team });
});

// Write access for admin and manager
router.post(
  "/",
  authorize("admin", "manager"),
  validate(createTeamSchema),
  async (req, res) => {
    const team = await teamsService.createTeam(
      req.body.name,
      req.body.description
    );
    res.status(201).json({ team });
  }
);

router.patch(
  "/:id",
  authorize("admin", "manager"),
  validate(updateTeamSchema),
  async (req, res) => {
    const team = await teamsService.updateTeam(req.params.id as string, req.body);
    res.json({ team });
  }
);

router.delete("/:id", authorize("admin"), async (req, res) => {
  await teamsService.deleteTeam(req.params.id as string);
  res.json({ message: "Team deleted" });
});

router.post(
  "/:id/members",
  authorize("admin", "manager"),
  validate(addMemberSchema),
  async (req, res) => {
    const member = await teamsService.addMember(
      req.params.id as string,
      req.body.user_id,
      req.body.role
    );
    res.status(201).json({ member });
  }
);

router.delete(
  "/:id/members/:userId",
  authorize("admin", "manager"),
  async (req, res) => {
    await teamsService.removeMember(req.params.id as string, req.params.userId as string);
    res.json({ message: "Member removed" });
  }
);

router.patch(
  "/:id/members/:userId",
  authorize("admin", "manager"),
  validate(updateMemberRoleSchema),
  async (req, res) => {
    const member = await teamsService.updateMemberRole(
      req.params.id as string,
      req.params.userId as string,
      req.body.role
    );
    res.json({ member });
  }
);

export default router;
