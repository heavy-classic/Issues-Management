import type { Knex } from "knex";

export async function seed(knex: Knex): Promise<void> {
  const existing = await knex("picklist_values").first();
  if (existing) return;

  const values = [
    // --- Issue Status ---
    { picklist_type: "issue_status", value: "open", label: "Open", color: "#3b82f6", sort_order: 1 },
    { picklist_type: "issue_status", value: "in_progress", label: "In Progress", color: "#f59e0b", sort_order: 2 },
    { picklist_type: "issue_status", value: "closed", label: "Closed", color: "#10b981", sort_order: 3 },

    // --- Issue Priority ---
    { picklist_type: "issue_priority", value: "low", label: "Low", color: "#10b981", sort_order: 1 },
    { picklist_type: "issue_priority", value: "medium", label: "Medium", color: "#f59e0b", sort_order: 2 },
    { picklist_type: "issue_priority", value: "high", label: "High", color: "#f97316", sort_order: 3 },
    { picklist_type: "issue_priority", value: "critical", label: "Critical", color: "#ef4444", sort_order: 4 },

    // --- Action Status ---
    { picklist_type: "action_status", value: "open", label: "Open", color: "#3b82f6", sort_order: 1 },
    { picklist_type: "action_status", value: "in_progress", label: "In Progress", color: "#f59e0b", sort_order: 2 },
    { picklist_type: "action_status", value: "completed", label: "Completed", color: "#10b981", sort_order: 3 },

    // --- Action Priority ---
    { picklist_type: "action_priority", value: "low", label: "Low", color: "#10b981", sort_order: 1 },
    { picklist_type: "action_priority", value: "medium", label: "Medium", color: "#f59e0b", sort_order: 2 },
    { picklist_type: "action_priority", value: "high", label: "High", color: "#f97316", sort_order: 3 },
    { picklist_type: "action_priority", value: "critical", label: "Critical", color: "#ef4444", sort_order: 4 },

    // --- Audit Status ---
    { picklist_type: "audit_status", value: "draft", label: "Draft", color: "#9ca3af", sort_order: 1 },
    { picklist_type: "audit_status", value: "scheduled", label: "Scheduled", color: "#3b82f6", sort_order: 2 },
    { picklist_type: "audit_status", value: "planning", label: "Planning", color: "#8b5cf6", sort_order: 3 },
    { picklist_type: "audit_status", value: "in_progress", label: "In Progress", color: "#f59e0b", sort_order: 4 },
    { picklist_type: "audit_status", value: "under_review", label: "Under Review", color: "#06b6d4", sort_order: 5 },
    { picklist_type: "audit_status", value: "closed", label: "Closed", color: "#10b981", sort_order: 6 },
    { picklist_type: "audit_status", value: "cancelled", label: "Cancelled", color: "#ef4444", sort_order: 7 },

    // --- Audit Risk Level ---
    { picklist_type: "audit_risk_level", value: "low", label: "Low", color: "#10b981", sort_order: 1 },
    { picklist_type: "audit_risk_level", value: "medium", label: "Medium", color: "#f59e0b", sort_order: 2 },
    { picklist_type: "audit_risk_level", value: "high", label: "High", color: "#f97316", sort_order: 3 },
    { picklist_type: "audit_risk_level", value: "critical", label: "Critical", color: "#ef4444", sort_order: 4 },

    // --- Finding Severity ---
    { picklist_type: "finding_severity", value: "observation", label: "Observation", color: "#6b7280", sort_order: 1 },
    { picklist_type: "finding_severity", value: "minor", label: "Minor", color: "#f59e0b", sort_order: 2 },
    { picklist_type: "finding_severity", value: "major", label: "Major", color: "#f97316", sort_order: 3 },
    { picklist_type: "finding_severity", value: "critical", label: "Critical", color: "#ef4444", sort_order: 4 },

    // --- Meeting Type ---
    { picklist_type: "meeting_type", value: "opening", label: "Opening Meeting", color: "#3b82f6", sort_order: 1 },
    { picklist_type: "meeting_type", value: "fieldwork", label: "Fieldwork", color: "#f59e0b", sort_order: 2 },
    { picklist_type: "meeting_type", value: "closing", label: "Closing Meeting", color: "#10b981", sort_order: 3 },
    { picklist_type: "meeting_type", value: "other", label: "Other", color: "#9ca3af", sort_order: 4 },

    // --- Risk Status ---
    { picklist_type: "risk_status", value: "draft", label: "Draft", color: "#9ca3af", sort_order: 1 },
    { picklist_type: "risk_status", value: "identified", label: "Identified", color: "#3b82f6", sort_order: 2 },
    { picklist_type: "risk_status", value: "under_assessment", label: "Under Assessment", color: "#8b5cf6", sort_order: 3 },
    { picklist_type: "risk_status", value: "assessed", label: "Assessed", color: "#06b6d4", sort_order: 4 },
    { picklist_type: "risk_status", value: "in_treatment", label: "In Treatment", color: "#f59e0b", sort_order: 5 },
    { picklist_type: "risk_status", value: "monitoring", label: "Monitoring", color: "#10b981", sort_order: 6 },
    { picklist_type: "risk_status", value: "under_review", label: "Under Review", color: "#f97316", sort_order: 7 },
    { picklist_type: "risk_status", value: "accepted", label: "Accepted", color: "#059669", sort_order: 8 },
    { picklist_type: "risk_status", value: "closed", label: "Closed", color: "#6b7280", sort_order: 9 },

    // --- Risk Velocity ---
    { picklist_type: "risk_velocity", value: "slow", label: "Slow", color: "#10b981", sort_order: 1 },
    { picklist_type: "risk_velocity", value: "moderate", label: "Moderate", color: "#f59e0b", sort_order: 2 },
    { picklist_type: "risk_velocity", value: "fast", label: "Fast", color: "#f97316", sort_order: 3 },
    { picklist_type: "risk_velocity", value: "very_fast", label: "Very Fast", color: "#ef4444", sort_order: 4 },

    // --- Risk Level ---
    { picklist_type: "risk_level", value: "low", label: "Low", color: "#10b981", sort_order: 1 },
    { picklist_type: "risk_level", value: "medium", label: "Medium", color: "#f59e0b", sort_order: 2 },
    { picklist_type: "risk_level", value: "high", label: "High", color: "#f97316", sort_order: 3 },
    { picklist_type: "risk_level", value: "extreme", label: "Extreme", color: "#ef4444", sort_order: 4 },

    // --- Risk Treatment Strategy ---
    { picklist_type: "risk_treatment_strategy", value: "avoid", label: "Avoid", color: "#ef4444", sort_order: 1 },
    { picklist_type: "risk_treatment_strategy", value: "mitigate", label: "Mitigate", color: "#f59e0b", sort_order: 2 },
    { picklist_type: "risk_treatment_strategy", value: "transfer", label: "Transfer", color: "#3b82f6", sort_order: 3 },
    { picklist_type: "risk_treatment_strategy", value: "accept", label: "Accept", color: "#10b981", sort_order: 4 },

    // --- Risk Appetite ---
    { picklist_type: "risk_appetite", value: "averse", label: "Averse", color: "#ef4444", sort_order: 1 },
    { picklist_type: "risk_appetite", value: "cautious", label: "Cautious", color: "#f97316", sort_order: 2 },
    { picklist_type: "risk_appetite", value: "open", label: "Open", color: "#f59e0b", sort_order: 3 },
    { picklist_type: "risk_appetite", value: "hungry", label: "Hungry", color: "#10b981", sort_order: 4 },

    // --- Mitigation Type ---
    { picklist_type: "mitigation_type", value: "preventive", label: "Preventive", color: "#3b82f6", sort_order: 1 },
    { picklist_type: "mitigation_type", value: "detective", label: "Detective", color: "#8b5cf6", sort_order: 2 },
    { picklist_type: "mitigation_type", value: "corrective", label: "Corrective", color: "#f59e0b", sort_order: 3 },
    { picklist_type: "mitigation_type", value: "directive", label: "Directive", color: "#06b6d4", sort_order: 4 },

    // --- Mitigation Status ---
    { picklist_type: "mitigation_status", value: "planned", label: "Planned", color: "#9ca3af", sort_order: 1 },
    { picklist_type: "mitigation_status", value: "in_progress", label: "In Progress", color: "#f59e0b", sort_order: 2 },
    { picklist_type: "mitigation_status", value: "implemented", label: "Implemented", color: "#3b82f6", sort_order: 3 },
    { picklist_type: "mitigation_status", value: "verified", label: "Verified", color: "#10b981", sort_order: 4 },
    { picklist_type: "mitigation_status", value: "ineffective", label: "Ineffective", color: "#ef4444", sort_order: 5 },

    // --- Mitigation Effectiveness ---
    { picklist_type: "mitigation_effectiveness", value: "not_tested", label: "Not Tested", color: "#9ca3af", sort_order: 1 },
    { picklist_type: "mitigation_effectiveness", value: "effective", label: "Effective", color: "#10b981", sort_order: 2 },
    { picklist_type: "mitigation_effectiveness", value: "partially_effective", label: "Partially Effective", color: "#f59e0b", sort_order: 3 },
    { picklist_type: "mitigation_effectiveness", value: "ineffective", label: "Ineffective", color: "#ef4444", sort_order: 4 },
  ];

  await knex("picklist_values").insert(values);
}
