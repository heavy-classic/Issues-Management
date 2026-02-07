import db from "../db";
import { AppError } from "../errors/AppError";

export async function listTeams() {
  const teams = await db("teams")
    .select("teams.*")
    .orderBy("teams.name", "asc");

  const counts = await db("team_members")
    .select("team_id")
    .count("* as member_count")
    .groupBy("team_id");

  const countMap = new Map(
    counts.map((c: any) => [c.team_id, Number(c.member_count)])
  );

  return teams.map((t: any) => ({
    ...t,
    member_count: countMap.get(t.id) || 0,
  }));
}

export async function getTeam(teamId: string) {
  const team = await db("teams").where({ id: teamId }).first();
  if (!team) throw new AppError(404, "Team not found");

  const members = await db("team_members")
    .select(
      "team_members.id as membership_id",
      "team_members.role",
      "team_members.joined_at",
      "users.id as user_id",
      "users.email",
      "users.name",
      "users.full_name"
    )
    .leftJoin("users", "team_members.user_id", "users.id")
    .where("team_members.team_id", teamId)
    .orderBy("users.email", "asc");

  return { ...team, members };
}

export async function createTeam(name: string, description?: string) {
  const existing = await db("teams").where({ name }).first();
  if (existing) throw new AppError(409, "Team name already exists");

  const [team] = await db("teams")
    .insert({ name, description: description || "" })
    .returning("*");

  return team;
}

export async function updateTeam(
  teamId: string,
  data: { name?: string; description?: string }
) {
  const existing = await db("teams").where({ id: teamId }).first();
  if (!existing) throw new AppError(404, "Team not found");

  if (data.name) {
    const duplicate = await db("teams")
      .where({ name: data.name })
      .whereNot({ id: teamId })
      .first();
    if (duplicate) throw new AppError(409, "Team name already exists");
  }

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  updateData.updated_at = new Date();

  const [updated] = await db("teams")
    .where({ id: teamId })
    .update(updateData)
    .returning("*");

  return updated;
}

export async function deleteTeam(teamId: string) {
  const existing = await db("teams").where({ id: teamId }).first();
  if (!existing) throw new AppError(404, "Team not found");

  await db("teams").where({ id: teamId }).del();
}

export async function addMember(
  teamId: string,
  userId: string,
  role: string = "member"
) {
  const team = await db("teams").where({ id: teamId }).first();
  if (!team) throw new AppError(404, "Team not found");

  const user = await db("users").where({ id: userId }).first();
  if (!user) throw new AppError(404, "User not found");

  const existing = await db("team_members")
    .where({ team_id: teamId, user_id: userId })
    .first();
  if (existing) throw new AppError(409, "User is already a member of this team");

  const [member] = await db("team_members")
    .insert({ team_id: teamId, user_id: userId, role })
    .returning("*");

  return member;
}

export async function removeMember(teamId: string, userId: string) {
  const deleted = await db("team_members")
    .where({ team_id: teamId, user_id: userId })
    .del();

  if (deleted === 0) throw new AppError(404, "Member not found in this team");
}

export async function updateMemberRole(
  teamId: string,
  userId: string,
  role: string
) {
  const existing = await db("team_members")
    .where({ team_id: teamId, user_id: userId })
    .first();
  if (!existing) throw new AppError(404, "Member not found in this team");

  const [updated] = await db("team_members")
    .where({ team_id: teamId, user_id: userId })
    .update({ role })
    .returning("*");

  return updated;
}
