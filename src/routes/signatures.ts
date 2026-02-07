import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as signatureService from "../services/signatureService";
import type { AuditContext } from "../services/auditService";

const router = Router();

router.use(authenticate);

function getAuditCtx(req: any): AuditContext {
  return {
    userId: req.user!.userId,
    userName:
      req.userRecord?.full_name ||
      req.userRecord?.name ||
      req.user!.email,
    ipAddress: req.requestIp,
    userAgent: req.requestUserAgent,
  };
}

const createSignatureSchema = z.object({
  issue_id: z.string().uuid("Invalid issue ID"),
  workflow_stage_id: z.string().uuid("Invalid stage ID"),
  password: z.string().min(1, "Password is required"),
  signature_meaning: z.string().min(1, "Signature meaning is required"),
  signature_reason: z.string().optional(),
});

// Create a new electronic signature
router.post("/", validate(createSignatureSchema), async (req, res) => {
  const signature = await signatureService.createSignature(
    {
      issueId: req.body.issue_id,
      workflowStageId: req.body.workflow_stage_id,
      userId: req.user!.userId,
      password: req.body.password,
      signatureMeaning: req.body.signature_meaning,
      signatureReason: req.body.signature_reason,
    },
    getAuditCtx(req)
  );
  res.status(201).json({ signature });
});

// Get available signature meanings
router.get("/meanings", async (_req, res) => {
  res.json({ meanings: signatureService.SIGNATURE_MEANINGS });
});

// Get all signatures for an issue
router.get("/issue/:issueId", async (req, res) => {
  const signatures = await signatureService.getSignaturesForIssue(
    req.params.issueId as string
  );
  res.json({ signatures });
});

// Get signatures for a specific issue + stage
router.get("/issue/:issueId/stage/:stageId", async (req, res) => {
  const signatures = await signatureService.getSignaturesForStage(
    req.params.issueId as string,
    req.params.stageId as string
  );
  res.json({ signatures });
});

// Get a single signature
router.get("/:id", async (req, res) => {
  const signature = await signatureService.getSignature(req.params.id as string);
  res.json({ signature });
});

// Verify a signature's hash integrity
router.get("/:id/verify", async (req, res) => {
  const result = await signatureService.verifySignatureHash(req.params.id as string);
  res.json(result);
});

export default router;
