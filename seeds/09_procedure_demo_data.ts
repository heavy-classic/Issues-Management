import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  // Idempotency check
  const existing = await knex("procedures").first();
  if (existing) return;

  // Get admin user
  const admin = await knex("users").where({ email: "admin@example.com" }).first();
  const adminId = admin?.id || null;

  // -------------------------------------------------------------------------
  // Insert procedures
  // -------------------------------------------------------------------------

  const [proc1, proc2, proc3, proc4, proc5] = await knex("procedures")
    .insert([
      {
        procedure_number: "OP-001",
        title: "Propellant Loading and Pressurization Procedure",
        procedure_type: "Operating Procedure",
        status: "approved",
        revision_number: 3,
        revision_date: "2026-01-15",
        revision_description: "Updated bipropellant loading sequence to reflect revised mass flow limits and added hold point at 70% fill level.",
        approval_date: "2026-01-22",
        approved_by: adminId,
        building_unit: "Propulsion Test Facility — Bay 3",
        safety_classification: "Hazardous Operations",
        purpose:
          "This procedure establishes the steps required to load and pressurize the spacecraft propulsion system with hydrazine monopropellant in preparation for integrated systems testing and launch operations.",
        scope:
          "This procedure applies to all propellant loading operations conducted at the Propulsion Test Facility. It covers transfer from the ground storage vessel to the spacecraft propellant tank, pressurant loading, and system leak checks.",
        applicability:
          "This procedure is applicable to spacecraft configurations utilizing a 22-N hydrazine monopropellant blowdown propulsion system. Personnel performing this procedure must hold current hazardous propellant handling certification and have completed propellant operations task qualification.",
        precautions:
          "WARNING: Hydrazine is a toxic, flammable, and carcinogenic liquid. Exposure through skin absorption, inhalation, or ingestion can be fatal. Full Level A SCAPE suit ensemble is required within the propellant hazard zone at all times during this procedure.\n\nCAUTION: Prevent contamination of the propellant system. All wetted components must be verified clean and dry. Contamination with oxidizing agents may cause spontaneous ignition.\n\nNOTE: A minimum of three technicians plus one safety officer must be present during all propellant transfer operations.",
        prereq_planning:
          "Verify that the Propellant Operations Permit has been approved and signed by the Test Director. Confirm that the facility fire suppression system is operational and that the local emergency coordinator has been notified of planned operations.",
        prereq_documents:
          "Propellant Loading Safety Plan Rev C, Spacecraft Interface Control Document (ICD) Section 7, Propellant System Test Specification TS-PR-0023, Material Safety Data Sheet for Hydrazine (Anhydrous).",
        prereq_tools:
          "Calibrated torque wrench (5–50 in-lb range, calibration due date verified), SCAPE suit ensemble (4 each), stainless steel ground support equipment (GSE) fill/drain valve assembly P/N GSE-PRO-0041, certified portable leak detector, ground power unit.",
        prereq_field_prep:
          "Establish and verify propellant exclusion zone boundary markers. Confirm that all personnel within 100 m of the hazard zone are notified. Verify that propellant berm containment is empty and clear of standing water.",
        prereq_approvals:
          "Propellant Operations Permit signed by Test Director. Range Safety approval in place. Facility Manager clearance obtained.",
        post_testing:
          "Perform a leak check at all fill/drain interfaces using the calibrated leak detector. Acceptance criterion: no detectable leak above 1×10⁻⁶ std cc/sec helium equivalent.",
        post_restoration:
          "Remove and stow all SCAPE suit ensembles per Suit Maintenance Procedure SMP-001. Secure all propellant GSE valves in the closed position and apply tamper-evident seals. Return propellant transfer lines to storage bay.",
        post_results:
          "Record final propellant mass loaded (target: 4.20 ± 0.05 kg) and pressurant charge pressure (target: 310 ± 5 psia) in the Propellant Loading Data Sheet, Form TE-PR-0044.",
        records_section:
          "Retain completed Propellant Loading Data Sheet in the spacecraft traveler package. Forward copy to Configuration Management within 24 hours of procedure completion.",
        source_requirements:
          "DOE-STD-1029-92, Writer's Guide for Technology Procedures. MIL-PRF-27401D, Performance Specification: Propellant, Hydrazine. Spacecraft Propulsion System Spec SP-PRO-0010 Rev B, Sec 3.4.",
        author_id: adminId,
      },
      {
        procedure_number: "OP-002",
        title: "Solar Array Deployment Functional Test",
        procedure_type: "Operating Procedure",
        status: "approved",
        revision_number: 1,
        revision_date: "2026-02-10",
        revision_description: "Initial release following delta design review closure.",
        approval_date: "2026-02-18",
        approved_by: adminId,
        building_unit: "Integration and Test Hall — High Bay",
        safety_classification: "Standard Operations",
        purpose:
          "This procedure defines the functional test sequence for verifying solar array deployment mechanism operation, latching integrity, and electrical continuity following spacecraft integration of the solar array assemblies.",
        scope:
          "This procedure covers electrical functional testing and mechanical deployment of the three-panel solar array system in the deployed and stowed configurations. It does not cover solar array performance (power output) characterization.",
        applicability:
          "Applicable to spacecraft undergoing Integration and Test (I&T) at the completion of solar array installation. Requires two technicians and one test engineer. ESD precautions apply throughout.",
        precautions:
          "CAUTION: Solar array panels are ESD-sensitive assemblies. Verify personnel grounding straps are in use and that the work area is within an ESD-protected zone before handling any solar array component.\n\nWARNING: Released deployment energy from the hold-down and release mechanism (HDRM) is sufficient to cause injury. Verify the clear zone (1.5 m around each panel hinge line) before commanding deployment.",
        prereq_planning:
          "Schedule crane operator support if solar array panel mass exceeds 5 kg per panel. Confirm integration is complete and spacecraft is in solar array deployment test configuration per the spacecraft assembly drawing.",
        prereq_documents:
          "Solar Array Assembly Drawing SA-1000-DWG-001, HDRM Operational Manual OM-SA-0012, Electrical Test Procedure ETP-SA-0005, ESD Control Plan ESD-0001.",
        prereq_tools:
          "ESD wrist strap and mat (verified within calibration), deployment test fixture P/N SA-GTF-001, digital multimeter (calibrated), spacecraft electrical ground support equipment (EGSE) test set.",
        prereq_field_prep:
          "Verify that the spacecraft is secured to the integration stand with all hold-down bolts torqued to specification. Confirm that no personnel or equipment are within the solar array clear zone.",
        prereq_approvals: "Test Conductor sign-off on pre-test checklist. Quality Assurance witness present.",
        post_testing:
          "Verify panel latch indicators are in the latched (deployed) position for all three panels. Measure and record hinge line gap at all three deployment stops.",
        post_restoration:
          "Return solar arrays to stowed configuration per stow sequence. Re-install HDRM pin pullers and verify continuity of each firing circuit.",
        post_results:
          "Record deployment time for each panel (acceptance: ≤ 2.5 seconds per panel) and electrical continuity of all circuits in Solar Array Functional Test Data Sheet, Form TE-SA-0022.",
        records_section:
          "Retain data sheet in spacecraft traveler. Note any anomalies in the discrepancy reporting system.",
        source_requirements:
          "DOE-STD-1029-92. Spacecraft Level I&T Requirements Document LITRD-0001 Rev A, Sec 5.2. Solar Array Performance Specification SP-SA-0003, Sec 4.1.",
        author_id: adminId,
      },
      {
        procedure_number: "OP-003",
        title: "Flight Computer Software Load and Verification",
        procedure_type: "Operating Procedure",
        status: "review",
        revision_number: 0,
        revision_date: "2026-03-05",
        revision_description: "Initial draft for peer review.",
        approval_date: null,
        approved_by: null,
        building_unit: "Avionics Lab — Clean Room",
        safety_classification: "Standard Operations",
        purpose:
          "This procedure establishes the method for loading flight software (FSW) images onto the spacecraft flight computer and verifying the integrity and correct operation of the loaded software prior to spacecraft-level testing.",
        scope:
          "This procedure covers connection of the software loader ground support equipment, transfer and verification of the flight software image, and execution of the built-in confidence test (BICT) to confirm software integrity and hardware interface functionality.",
        applicability:
          "Applicable to all FSW load events on spacecraft flight computers during integration, test, and pre-launch operations. Requires a software engineer and one avionics technician.",
        precautions:
          "CAUTION: Use only released and configuration-controlled flight software images. Verify the FSW version and checksum against the Software Release Authorization (SRA) before initiating transfer. Unauthorized software versions are prohibited.\n\nNOTE: The flight computer nonvolatile memory is limited to 100,000 write cycles. Avoid unnecessary repeated loads.",
        prereq_planning:
          "Obtain the Software Release Authorization (SRA) for the target FSW version from the software CM system. Confirm that the spacecraft power system is in nominal configuration and that the EGSE is connected and verified.",
        prereq_documents:
          "Software Release Authorization (SRA) for target build, FSW Interface Control Document ICD-FSW-0001, Avionics EGSE Operator Manual OM-EGSE-0003, Software Load and Verification Specification SV-FSW-0007.",
        prereq_tools:
          "Avionics EGSE test set (calibrated), laptop running Mission Operations Software (MOS) v4.1 or later, USB-to-SpaceWire adapter P/N AV-GSE-0009, ESD wrist strap.",
        prereq_field_prep:
          "Power on the spacecraft avionics subsystem via EGSE. Allow a 10-minute thermal soak before initiating software load. Verify communication link between EGSE and flight computer is established.",
        prereq_approvals: "Software lead approval of SRA. Avionics test conductor sign-off on pre-load checklist.",
        post_testing:
          "Execute the Built-In Confidence Test (BICT) and verify all test points pass. Confirm software version telemetry matches the SRA-specified build identifier.",
        post_restoration:
          "Close all EGSE command channels and set flight computer to standby mode. Remove software loader GSE and restore the avionics bay access panel.",
        post_results:
          "Record loaded FSW version, checksum, BICT pass/fail status, and load time in the Software Load Data Sheet, Form AV-SW-0010.",
        records_section:
          "File data sheet in the spacecraft traveler. Submit copy to Software CM for build record update.",
        source_requirements:
          "DOE-STD-1029-92. Avionics Verification and Validation Plan AVVP-0001 Rev B. Flight Software Requirements Specification FSRS-0001, Sec 6.3.",
        author_id: adminId,
      },
      {
        procedure_number: "OP-004",
        title: "Thermal Vacuum Chamber Pumpdown and Bakeout",
        procedure_type: "Operating Procedure",
        status: "review",
        revision_number: 2,
        revision_date: "2026-04-01",
        revision_description: "Updated base pressure requirement to 5×10⁻⁶ Torr per revised test specification. Added bakeout dwell time verification step.",
        approval_date: null,
        approved_by: null,
        building_unit: "Environmental Test Facility — Chamber 2",
        safety_classification: "Standard Operations",
        purpose:
          "This procedure defines the operations required to pump down and bake out the thermal vacuum test chamber prior to spacecraft thermal vacuum (TVAC) testing, achieving the required vacuum level and cleanliness standard.",
        scope:
          "This procedure covers initial roughing pump operation, cryo pump engagement, attainment of base pressure, and initiation of the chamber bakeout cycle. It does not include spacecraft thermal cycling or performance testing.",
        applicability:
          "Applicable to all TVAC chamber pump-down events. Requires a minimum of one environmental test engineer and one facilities technician qualified on Chamber 2 operations.",
        precautions:
          "WARNING: The thermal vacuum chamber operates at pressures below 1×10⁻⁵ Torr and temperatures between -180°C and +125°C. Do not open any chamber port while pressure is below 1 Torr. Serious injury from rapid pressure equalization may result.\n\nCAUTION: Liquid nitrogen (LN2) lines are present throughout the chamber shroud circuit. Cryogenic burns can occur on contact. Insulated gloves and face shield are required when handling LN2 connections.",
        prereq_planning:
          "Verify LN2 Dewar is filled to at least 80% capacity (minimum 200 L) prior to initiating pumpdown. Confirm chamber roughing and cryo pump maintenance is current per Facility Maintenance Schedule FMS-001.",
        prereq_documents:
          "Chamber 2 Operations Manual OM-TVA-0002 Rev D, TVAC Test Specification TS-ENV-0014, Cleanliness Control Plan CCP-0001.",
        prereq_tools:
          "Calibrated residual gas analyzer (RGA) with mass range 1–300 AMU, ionization gauge (calibrated), LN2 personal protective equipment (gloves, face shield, apron), facility operations console.",
        prereq_field_prep:
          "Verify that the spacecraft is installed in the chamber and all thermal interface connections are made. Confirm that all electrical umbilicals pass through the chamber feedthrough plate and are routed correctly. Close and latch all chamber doors.",
        prereq_approvals: "Facilities manager sign-off on chamber readiness checklist. Test engineer pre-test briefing completed with all personnel.",
        post_testing:
          "After bakeout dwell period, perform RGA scan and confirm total pressure and partial pressures of water and hydrocarbons meet chamber cleanliness acceptance criteria per TS-ENV-0014 Table 4.",
        post_restoration:
          "Upon test completion, vent chamber to atmospheric pressure at a controlled rate not exceeding 0.5 Torr/sec to prevent particulate contamination of the spacecraft.",
        post_results:
          "Record achieved base pressure, bakeout temperature profile, and RGA scan data in Chamber Operation Log, Form ETF-LOG-0002.",
        records_section:
          "Retain chamber log in the environmental test data package. Forward copy to Program Systems Engineering within 48 hours.",
        source_requirements:
          "DOE-STD-1029-92. GEVS-SE Rev A, Sec 2.4. TVAC Test Specification TS-ENV-0014 Rev C, Sec 3.1. ASTM E595 Standard Test Method for Total Mass Loss.",
        author_id: adminId,
      },
      {
        procedure_number: "OP-005",
        title: "Satellite Integration and Test Sequence",
        procedure_type: "Operating Procedure",
        status: "draft",
        revision_number: 0,
        revision_date: null,
        revision_description: null,
        approval_date: null,
        approved_by: null,
        building_unit: "Integration and Test Hall",
        safety_classification: "Standard Operations",
        purpose:
          "This procedure defines the master integration and test sequence for spacecraft assembly from module-level mating through completion of all pre-ship acceptance tests, establishing the order of operations and key milestones for the spacecraft integration campaign.",
        scope:
          "This procedure covers the integration sequence from mating of the propulsion module to the spacecraft bus through completion of the final pre-shipment functional test. It references subordinate procedures for individual test operations.",
        applicability:
          "Applicable to the spacecraft integration campaign. The Test Conductor is responsible for maintaining compliance with this sequence. Departures from the defined sequence require a written Test Deviation approved by the Systems Engineering lead.",
        precautions:
          "NOTE: This procedure references and does not supersede subordinate-level procedures. In the event of conflict, the subordinate procedure governs the specific operation.\n\nCAUTION: ESD precautions are in effect throughout the integration hall. Personnel must use ESD wrist straps and heel straps whenever within 1 m of exposed avionics hardware.",
        prereq_planning:
          "Confirm that all module-level acceptance tests are complete and signed off before initiating spacecraft-level integration. Verify that the spacecraft master schedule is current and that all subordinate procedures are at their correct revision.",
        prereq_documents:
          "Spacecraft Assembly Drawing SA-0001, Integration and Test Plan ITP-0001, Mechanical Interface Control Document MICD-0001, Electrical Interface Control Document EICD-0001.",
        prereq_tools:
          "Calibrated torque wrenches (multiple ranges), spacecraft lifting fixture P/N I-T-LFT-001, integration stand P/N I-T-STD-001, EGSE test set, ESD equipment.",
        prereq_field_prep:
          "Verify that the integration hall cleanliness level meets ISO Class 8 (Federal Standard 209E Class 100,000). Confirm that all lifting equipment has current certification.",
        prereq_approvals: "Systems Engineering lead sign-off on integration readiness review (IRR) action item closure. Quality Assurance confirmation that all module-level traveler packages are complete.",
        post_testing:
          "Execute final end-to-end functional test per Procedure OP-009. Confirm all subsystems nominal.",
        post_restoration:
          "Install all flight covers and harness restraints. Apply required tamper-evident seals and record seal numbers in the traveler.",
        post_results:
          "Complete the spacecraft-level traveler sign-off sheet. Document any open anomalies and dispositions in the discrepancy reporting system.",
        records_section:
          "All completed traveler pages, test data sheets, and anomaly dispositions are required for the pre-ship review package.",
        source_requirements:
          "DOE-STD-1029-92. Integration and Test Plan ITP-0001 Rev A. NASA-STD-5001B, Structural Design and Test Factors for Spaceflight Hardware.",
        author_id: adminId,
      },
    ])
    .returning("*");

  // -------------------------------------------------------------------------
  // Sections and steps for OP-001
  // -------------------------------------------------------------------------

  const [sec1a, sec1b, sec1c] = await knex("procedure_sections")
    .insert([
      { procedure_id: proc1.id, title: "Propellant Transfer Preparation", sequence_number: 1 },
      { procedure_id: proc1.id, title: "Propellant Loading", sequence_number: 2 },
      { procedure_id: proc1.id, title: "Pressurant Charge", sequence_number: 3 },
    ])
    .returning("*");

  await knex("procedure_steps").insert([
    // Section 1 — Preparation
    {
      section_id: sec1a.id,
      sequence_number: 1,
      step_type: "BASIC",
      step_text: "Don Level A SCAPE suit ensemble and verify all suit seals are tight before entering the propellant hazard zone.",
    },
    {
      section_id: sec1a.id,
      sequence_number: 2,
      step_type: "VERIFICATION",
      step_text: "Verify that the spacecraft propellant fill/drain valve GSE-PRO-0041 is in the closed position.",
    },
    {
      section_id: sec1a.id,
      sequence_number: 3,
      step_type: "BASIC",
      step_text: "Connect the propellant transfer line from the ground storage vessel to the spacecraft fill/drain valve assembly.",
    },
    {
      section_id: sec1a.id,
      sequence_number: 4,
      step_type: "VERIFICATION",
      step_text: "Verify that the portable leak detector reads below 0.1 ppm in the area of all GSE connections before proceeding.",
    },
    // Section 2 — Loading
    {
      section_id: sec1b.id,
      sequence_number: 1,
      step_type: "HOLD_POINT",
      step_text: "Hold point: Obtain Test Director authorization before opening propellant transfer valve.",
    },
    {
      section_id: sec1b.id,
      sequence_number: 2,
      step_type: "BASIC",
      step_text: "Open the ground storage vessel supply valve slowly (quarter-turn increments) until propellant begins flowing.",
    },
    {
      section_id: sec1b.id,
      sequence_number: 3,
      step_type: "DATA_RECORDING",
      step_text: "Record the initial propellant tank mass reading from the load cell display every 2 minutes during transfer.",
    },
    {
      section_id: sec1b.id,
      sequence_number: 4,
      step_type: "BASIC",
      step_text: "Close the supply valve when the tank load cell reads 4.20 kg ± 0.05 kg.",
    },
    // Section 3 — Pressurization
    {
      section_id: sec1c.id,
      sequence_number: 1,
      step_type: "BASIC",
      step_text: "Connect the nitrogen pressurant line from the ground supply regulator to the spacecraft pressurant fill port.",
    },
    {
      section_id: sec1c.id,
      sequence_number: 2,
      step_type: "BASIC",
      step_text: "Open the pressurant supply valve and charge the propellant tank to 310 ± 5 psia as read on the facility calibrated pressure gauge.",
    },
    {
      section_id: sec1c.id,
      sequence_number: 3,
      step_type: "VERIFICATION",
      step_text: "Verify tank pressure remains stable at 310 ± 5 psia for a minimum of 5 minutes before closing the pressurant supply valve.",
    },
    {
      section_id: sec1c.id,
      sequence_number: 4,
      step_type: "DATA_RECORDING",
      step_text: "Record final tank pressure and propellant mass in the Propellant Loading Data Sheet, Form TE-PR-0044.",
    },
  ]);

  // -------------------------------------------------------------------------
  // Sections and steps for OP-002
  // -------------------------------------------------------------------------

  const [sec2a, sec2b] = await knex("procedure_sections")
    .insert([
      { procedure_id: proc2.id, title: "Pre-deployment Electrical Checks", sequence_number: 1 },
      { procedure_id: proc2.id, title: "Deployment Actuation and Verification", sequence_number: 2 },
    ])
    .returning("*");

  await knex("procedure_steps").insert([
    {
      section_id: sec2a.id,
      sequence_number: 1,
      step_type: "VERIFICATION",
      step_text: "Verify that ESD wrist straps are connected and resistance checked (< 35 MΩ) for all personnel before touching solar array hardware.",
    },
    {
      section_id: sec2a.id,
      sequence_number: 2,
      step_type: "BASIC",
      step_text: "Connect the EGSE test set to the spacecraft electrical interface connector J-SA-01.",
    },
    {
      section_id: sec2a.id,
      sequence_number: 3,
      step_type: "DATA_RECORDING",
      step_text: "Measure and record continuity resistance for all three solar array panel harness circuits using the calibrated digital multimeter.",
    },
    {
      section_id: sec2a.id,
      sequence_number: 4,
      step_type: "VERIFICATION",
      step_text: "Verify that the HDRM arming circuit is in the safe (disarmed) state before proceeding.",
    },
    {
      section_id: sec2b.id,
      sequence_number: 1,
      step_type: "NOTIFICATION",
      step_text: "Notify all personnel to clear the 1.5 m solar array deployment clear zone. Confirm verbal all-clear from Test Conductor.",
    },
    {
      section_id: sec2b.id,
      sequence_number: 2,
      step_type: "BASIC",
      step_text: "Command solar array deployment via the EGSE command interface and start the stopwatch simultaneously.",
    },
    {
      section_id: sec2b.id,
      sequence_number: 3,
      step_type: "VERIFICATION",
      step_text: "Verify that all three panel latch indicators have transitioned to the LATCHED state on the EGSE telemetry display.",
    },
    {
      section_id: sec2b.id,
      sequence_number: 4,
      step_type: "DATA_RECORDING",
      step_text: "Record deployment time for each panel and hinge gap measurement at each deployment stop in Solar Array Functional Test Data Sheet, Form TE-SA-0022.",
    },
  ]);

  // -------------------------------------------------------------------------
  // Sections and steps for OP-003
  // -------------------------------------------------------------------------

  const [sec3a, sec3b] = await knex("procedure_sections")
    .insert([
      { procedure_id: proc3.id, title: "Software Image Transfer", sequence_number: 1 },
      { procedure_id: proc3.id, title: "Built-In Confidence Test (BICT)", sequence_number: 2 },
    ])
    .returning("*");

  await knex("procedure_steps").insert([
    {
      section_id: sec3a.id,
      sequence_number: 1,
      step_type: "VERIFICATION",
      step_text: "Verify that the Software Release Authorization (SRA) for the target FSW build is available and signed before connecting the software loader.",
    },
    {
      section_id: sec3a.id,
      sequence_number: 2,
      step_type: "BASIC",
      step_text: "Connect the USB-to-SpaceWire adapter P/N AV-GSE-0009 between the laptop and spacecraft avionics interface connector J-AV-02.",
    },
    {
      section_id: sec3a.id,
      sequence_number: 3,
      step_type: "BASIC",
      step_text: "Launch the Mission Operations Software (MOS) application and select the FSW image file matching the SRA-specified build identifier.",
    },
    {
      section_id: sec3a.id,
      sequence_number: 4,
      step_type: "BASIC",
      step_text: "Initiate the software load command in MOS and monitor the transfer progress bar until 100% completion is indicated.",
    },
    {
      section_id: sec3a.id,
      sequence_number: 5,
      step_type: "VERIFICATION",
      step_text: "Verify that the SHA-256 checksum reported by MOS after transfer matches the SRA-specified value exactly.",
    },
    {
      section_id: sec3b.id,
      sequence_number: 1,
      step_type: "BASIC",
      step_text: "Command the flight computer to execute the Built-In Confidence Test (BICT) via MOS command FSW_CMD_BICT_START.",
    },
    {
      section_id: sec3b.id,
      sequence_number: 2,
      step_type: "VERIFICATION",
      step_text: "Verify that all BICT test points report PASS status on the MOS telemetry display within 120 seconds of command issuance.",
    },
    {
      section_id: sec3b.id,
      sequence_number: 3,
      step_type: "DATA_RECORDING",
      step_text: "Record FSW version string, checksum, BICT result summary, and load timestamp in Software Load Data Sheet, Form AV-SW-0010.",
    },
  ]);

  // -------------------------------------------------------------------------
  // Sections and steps for OP-004
  // -------------------------------------------------------------------------

  const [sec4a, sec4b] = await knex("procedure_sections")
    .insert([
      { procedure_id: proc4.id, title: "Chamber Pumpdown", sequence_number: 1 },
      { procedure_id: proc4.id, title: "Bakeout Cycle", sequence_number: 2 },
    ])
    .returning("*");

  await knex("procedure_steps").insert([
    {
      section_id: sec4a.id,
      sequence_number: 1,
      step_type: "VERIFICATION",
      step_text: "Verify that all chamber door hatches are closed and latched before initiating roughing pump operation.",
    },
    {
      section_id: sec4a.id,
      sequence_number: 2,
      step_type: "BASIC",
      step_text: "Start the roughing pump via the facility operations console and open the roughing valve.",
    },
    {
      section_id: sec4a.id,
      sequence_number: 3,
      step_type: "VERIFICATION",
      step_text: "Verify that chamber pressure has dropped below 50 mTorr on the thermocouple gauge before engaging the cryo pump.",
    },
    {
      section_id: sec4a.id,
      sequence_number: 4,
      step_type: "BASIC",
      step_text: "Engage the cryo pump by opening the high-vacuum gate valve and start the LN2 flow to the shroud circuit.",
    },
    {
      section_id: sec4a.id,
      sequence_number: 5,
      step_type: "DATA_RECORDING",
      step_text: "Record chamber pressure from the ionization gauge every 30 minutes until base pressure of ≤ 5×10⁻⁶ Torr is achieved.",
    },
    {
      section_id: sec4b.id,
      sequence_number: 1,
      step_type: "BASIC",
      step_text: "Set chamber wall heater setpoint to 100°C ± 5°C via the facility operations console to initiate the bakeout cycle.",
    },
    {
      section_id: sec4b.id,
      sequence_number: 2,
      step_type: "VERIFICATION",
      step_text: "Verify that chamber temperature has stabilized within ± 5°C of the setpoint for a minimum of 2 hours before starting the dwell timer.",
    },
    {
      section_id: sec4b.id,
      sequence_number: 3,
      step_type: "BASIC",
      step_text: "Perform RGA scan at the end of the 24-hour bakeout dwell and record partial pressure of H₂O (18 AMU) and total hydrocarbon pressure.",
    },
  ]);

  // -------------------------------------------------------------------------
  // Sections and steps for OP-005
  // -------------------------------------------------------------------------

  const [sec5a, sec5b, sec5c] = await knex("procedure_sections")
    .insert([
      { procedure_id: proc5.id, title: "Module Mating and Structural Integration", sequence_number: 1 },
      { procedure_id: proc5.id, title: "Avionics and Harness Integration", sequence_number: 2 },
      { procedure_id: proc5.id, title: "Pre-Environmental Test Functional Verification", sequence_number: 3 },
    ])
    .returning("*");

  await knex("procedure_steps").insert([
    {
      section_id: sec5a.id,
      sequence_number: 1,
      step_type: "VERIFICATION",
      step_text: "Verify that the integration hall ISO Class 8 cleanliness certificate has been issued within the past 7 days before introducing spacecraft hardware.",
    },
    {
      section_id: sec5a.id,
      sequence_number: 2,
      step_type: "BASIC",
      step_text: "Lift the propulsion module into position using the spacecraft lifting fixture P/N I-T-LFT-001 and align with the bus module interface bolts.",
    },
    {
      section_id: sec5a.id,
      sequence_number: 3,
      step_type: "BASIC",
      step_text: "Install all 12 interface bolts and torque to 35 in-lb per spacecraft assembly drawing SA-0001.",
    },
    {
      section_id: sec5a.id,
      sequence_number: 4,
      step_type: "DATA_RECORDING",
      step_text: "Record torque wrench calibration ID and applied torque value for each bolt in the mechanical traveler, Form I-T-MECH-001.",
    },
    {
      section_id: sec5b.id,
      sequence_number: 1,
      step_type: "VERIFICATION",
      step_text: "Verify that ESD protection is in place for all personnel before beginning harness routing and connector mating.",
    },
    {
      section_id: sec5b.id,
      sequence_number: 2,
      step_type: "BASIC",
      step_text: "Route all inter-module harnesses per drawing EICD-0001 and secure to cable clamps at each defined attachment point.",
    },
    {
      section_id: sec5b.id,
      sequence_number: 3,
      step_type: "BASIC",
      step_text: "Mate all inter-module electrical connectors and torque connector coupling rings to 8 in-lb.",
    },
    {
      section_id: sec5c.id,
      sequence_number: 1,
      step_type: "BASIC",
      step_text: "Connect the spacecraft EGSE and apply spacecraft power per EGSE Operator Manual OM-EGSE-0003.",
    },
    {
      section_id: sec5c.id,
      sequence_number: 2,
      step_type: "VERIFICATION",
      step_text: "Verify that all subsystem power bus telemetry is nominal (within limits per LITRD-0001 Table 3) on the MOS display.",
    },
    {
      section_id: sec5c.id,
      sequence_number: 3,
      step_type: "NOTIFICATION",
      step_text: "Notify the Systems Engineering lead that the pre-environmental functional test is complete and results are available for review.",
    },
  ]);

  // -------------------------------------------------------------------------
  // Revisions for approved procedures
  // -------------------------------------------------------------------------

  await knex("procedure_revisions").insert([
    {
      procedure_id: proc1.id,
      revision_number: 0,
      revision_date: "2025-07-10",
      description: "Initial release.",
      author_id: adminId,
    },
    {
      procedure_id: proc1.id,
      revision_number: 1,
      revision_date: "2025-10-22",
      description: "Updated SCAPE suit requirement to Level A based on safety review findings.",
      author_id: adminId,
    },
    {
      procedure_id: proc1.id,
      revision_number: 2,
      revision_date: "2025-12-05",
      description: "Added leak check acceptance criterion of 1×10⁻⁶ std cc/sec per Updated Propellant Handling Plan.",
      author_id: adminId,
    },
    {
      procedure_id: proc1.id,
      revision_number: 3,
      revision_date: "2026-01-15",
      description: "Updated bipropellant loading sequence to reflect revised mass flow limits and added hold point at 70% fill level.",
      author_id: adminId,
    },
    {
      procedure_id: proc2.id,
      revision_number: 0,
      revision_date: "2026-02-10",
      description: "Initial release following delta design review closure.",
      author_id: adminId,
    },
    {
      procedure_id: proc2.id,
      revision_number: 1,
      revision_date: "2026-02-18",
      description: "Incorporated QA review comments. Clarified HDRM safe/arm check requirement.",
      author_id: adminId,
    },
  ]);
}
