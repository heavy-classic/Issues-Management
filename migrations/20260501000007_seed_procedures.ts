import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
  // ── Procedure 1: Lockout/Tagout ───────────────────────────────────────────
  const [proc1] = await knex("procedures").insert({
    id: knex.fn.uuid(),
    procedure_number: "EHS-001",
    title: "Lockout / Tagout (LOTO) — Energy Isolation",
    procedure_type: "Safety",
    status: "approved",
    revision_number: 3,
    revision_date: "2026-01-15",
    revision_description: "Updated to reflect new equipment additions in Building C",
    approval_date: "2026-01-20",
    building_unit: "All Facilities",
    safety_classification: "High Risk",
    purpose: "Establish requirements to ensure machines and equipment are properly isolated from all potentially hazardous energy sources before maintenance or servicing.",
    scope: "Applies to all employees and contractors who perform maintenance, repair, or servicing of equipment where unexpected energization or release of stored energy could cause injury.",
    applicability: "All production areas, maintenance departments, and contractor personnel working on facility equipment.",
    precautions: "WARNING: Failure to properly lockout/tagout equipment before servicing may result in serious injury or death from unexpected energization, release of stored mechanical energy, or release of hazardous materials.\n\n• Never attempt to restart equipment that has a lock or tag applied by another employee\n• Verify zero energy state before beginning work\n• Each authorized employee must apply their own personal lock",
    prereq_planning: "Obtain the equipment-specific energy control procedure from the LOTO binder in the maintenance office. Review all energy sources for the equipment (electrical, pneumatic, hydraulic, gravitational, thermal).",
    prereq_documents: "• Equipment-specific LOTO procedure\n• Maintenance work order\n• Contractor safety orientation form (if applicable)",
    prereq_tools: "• Assigned personal safety lock (keyed to individual)\n• Lockout hasp (for multiple lockout points)\n• Lockout tags\n• Voltage tester / multimeter\n• Appropriate PPE (safety glasses, gloves)",
    prereq_field_prep: "Notify affected employees and supervisors that equipment will be taken out of service. Post appropriate signage at the work area.",
    prereq_approvals: "Supervisor sign-off required before initiating LOTO on critical production equipment.",
    post_testing: "After servicing is complete and before removing locks, verify all tools and materials have been removed from the equipment. Confirm all guards are reinstalled.",
    post_restoration: "Remove lockout devices in reverse order. Restore all energy sources to normal operating condition. Remove all tags and notify affected personnel that equipment is being returned to service.",
    post_results: "Document completion in the maintenance log. Note any abnormalities discovered during service in the equipment history file.",
    records_section: "Completed LOTO records must be filed in the equipment folder and retained for a minimum of 3 years.",
    source_requirements: "OSHA 29 CFR 1910.147 — Control of Hazardous Energy",
  }).returning("*");

  const [sec1a] = await knex("procedure_sections").insert({
    id: knex.fn.uuid(),
    procedure_id: proc1.id,
    title: "Notify and Prepare",
    sequence_number: 1,
  }).returning("*");
  await knex("procedure_steps").insert([
    { id: knex.fn.uuid(), section_id: sec1a.id, step_text: "Notify all affected employees that servicing is about to begin and that equipment will be shut down.", sequence_number: 1, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec1a.id, step_text: "Identify all energy sources for the equipment using the equipment-specific LOTO procedure.", sequence_number: 2, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec1a.id, step_text: "Obtain all necessary locks, tags, and blocking devices.", sequence_number: 3, step_type: "action", step_level: 1, is_nonsequential: false },
  ]);

  const [sec1b] = await knex("procedure_sections").insert({
    id: knex.fn.uuid(),
    procedure_id: proc1.id,
    title: "Shutdown and Isolate",
    sequence_number: 2,
  }).returning("*");
  await knex("procedure_steps").insert([
    { id: knex.fn.uuid(), section_id: sec1b.id, step_text: "Perform a normal equipment shutdown using the established stop procedure.", sequence_number: 1, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec1b.id, step_text: "Operate all energy isolation devices to the OFF or CLOSED position.", sequence_number: 2, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec1b.id, step_text: "Apply your personal safety lock and tag to each energy isolation point.", sequence_number: 3, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec1b.id, step_text: "Verify zero energy state: attempt to start equipment using normal controls. Verify using a voltage meter for electrical energy.", sequence_number: 4, step_type: "verification", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec1b.id, step_text: "Release or restrain all stored or residual energy (capacitors, springs, gravity).", sequence_number: 5, step_type: "action", step_level: 1, is_nonsequential: false },
  ]);

  const [sec1c] = await knex("procedure_sections").insert({
    id: knex.fn.uuid(),
    procedure_id: proc1.id,
    title: "Restore Equipment to Service",
    sequence_number: 3,
  }).returning("*");
  await knex("procedure_steps").insert([
    { id: knex.fn.uuid(), section_id: sec1c.id, step_text: "Verify that all work is complete and all personnel are clear of the equipment.", sequence_number: 1, step_type: "verification", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec1c.id, step_text: "Each authorized employee removes their personal lock and tag.", sequence_number: 2, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec1c.id, step_text: "Restore energy sources and verify normal operation.", sequence_number: 3, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec1c.id, step_text: "Notify affected employees and supervisor that equipment has been returned to service.", sequence_number: 4, step_type: "action", step_level: 1, is_nonsequential: false },
  ]);

  // ── Procedure 2: Emergency Shutdown ──────────────────────────────────────
  const [proc2] = await knex("procedures").insert({
    id: knex.fn.uuid(),
    procedure_number: "OPS-012",
    title: "Emergency Shutdown — Production Line Alpha",
    procedure_type: "Operations",
    status: "approved",
    revision_number: 5,
    revision_date: "2025-11-01",
    revision_description: "Revised to include new reactor vessel ESD valve location",
    approval_date: "2025-11-05",
    building_unit: "Production Building A",
    safety_classification: "Critical",
    purpose: "Provide step-by-step instructions for safely shutting down Production Line Alpha during an emergency to prevent injury, equipment damage, or environmental release.",
    scope: "Applies to all operators and shift supervisors assigned to Production Line Alpha.",
    applicability: "Emergency conditions including: fire alarm, equipment failure, hazardous material release, loss of utilities.",
    precautions: "CAUTION: This procedure must only be initiated by a qualified operator or shift supervisor. Unauthorized shutdown of this equipment may result in equipment damage or product loss.\n\n• Do not re-start equipment after emergency shutdown without supervisor approval and a documented equipment inspection.\n• Notify the control room immediately when initiating emergency shutdown.",
    prereq_planning: "Familiarize yourself with the location of all emergency shutdown (ESD) buttons and valves before beginning shift. Review emergency contacts list posted in the control room.",
    prereq_documents: "• Line Alpha P&ID drawing (posted in control room)\n• Emergency contact list\n• Shift supervisor notification form",
    prereq_tools: "• Radio or phone for control room communication\n• Personal PPE appropriate to the emergency type",
    prereq_field_prep: "Confirm shift supervisor is aware that an emergency shutdown may be required. Verify communication channels are functional.",
    prereq_approvals: "Shift supervisor must be notified before or immediately after initiating emergency shutdown.",
    post_testing: "After emergency is resolved, perform a complete equipment walkdown to verify no secondary damage before restart.",
    post_restoration: "Restart must follow normal startup procedure OPS-011. A completed shutdown/startup log entry is required.",
    post_results: "Complete the shift incident log. If related to a safety event, initiate an issue report in the issue management system.",
    records_section: "Emergency shutdown events must be documented in the shift log and reported to the safety department within 24 hours.",
    source_requirements: "OSHA 29 CFR 1910.119 (PSM) — Process Safety Management",
  }).returning("*");

  const [sec2a] = await knex("procedure_sections").insert({
    id: knex.fn.uuid(),
    procedure_id: proc2.id,
    title: "Initiate Emergency Shutdown",
    sequence_number: 1,
  }).returning("*");
  await knex("procedure_steps").insert([
    { id: knex.fn.uuid(), section_id: sec2a.id, step_text: "Sound the local alarm using the red ESD button located at Panel A-101 (primary) or A-102 (secondary).", sequence_number: 1, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec2a.id, step_text: "Contact the control room immediately by radio: \"Control, this is [name], initiating emergency shutdown of Line Alpha.\"", sequence_number: 2, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec2a.id, step_text: "Close feed valve FV-201 at the main feed header (north end of building).", sequence_number: 3, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec2a.id, step_text: "Stop pumps P-101A and P-101B using local stop pushbuttons.", sequence_number: 4, step_type: "action", step_level: 1, is_nonsequential: false },
  ]);

  const [sec2b] = await knex("procedure_sections").insert({
    id: knex.fn.uuid(),
    procedure_id: proc2.id,
    title: "Secure and Monitor",
    sequence_number: 2,
  }).returning("*");
  await knex("procedure_steps").insert([
    { id: knex.fn.uuid(), section_id: sec2b.id, step_text: "Verify all process flows have stopped by confirming flow indicators FI-201 through FI-205 read zero.", sequence_number: 1, step_type: "verification", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec2b.id, step_text: "Monitor vessel pressure PI-301. If pressure exceeds 150 psig, open the bypass valve BV-301.", sequence_number: 2, step_type: "action", step_level: 1, is_nonsequential: false, condition_text: "If vessel pressure exceeds 150 psig" },
    { id: knex.fn.uuid(), section_id: sec2b.id, step_text: "Report line status to shift supervisor and await further instructions.", sequence_number: 3, step_type: "action", step_level: 1, is_nonsequential: false },
  ]);

  // ── Procedure 3: Confined Space Entry ────────────────────────────────────
  const [proc3] = await knex("procedures").insert({
    id: knex.fn.uuid(),
    procedure_number: "EHS-007",
    title: "Permit-Required Confined Space Entry",
    procedure_type: "Safety",
    status: "approved",
    revision_number: 2,
    revision_date: "2025-09-10",
    revision_description: "Added requirements for electronic gas monitoring documentation",
    approval_date: "2025-09-15",
    building_unit: "All Facilities",
    safety_classification: "High Risk",
    purpose: "Define the requirements and controls for safely entering permit-required confined spaces to protect workers from atmospheric hazards, engulfment, and entrapment.",
    scope: "All permit-required confined spaces (PRCS) as identified on the facility confined space inventory. Applies to employees and contractors.",
    applicability: "Storage tanks, process vessels, underground vaults, pits, hoppers, and any other space that meets the definition of a permit-required confined space.",
    precautions: "DANGER: Permit-required confined spaces contain or have the potential to contain a serious hazard. Deaths occur every year in confined spaces.\n\n• NEVER enter a PRCS without a valid entry permit\n• Continuous atmospheric monitoring is required throughout entry\n• An attendant must be stationed outside at all times during entry\n• Emergency rescue services must be on standby before entry begins",
    prereq_planning: "Obtain the confined space entry permit from the safety department. Identify the entry supervisor, authorized entrants, and attendant. Verify the rescue plan is in place.",
    prereq_documents: "• Confined Space Entry Permit (form EHS-007-A)\n• Confined Space Hazard Assessment\n• Rescue team contact information\n• Equipment-specific LOTO procedure if applicable",
    prereq_tools: "• Calibrated 4-gas monitor (O2, LEL, CO, H2S)\n• Full-body harness and retrieval system\n• Intrinsically safe lighting\n• Two-way radio\n• PPE appropriate to space hazards",
    prereq_field_prep: "Complete all LOTO for connected equipment before entry. Purge and ventilate the space. Conduct pre-entry atmospheric test from outside the space.",
    prereq_approvals: "Entry permit must be signed by the entry supervisor and safety department representative. Verbal confirmation from rescue team that they are on standby.",
    post_testing: "After exit, document all gas readings taken during the entry on the permit. Note any abnormal conditions.",
    post_restoration: "Cancel the entry permit by marking it \"cancelled\" and retaining it for one year. Remove all equipment from the space. Restore all lockout devices to normal position.",
    post_results: "Debrief with all entry personnel. Document any hazards discovered or near-misses on the permit.",
    records_section: "All cancelled entry permits must be retained for a minimum of one year and available for inspection.",
    source_requirements: "OSHA 29 CFR 1910.146 — Permit-Required Confined Spaces",
  }).returning("*");

  const [sec3a] = await knex("procedure_sections").insert({
    id: knex.fn.uuid(),
    procedure_id: proc3.id,
    title: "Pre-Entry Requirements",
    sequence_number: 1,
  }).returning("*");
  await knex("procedure_steps").insert([
    { id: knex.fn.uuid(), section_id: sec3a.id, step_text: "Complete and sign the Confined Space Entry Permit (EHS-007-A). All sections must be filled in before entry.", sequence_number: 1, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec3a.id, step_text: "Test the atmosphere at the top, middle, and bottom of the space from outside using the 4-gas monitor. Record readings on the permit. Acceptable limits: O2 19.5–23.5%, LEL <10%, CO <25 ppm, H2S <1 ppm.", sequence_number: 2, step_type: "verification", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec3a.id, step_text: "Confirm that continuous forced-air ventilation is running and will remain on throughout the entry.", sequence_number: 3, step_type: "verification", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec3a.id, step_text: "Verify that the rescue team is on standby and has been briefed on the entry plan.", sequence_number: 4, step_type: "verification", step_level: 1, is_nonsequential: false },
  ]);

  const [sec3b] = await knex("procedure_sections").insert({
    id: knex.fn.uuid(),
    procedure_id: proc3.id,
    title: "During Entry",
    sequence_number: 2,
  }).returning("*");
  await knex("procedure_steps").insert([
    { id: knex.fn.uuid(), section_id: sec3b.id, step_text: "Entrant dons full-body harness and activates personal gas monitor before entering. Attendant confirms monitor is alarming at correct set points.", sequence_number: 1, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec3b.id, step_text: "Entrant enters space. Attendant maintains continuous communication with entrant and records entry time on the permit.", sequence_number: 2, step_type: "action", step_level: 1, is_nonsequential: false },
    { id: knex.fn.uuid(), section_id: sec3b.id, step_text: "Attendant records atmospheric readings every 15 minutes on the permit. If any reading exceeds acceptable limits, order immediate evacuation.", sequence_number: 3, step_type: "action", step_level: 1, is_nonsequential: false, condition_text: "If readings exceed limits, initiate rescue procedure" },
    { id: knex.fn.uuid(), section_id: sec3b.id, step_text: "If entrant gives distress signal or communication is lost, initiate non-entry rescue using retrieval system immediately. Do NOT enter the space to rescue without a rescue team.", sequence_number: 4, step_type: "action", step_level: 1, is_nonsequential: false, condition_text: "If distress signal or communication loss" },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex("procedures").whereIn("procedure_number", ["EHS-001", "OPS-012", "EHS-007"]).delete();
}
