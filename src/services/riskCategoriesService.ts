import db from "../db";
import { AppError } from "../errors/AppError";

export async function listCategories() {
  return db("risk_categories").orderBy("sort_order", "asc").orderBy("name", "asc");
}

export async function getCategory(id: string) {
  const cat = await db("risk_categories").where({ id }).first();
  if (!cat) throw new AppError(404, "Risk category not found");
  return cat;
}

export async function createCategory(data: {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
}, userId: string) {
  const [cat] = await db("risk_categories")
    .insert({
      name: data.name,
      description: data.description || null,
      color: data.color || null,
      icon: data.icon || null,
      sort_order: data.sort_order ?? 0,
      created_by: userId,
    })
    .returning("*");
  return cat;
}

export async function updateCategory(id: string, data: {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  sort_order?: number;
}) {
  const [cat] = await db("risk_categories")
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning("*");
  if (!cat) throw new AppError(404, "Risk category not found");
  return cat;
}

export async function deleteCategory(id: string) {
  const count = await db("risks").where({ category_id: id }).count("id as cnt").first();
  if (count && Number(count.cnt) > 0) {
    throw new AppError(400, "Cannot delete category with associated risks");
  }
  const deleted = await db("risk_categories").where({ id }).del();
  if (!deleted) throw new AppError(404, "Risk category not found");
}
