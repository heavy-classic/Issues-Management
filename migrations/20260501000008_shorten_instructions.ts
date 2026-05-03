import type { Knex } from "knex";

// Force-overwrite the default instructions with shorter versions.
async function set(knex: Knex, key: string, value: string) {
  const existing = await knex("app_settings").where({ key }).first();
  if (existing) {
    await knex("app_settings").where({ key }).update({ value, updated_at: knex.fn.now() });
  } else {
    await knex("app_settings").insert({ key, value });
  }
}

export async function up(knex: Knex): Promise<void> {

  // ── Form instructions ───────────────────────────────────────────────────────

  await set(knex, "risk_instructions",
`Complete all required fields. Score likelihood and consequence honestly — the system calculates the overall risk rating. Assign an owner before submitting.`
  );

  await set(knex, "audit_instructions",
`Fill in the title, type, lead auditor, and planned dates. State the scope and objective clearly. Attach any relevant checklists or prior reports before starting fieldwork.`
  );

  await set(knex, "lesson_instructions",
`Capture the lesson promptly. State what happened, why, and what others should do differently. Attach supporting evidence where available.`
  );

  await set(knex, "procedure_instructions",
`Use a verb-noun title (e.g. "Calibrate Sensors"). Assign an owner and set an effective date. Write steps in plain language — numbered for sequential actions. Approval is required before publication.`
  );

  // ── Risk status instructions ─────────────────────────────────────────────────

  await set(knex, "instructions:risks:status:identified",
`Risk logged and awaiting assessment. Confirm the description, category, and scores are accurate. Assign an owner and move to "Under Assessment" within 5 business days.`
  );

  await set(knex, "instructions:risks:status:under_assessment",
`Formal assessment in progress. Validate ratings with subject-matter experts, evaluate existing controls, and determine whether treatment is required. Move to "Assessed" when complete.`
  );

  await set(knex, "instructions:risks:status:assessed",
`Assessment complete. Decide: Treat, Accept, Transfer, or Avoid. Assign a treatment owner and target date before progressing.`
  );

  await set(knex, "instructions:risks:status:in_treatment",
`Treatment plan being implemented. Update progress notes monthly, escalate blockers promptly. Move to "Monitoring" once all treatment actions are complete and verified.`
  );

  await set(knex, "instructions:risks:status:monitoring",
`Treatment complete — ongoing monitoring required. Review at the agreed frequency, confirm controls remain effective. Escalate if the risk re-emerges.`
  );

  await set(knex, "instructions:risks:status:under_review",
`Periodic management review in progress. Confirm the description, ratings, and controls are still current. Record any changes and update the review date.`
  );

  await set(knex, "instructions:risks:status:accepted",
`Risk formally accepted within tolerance. Document the rationale. Accepted risks must still be reviewed periodically — set a review date.`
  );

  await set(knex, "instructions:risks:status:closed",
`Risk fully eliminated or superseded. Confirm all treatment actions are complete, record the closure rationale, and capture any lessons learned.`
  );

  // ── Audit status instructions ────────────────────────────────────────────────

  await set(knex, "instructions:audits:status:draft",
`Define the scope, objectives, and criteria. Select the lead auditor, identify the auditee, and set planned dates. Move to "Scheduled" once the audit plan is agreed.`
  );

  await set(knex, "instructions:audits:status:scheduled",
`Audit scheduled and auditee notified. Issue the formal notification at least 5 days in advance, distribute the agenda, and finalise the checklist.`
  );

  await set(knex, "instructions:audits:status:planning",
`Finalise the checklist, allocate areas to auditors, and review prior findings. Confirm document access with the auditee. Move to "In Progress" when fieldwork begins.`
  );

  await set(knex, "instructions:audits:status:in_progress",
`Fieldwork underway. Document observations and evidence as you go. Classify findings correctly (Non-conformance, Observation, OFI). Move to "Under Review" when the draft report is ready.`
  );

  await set(knex, "instructions:audits:status:under_review",
`Draft report under review. Check findings for accuracy and classification. Share with auditee for factual review only. Raise corrective actions for all non-conformances before finalising.`
  );

  await set(knex, "instructions:audits:status:closed",
`Audit complete and report issued. Ensure all non-conformances have linked corrective actions. Confirm the auditee has acknowledged receipt and schedule any follow-up verification.`
  );

  // ── Issue stage instructions (update existing rows by stage name) ────────────

  const issueStageInstructions: Record<string, string> = {
    "Initiate":
`Review the issue description and confirm it is clear. Verify priority and assign an owner. Ensure Source and Department are filled in. Move to "Screening" once triage is complete.`,

    "Screening":
`Confirm this is a valid, unique issue. Check for duplicates. Assess whether immediate containment actions are needed. Decide if a formal investigation is required. Move to "Action Plan" once the path forward is agreed.`,

    "Investigation":
`Root cause investigation required before an action plan can be developed. Complete at least one analysis (Barrier Analysis, 5-Why, or Fishbone) and mark it Complete before advancing.`,

    "Action Plan":
`Document the root cause and define corrective and preventive actions. Assign each action to a responsible person with a due date. ⚠ Signature required to advance.`,

    "Completing":
`Actions are being executed. Update statuses regularly, attach evidence of completion, and escalate any blockers. ⚠ Signature required before moving to Closeout.`,

    "Closeout":
`Final review before closure. Confirm all actions are complete and evidenced, the reporter has been notified, and lessons learned have been captured. ⚠ Authorised signature required to close.`,
  };

  const issueStages = await knex("workflow_stages").orderBy("position", "asc");
  for (const stage of issueStages) {
    const text = issueStageInstructions[stage.name];
    if (text) {
      await set(knex, `instructions:issues:stage:${stage.id}`, text);
    }
  }

  // ── Lesson stage instructions ─────────────────────────────────────────────────

  const lessonStageInstructions: Record<string, string> = {
    "Identify":
`Verify the lesson has a clear, specific title. Confirm the project or process area and assign an owner. Move to "Document" once ownership is confirmed.`,

    "Document":
`Write up the situation, what happened, why it happened, the impact, and the recommendation. Attach supporting evidence. Move to "Review" when documentation is complete.`,

    "Review":
`Assess whether the lesson is specific and actionable. Provide written feedback in Comments. ⚠ Signature required to advance to Approve.`,

    "Approve":
`Confirm the lesson meets quality standards for publication and contains no sensitive or unverified information. ⚠ Signature required to publish.`,

    "Implement":
`Identify and update affected processes, procedures, or training. Raise linked actions for any systemic changes required. Move to "Validate" when implementation is complete.`,

    "Validate":
`Confirm recommended changes have been made and affected staff informed. Verify the lesson has been successfully embedded. Move to "Archive" once validated.`,

    "Archive":
`Lesson validated and archived. Visible and searchable by all users. Create a new lesson referencing this one if an update is ever needed.`,
  };

  const lessonStages = await knex("lesson_workflow_stages").orderBy("position", "asc");
  for (const stage of lessonStages) {
    const text = lessonStageInstructions[stage.name];
    if (text) {
      await set(knex, `instructions:lessons:stage:${stage.id}`, text);
    }
  }
}

export async function down(_knex: Knex): Promise<void> {
  // No rollback — admins can edit instructions directly in the UI
}
