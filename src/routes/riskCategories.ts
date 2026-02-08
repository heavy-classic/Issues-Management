import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/authenticate";
import { validate } from "../middleware/validate";
import * as riskCategoriesService from "../services/riskCategoriesService";

const router = Router();

router.use(authenticate);

const categorySchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  color: z.string().max(7).optional(),
  icon: z.string().max(50).optional(),
  sort_order: z.number().int().optional(),
});

router.get("/", async (_req, res, next) => {
  try {
    const categories = await riskCategoriesService.listCategories();
    res.json({ categories });
  } catch (err) {
    next(err);
  }
});

router.post("/", validate(categorySchema), async (req: any, res, next) => {
  try {
    const category = await riskCategoriesService.createCategory(req.body, req.user!.userId);
    res.status(201).json({ category });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", validate(categorySchema.partial()), async (req: any, res, next) => {
  try {
    const category = await riskCategoriesService.updateCategory(req.params.id as string, req.body);
    res.json({ category });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req: any, res, next) => {
  try {
    await riskCategoriesService.deleteCategory(req.params.id as string);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
