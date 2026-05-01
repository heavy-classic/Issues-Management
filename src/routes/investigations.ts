import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as investigationsService from "../services/investigationsService";

const router = Router();

router.use(authenticate);

const createInvestigationSchema = z.object({
  type: z.enum(["barrier_analysis", "five_why", "fishbone"]),
  title: z.string().min(1).max(255),
});

const updateInvestigationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.enum(["draft", "complete"]).optional(),
  body: z.record(z.string(), z.unknown()).optional(),
});

// List investigations for an issue
router.get("/issues/:issueId/investigations", async (req, res, next) => {
  try {
    const investigations = await investigationsService.listInvestigations(
      req.params.issueId as string
    );
    res.json({ investigations });
  } catch (err) {
    next(err);
  }
});

// Create investigation for an issue
router.post(
  "/issues/:issueId/investigations",
  validate(createInvestigationSchema),
  async (req, res, next) => {
    try {
      const investigation = await investigationsService.createInvestigation(
        req.params.issueId as string,
        req.user!.userId,
        req.body
      );
      res.status(201).json({ investigation });
    } catch (err) {
      next(err);
    }
  }
);

// Get a single investigation
router.get("/investigations/:id", async (req, res, next) => {
  try {
    const investigation = await investigationsService.getInvestigation(
      req.params.id as string
    );
    res.json({ investigation });
  } catch (err) {
    next(err);
  }
});

// Update an investigation
router.patch(
  "/investigations/:id",
  validate(updateInvestigationSchema),
  async (req, res, next) => {
    try {
      const investigation = await investigationsService.updateInvestigation(
        req.params.id as string,
        req.body
      );
      res.json({ investigation });
    } catch (err) {
      next(err);
    }
  }
);

// Delete an investigation
router.delete("/investigations/:id", async (req, res, next) => {
  try {
    await investigationsService.deleteInvestigation(
      req.params.id as string
    );
    res.json({ message: "Investigation deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
