import bcrypt from "bcryptjs";
import db from "../db";
import { AppError } from "../errors/AppError";

const SALT_ROUNDS = 12;

interface ListUsersFilters {
  role?: string;
  status?: string;
}

export async function listAllUsers(filters: ListUsersFilters = {}) {
  const query = db("users")
    .select(
      "id",
      "email",
      "name",
      "full_name",
      "role",
      "status",
      "last_login_at",
      "created_at"
    )
    .orderBy("created_at", "desc");

  if (filters.role) query.where("role", filters.role);
  if (filters.status) query.where("status", filters.status);

  return query;
}

export async function getUserById(userId: string) {
  const user = await db("users")
    .select(
      "id",
      "email",
      "name",
      "full_name",
      "role",
      "status",
      "last_login_at",
      "created_at",
      "updated_at"
    )
    .where({ id: userId })
    .first();

  if (!user) throw new AppError(404, "User not found");
  return user;
}

interface CreateUserParams {
  email: string;
  password: string;
  name?: string;
  full_name?: string;
  role?: string;
}

export async function createUser(params: CreateUserParams) {
  const existing = await db("users").where({ email: params.email }).first();
  if (existing) throw new AppError(409, "Email already registered");

  const passwordHash = await bcrypt.hash(params.password, SALT_ROUNDS);
  const [user] = await db("users")
    .insert({
      email: params.email,
      password_hash: passwordHash,
      name: params.name || null,
      full_name: params.full_name || null,
      role: params.role || "user",
    })
    .returning([
      "id",
      "email",
      "name",
      "full_name",
      "role",
      "status",
      "created_at",
    ]);

  return user;
}

interface UpdateUserParams {
  name?: string;
  full_name?: string;
  role?: string;
  status?: string;
}

export async function updateUser(userId: string, params: UpdateUserParams) {
  const existing = await db("users").where({ id: userId }).first();
  if (!existing) throw new AppError(404, "User not found");

  const updateData: Record<string, unknown> = {};
  if (params.name !== undefined) updateData.name = params.name;
  if (params.full_name !== undefined) updateData.full_name = params.full_name;
  if (params.role !== undefined) updateData.role = params.role;
  if (params.status !== undefined) updateData.status = params.status;

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, "No fields to update");
  }

  updateData.updated_at = new Date();

  const [updated] = await db("users")
    .where({ id: userId })
    .update(updateData)
    .returning([
      "id",
      "email",
      "name",
      "full_name",
      "role",
      "status",
      "created_at",
      "updated_at",
    ]);

  return updated;
}

export async function disableUser(userId: string) {
  return updateUser(userId, { status: "disabled" });
}

export async function enableUser(userId: string) {
  return updateUser(userId, { status: "active" });
}
