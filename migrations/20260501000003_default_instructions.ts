import type { Knex } from "knex";

// ─── Helper ──────────────────────────────────────────────────────────────────
async function upsert(knex: Knex, key: string, value: string) {
  const existing = await knex("app_settings").where({ key }).first();
  if (existing) {
    // Don't overwrite instructions the admin has already customised
    if (existing.value && existing.value.trim() !== "") return;
    await knex("app_settings").where({ key }).update({ value, updated_at: knex.fn.now() });
  } else {
    await knex("app_settings").insert({ key, value });
  }
}

// ─── Up ──────────────────────────────────────────────────────────────────────
export async function up(knex: Knex): Promise<void> {

  // ── RISK FORM ──────────────────────────────────────────────────────────────
  await upsert(knex, "risk_instructions",
`Use this form to capture a new risk before it materialises into an issue.

• Title — write a brief, plain-language description of the risk event (e.g. "Supplier XYZ may fail to deliver on time")
• Category — select the closest risk category; contact the Risk Team if none fits
• Likelihood & Consequence — score both honestly; the system calculates the overall rating automatically
• Owner — assign the person responsible for monitoring and treating this risk
• Description — include the risk cause, the event, and the potential impact on objectives
• Existing Controls — list any controls already in place before treatment is agreed

Submit only confirmed risks. Speculative or hypothetical scenarios should be discussed with your manager first.`
  );

  // ── AUDIT FORM ─────────────────────────────────────────────────────────────
  await upsert(knex, "audit_instructions",
`Complete all required fields before submitting a new audit record.

• Audit Title — use the format: [Area/Process] Audit [YYYY-QN] (e.g. "Warehouse Operations Audit 2026-Q2")
• Type — select the audit type: Internal, External, Regulatory, or Supplier
• Lead Auditor — the person accountable for conducting and signing off the audit
• Planned Start & End Dates — these define the audit window and trigger scheduling reminders
• Scope — clearly state what is included and excluded from this audit
• Objective — describe what the audit aims to verify or assess

Once submitted, the audit will move to Scheduled status and the Lead Auditor will be notified. Ensure all supporting documents (checklists, prior audit reports) are attached before the audit begins.`
  );

  // ── LESSON FORM ────────────────────────────────────────────────────────────
  await upsert(knex, "lesson_instructions",
`Lessons learned are most valuable when captured promptly and with enough detail for others to act on.

• Title — state the lesson concisely: what happened and what was learned
• Project / Area — link the lesson to the project, process, or area where the experience occurred
• Category — classify the lesson (Technical, Process, People, Safety, etc.)
• Description — explain the situation, what went wrong or worked well, why it happened, and what was done
• Recommendation — state clearly what others should do (or avoid) in the same situation
• Attach Evidence — photos, reports, data files, or before/after comparisons strengthen the lesson

Quality lessons are specific, actionable, and transferable. Avoid vague statements like "communicate better" — explain exactly how and with whom.`
  );

  // ── PROCEDURE FORM ─────────────────────────────────────────────────────────
  await upsert(knex, "procedure_instructions",
`Use this form to create a new Standard Operating Procedure (SOP) or work instruction.

• Title — use a verb-noun format: "Calibrate Temperature Sensors", "Process Customer Returns"
• Document Number — if your organisation uses document control numbers, enter it here; otherwise leave blank
• Owner — the role or person responsible for maintaining this procedure
• Effective Date — when this version comes into force
• Review Date — set a realistic review cycle (usually 1–3 years depending on risk)
• Scope — briefly state who this procedure applies to and in what situations
• Body — write steps in plain language. Use numbered lists for sequential actions, bullet points for non-sequential items.

All procedures require approval before publication. Draft procedures are visible only to the author and administrators until approved.`
  );

  // ── RISK STATUS INSTRUCTIONS ───────────────────────────────────────────────
  await upsert(knex, "instructions:risks:status:identified",
`This risk has been logged and is awaiting initial assessment.

Next steps for the Risk Owner:
• Confirm the risk description is accurate and the correct category is assigned
• Verify likelihood and consequence scores are appropriate
• Identify any existing controls that are already in place
• Move to "Under Assessment" once you have started the formal assessment process

Do not leave risks in this status for more than 5 business days.`
  );

  await upsert(knex, "instructions:risks:status:under_assessment",
`A formal assessment is in progress for this risk.

During this phase:
• Review and validate the likelihood and consequence ratings with relevant subject-matter experts
• Document all existing controls and evaluate their effectiveness
• Determine whether the current risk rating is acceptable or requires treatment
• Complete the risk assessment section and update the residual risk rating

Move to "Assessed" once the assessment is complete and peer-reviewed.`
  );

  await upsert(knex, "instructions:risks:status:assessed",
`The risk has been assessed. A treatment decision is required.

Options:
• Treat — develop a Risk Treatment Plan to reduce likelihood or consequence
• Accept — if the residual risk is within tolerance, document the acceptance rationale
• Transfer — if the risk will be transferred (e.g. via insurance or contract), document the mechanism
• Avoid — if the activity creating the risk will be discontinued

Assign a Treatment Owner and set a target completion date before progressing.`
  );

  await upsert(knex, "instructions:risks:status:in_treatment",
`A Risk Treatment Plan is being implemented.

Risk Owner responsibilities during treatment:
• Ensure treatment actions are progressing against agreed milestones
• Update the treatment progress notes regularly (at least monthly)
• Escalate any blockers or delays to the Risk Manager immediately
• Re-assess the risk rating once treatment actions are complete

Move to "Monitoring" once all treatment actions have been completed and verified.`
  );

  await upsert(knex, "instructions:risks:status:monitoring",
`Treatment has been completed. This risk is now under ongoing monitoring.

Monitoring requirements:
• Review risk indicators at the agreed monitoring frequency
• Confirm that implemented controls remain effective over time
• Document any changes in the risk environment that may affect the rating
• Escalate if the risk re-emerges or the residual rating increases

If monitoring reveals the risk is consistently within tolerance, consider moving to "Accepted". If the risk materialises, raise a linked Issue.`
  );

  await upsert(knex, "instructions:risks:status:under_review",
`This risk is under management review, typically as part of a periodic risk review cycle.

During review:
• Confirm that the risk description, category, and ratings remain current
• Verify that all controls and treatment actions are still in place and effective
• Consider whether new risks have emerged from the same source
• Update the review date and record any changes made

Complete the review and move the risk to its appropriate post-review status.`
  );

  await upsert(knex, "instructions:risks:status:accepted",
`This risk has been formally accepted within organisational risk tolerance.

Acceptance conditions:
• The acceptance rationale must be documented and approved by an appropriate authority
• Accepted risks must still be reviewed periodically — they do not disappear
• If circumstances change and the risk rating increases, revisit the acceptance decision
• An acceptance does not mean the risk is ignored — it means the current controls are deemed sufficient

Set a review date to ensure acceptance remains valid over time.`
  );

  await upsert(knex, "instructions:risks:status:closed",
`This risk has been closed. No further action is required unless it re-emerges.

Before closing, confirm:
• The risk no longer exists or has been fully eliminated (not just tolerated)
• All associated treatment actions are complete and verified
• Final notes documenting the closure rationale have been recorded
• Any lessons learned from this risk have been captured in the Lessons module

Closed risks are retained for audit and historical analysis. They cannot be deleted.`
  );

  // ── AUDIT STATUS INSTRUCTIONS ──────────────────────────────────────────────
  await upsert(knex, "instructions:audits:status:draft",
`This audit is in draft and has not yet been formally scheduled.

While in draft:
• Define the audit scope, objectives, and criteria clearly
• Select and confirm the Lead Auditor and any supporting auditors
• Identify the auditee(s) and relevant process owners
• Attach any reference documents such as previous audit reports, checklists, or applicable standards
• Set realistic planned start and end dates

Move to "Scheduled" once the audit plan has been reviewed and the auditee has been notified.`
  );

  await upsert(knex, "instructions:audits:status:scheduled",
`This audit has been scheduled and the auditee has been notified.

In the lead-up to the audit:
• Confirm all logistics: location, access, required systems or records
• Issue the formal audit notification to the auditee at least 5 business days in advance
• Distribute the audit agenda and any pre-audit questionnaires
• Finalise the audit checklist and assign responsibilities among auditors
• Review any previous audit findings related to this scope

Move to "Planning" once the detailed audit plan and checklist are finalised.`
  );

  await upsert(knex, "instructions:audits:status:planning",
`Detailed planning is underway for this audit.

During planning:
• Finalise the audit checklist or question set based on the scope and applicable requirements
• Allocate specific audit areas to individual auditors if a team is involved
• Review prior non-conformances, corrective actions, and risk areas to focus audit attention
• Confirm document and record access with the auditee
• Prepare opening meeting materials and confirm the audit schedule with all parties

Move to "In Progress" once fieldwork has commenced.`
  );

  await upsert(knex, "instructions:audits:status:in_progress",
`This audit is currently being conducted.

During fieldwork:
• Document observations, evidence references, and interviewee names as you go
• Record findings against the specific clause, procedure, or requirement they relate to
• Classify findings correctly: Non-conformance (major/minor), Observation, or Opportunity for Improvement
• Do not discuss preliminary findings with the auditee until the closing meeting
• Raise any immediate safety or compliance concerns to management without delay

Attach completed checklists and evidence as you work. Move to "Under Review" once fieldwork is complete and the draft report is ready.`
  );

  await upsert(knex, "instructions:audits:status:under_review",
`The audit fieldwork is complete and the draft report is under review.

Review process:
• Lead Auditor: review all findings for accuracy, completeness, and correct classification
• Obtain technical or subject-matter peer review for any complex findings
• Share the draft report with the auditee for factual accuracy check (not for challenging findings)
• Resolve any factual disputes before finalising
• Ensure each finding has a clear requirement reference and evidence citation

Issue corrective action requests for all Non-conformances before or alongside the final report. Move to "Closed" once the report is finalised and distributed.`
  );

  await upsert(knex, "instructions:audits:status:closed",
`This audit has been completed and the final report has been issued.

Post-audit requirements:
• Ensure all Non-conformance findings have linked corrective actions raised in the Issues module
• Confirm that the auditee has acknowledged receipt of the report
• Record the date the report was formally distributed
• Schedule follow-up verification activities as required by your audit program
• Capture any audit process improvements as Lessons Learned

Closed audits are retained for programme analysis and accreditation purposes.`
  );

  // ── ISSUE STAGE INSTRUCTIONS (query live stage UUIDs) ─────────────────────
  const issueStages = await knex("workflow_stages").orderBy("position", "asc");

  const issueStageInstructions: Record<string, string> = {
    "Initiate": `This issue has just been created and needs initial triage.

Actions required:
• Review the issue description and confirm it is clear and accurate — request clarification from the reporter if needed
• Verify the correct Priority has been assigned; escalate Critical issues immediately
• Assign the issue to the appropriate owner if not already assigned
• Confirm the Source and Department fields are completed
• Link any related issues, risks, or corrective actions if applicable

Move to "Screening" once the issue is fully understood and ownership is confirmed.`,

    "Screening": `This issue is being screened for validity, categorisation, and prioritisation.

During screening:
• Determine whether this is a valid, unique issue — check for duplicates
• Confirm the root cause category and adjust priority if new information comes to light
• Decide whether the issue requires immediate containment actions (interim fixes)
• Assess whether a formal investigation or root cause analysis (RCA) is required
• Communicate the outcome of screening to the reporter

Move to "Action Plan" once categorisation is confirmed and the path forward is agreed.`,

    "Action Plan": `An action plan is being developed to address this issue.

Requirements for this stage:
• Document the root cause (or most probable cause) based on available evidence
• Define at least one Corrective Action and one Preventive Action where applicable
• Assign each action to a responsible person with a realistic due date
• Actions should be SMART: Specific, Measurable, Achievable, Relevant, Time-bound
• Get sign-off from the Issue Owner or delegate before progressing

⚠ This stage requires a signature before advancing. Ensure all required fields are completed.

Move to "Completing" once the action plan is approved.`,

    "Completing": `The action plan has been approved and actions are being executed.

During this stage:
• Update action statuses regularly as work progresses
• Attach evidence of completed actions (photos, records, test results)
• Escalate any blockers or delays immediately — do not wait for the due date
• Verify that completed actions have actually resolved the root cause
• Interim or containment actions should be clearly distinguished from permanent fixes

⚠ This stage requires a signature before advancing. Ensure all actions are complete and evidenced.

Move to "Closeout" once all actions are complete and verified.`,

    "Closeout": `This issue is in final review prior to closure.

Closeout checklist:
• All corrective and preventive actions are complete and evidence is attached
• The resolution has been verified to be effective (no recurrence)
• The reporter has been notified of the outcome
• Any lessons learned have been captured in the Lessons module
• Supporting documentation is attached and the issue record is complete

⚠ Closeout requires a signature from an authorised reviewer. Once signed and saved, the issue will be marked as closed.

Do not close issues where effectiveness has not yet been confirmed — use "Monitoring" comments to track until verified.`,
  };

  for (const stage of issueStages) {
    const text = issueStageInstructions[stage.name];
    if (text) {
      await upsert(knex, `instructions:issues:stage:${stage.id}`, text);
    }
  }

  // ── LESSON STAGE INSTRUCTIONS (query live stage UUIDs) ────────────────────
  const lessonStages = await knex("lesson_workflow_stages").orderBy("position", "asc");

  const lessonStageInstructions: Record<string, string> = {
    "Identify": `A new lesson has been identified and captured.

Next steps:
• Verify the lesson has a clear, specific title that communicates the key takeaway
• Confirm the relevant project or process area is recorded
• Assign the lesson to a responsible owner for documentation
• Note whether this lesson is positive (what worked well) or negative (what to avoid/improve)

Move to "Document" once ownership is confirmed and the initial capture is complete.`,

    "Document": `The lesson is being fully documented.

Documentation standards:
• Situation — describe the context: what project, process, or environment the lesson relates to
• What happened — explain the sequence of events clearly and factually
• Root cause — identify why it happened (use 5 Whys or fishbone if helpful)
• Impact — describe the actual or potential effect on cost, schedule, quality, or safety
• Recommendation — state specifically what others should do differently next time
• Attach evidence — photos, data, project files, or reports that support the lesson

Write for your audience: someone who was not present should be able to understand and act on this lesson.

Move to "Review" once the documentation is complete and ready for peer feedback.`,

    "Review": `This lesson is under peer or team review.

Reviewer responsibilities:
• Assess whether the lesson is specific enough to be actionable by others
• Verify the root cause analysis is sound and the recommendation follows logically
• Check that sensitive information (personal data, commercially sensitive details) is appropriately handled
• Provide written feedback in the Comments section — do not edit the body directly
• Approve or return with comments within 5 business days

⚠ This stage requires a signature to advance. Reviewers must sign off before the lesson moves to Approve.`,

    "Approve": `This lesson is awaiting management or governance approval for publication.

Approver responsibilities:
• Confirm the lesson meets organisational quality standards for publication
• Assess whether the recommendation has wider applicability across departments or projects
• Verify that any actions recommended in the lesson have been or will be assigned
• Ensure the lesson does not contain confidential, legally sensitive, or unverified information

⚠ Approval requires a signature. Once approved, the lesson will become visible in the Lessons knowledge base.

Return to "Review" if substantive changes are required.`,

    "Implement": `The lesson has been approved. Recommendations are being implemented.

During implementation:
• Identify the processes, procedures, or training materials that need to be updated
• Raise linked Issues or Actions for any procedural or systemic changes required
• Assign implementation tasks to the relevant process or system owners
• Set a realistic target date for implementation completion
• Document progress in the Comments section

Move to "Validate" once all implementation activities are complete.`,

    "Validate": `Implementation is complete. Effectiveness is being validated.

Validation activities:
• Confirm that the recommended changes have been made (procedure updates, training, system changes)
• Verify that affected staff have been informed or trained on the change
• Check for any early indicators that the lesson has been successfully embedded
• If possible, identify a future event or audit where the lesson's effectiveness can be measured

Move to "Archive" once validation confirms the lesson has been successfully applied.`,

    "Archive": `This lesson has been validated and is now archived in the knowledge base.

Archive notes:
• Archived lessons are searchable and visible to all users
• No further changes should be made to the lesson content
• If circumstances change and the lesson needs to be updated, create a new lesson referencing this one
• Periodically review archived lessons to confirm they remain current and accurate

Thank you for contributing to the organisation's collective knowledge.`,
  };

  for (const stage of lessonStages) {
    const text = lessonStageInstructions[stage.name];
    if (text) {
      await upsert(knex, `instructions:lessons:stage:${stage.id}`, text);
    }
  }
}

// ─── Down ─────────────────────────────────────────────────────────────────────
export async function down(knex: Knex): Promise<void> {
  const keysToRemove = [
    "risk_instructions",
    "audit_instructions",
    "lesson_instructions",
    "procedure_instructions",
    // risk statuses
    "instructions:risks:status:identified",
    "instructions:risks:status:under_assessment",
    "instructions:risks:status:assessed",
    "instructions:risks:status:in_treatment",
    "instructions:risks:status:monitoring",
    "instructions:risks:status:under_review",
    "instructions:risks:status:accepted",
    "instructions:risks:status:closed",
    // audit statuses
    "instructions:audits:status:draft",
    "instructions:audits:status:scheduled",
    "instructions:audits:status:planning",
    "instructions:audits:status:in_progress",
    "instructions:audits:status:under_review",
    "instructions:audits:status:closed",
  ];
  await knex("app_settings").whereIn("key", keysToRemove).delete();

  // Also remove stage instructions for issues and lessons
  await knex("app_settings").whereLike("key", "instructions:issues:stage:%").delete();
  await knex("app_settings").whereLike("key", "instructions:lessons:stage:%").delete();
}
