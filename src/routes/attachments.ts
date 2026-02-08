import { Router, Request, Response } from "express";
import path from "path";
import { authenticate } from "../middleware/authenticate";
import * as attachmentService from "../services/attachmentService";
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

// Get attachment metadata
router.get("/:id", async (req: Request, res: Response) => {
  const attachment = await attachmentService.getAttachment(
    req.params.id as string
  );
  res.json({ attachment });
});

// Download file
router.get("/:id/download", async (req: Request, res: Response) => {
  const { absolutePath, originalName, mimeType } =
    await attachmentService.getAttachmentFilePath(req.params.id as string);

  await attachmentService.incrementDownloadCount(req.params.id as string);

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(originalName)}"`
  );
  res.setHeader("Content-Type", mimeType);
  res.sendFile(absolutePath);
});

// Preview file (inline for viewer)
router.get("/:id/preview", async (req: Request, res: Response) => {
  const { absolutePath, mimeType } =
    await attachmentService.getAttachmentFilePath(req.params.id as string);

  res.setHeader("Content-Disposition", "inline");
  res.setHeader("Content-Type", mimeType);
  res.sendFile(absolutePath);
});

// Thumbnail (same as preview for now)
router.get("/:id/thumbnail", async (req: Request, res: Response) => {
  const { absolutePath, mimeType } =
    await attachmentService.getAttachmentFilePath(req.params.id as string);

  res.setHeader("Content-Type", mimeType);
  res.sendFile(absolutePath);
});

// Soft delete
router.delete("/:id", async (req: Request, res: Response) => {
  await attachmentService.softDeleteAttachment(
    req.params.id as string,
    req.user!.userId,
    getAuditCtx(req)
  );
  res.json({ message: "Attachment deleted" });
});

export default router;
