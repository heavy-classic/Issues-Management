import db from "../db";
import { AppError } from "../errors/AppError";

export async function getPicklistTypes() {
  const result = await db("picklist_values")
    .select("picklist_type")
    .countDistinct("id as count")
    .groupBy("picklist_type")
    .orderBy("picklist_type", "asc");
  return result.map((r: any) => ({
    type: r.picklist_type,
    count: Number(r.count),
  }));
}

export async function getPicklistValues(type: string, activeOnly = false) {
  const query = db("picklist_values")
    .where({ picklist_type: type })
    .orderBy("sort_order", "asc");
  if (activeOnly) query.where({ is_active: true });
  return query;
}

export async function createPicklistValue(data: {
  picklist_type: string;
  value: string;
  label: string;
  color?: string | null;
  sort_order?: number;
  is_active?: boolean;
  description?: string | null;
}) {
  const existing = await db("picklist_values")
    .where({ picklist_type: data.picklist_type, value: data.value })
    .first();
  if (existing) throw new AppError(400, "Value already exists for this picklist type");

  const [row] = await db("picklist_values")
    .insert({
      picklist_type: data.picklist_type,
      value: data.value,
      label: data.label,
      color: data.color || null,
      sort_order: data.sort_order ?? 0,
      is_active: data.is_active ?? true,
      description: data.description || null,
    })
    .returning("*");
  return row;
}

export async function updatePicklistValue(
  id: string,
  data: {
    label?: string;
    color?: string | null;
    sort_order?: number;
    is_active?: boolean;
    description?: string | null;
  }
) {
  const existing = await db("picklist_values").where({ id }).first();
  if (!existing) throw new AppError(404, "Picklist value not found");

  const [row] = await db("picklist_values")
    .where({ id })
    .update({ ...data, updated_at: db.fn.now() })
    .returning("*");
  return row;
}

export async function deletePicklistValue(id: string) {
  const existing = await db("picklist_values").where({ id }).first();
  if (!existing) throw new AppError(404, "Picklist value not found");
  await db("picklist_values").where({ id }).del();
}
