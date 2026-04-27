export const NAVY = "#0f2137";
export const TEAL = "#00BFA5";
export const TEALD = "#009688";
export const TEALLT = "#e0f2f0";
export const CREAM = "#FAF9F4";
export const PARCHMENT = "#FAEFD9";
export const BG = "#f7f9fb";
export const CARD = "#fff";
export const BD = "#e4e9f0";
export const TX = "#0f172a";
export const TX2 = "#5e6b7f";
export const TX3 = "#94a1b3";
export const GRN = "#00BFA5";
export const GRNBG = "#E6F7F5";
export const GRNBD = "#80DFD2";
export const AMB = "#F59E0B";
export const AMBBG = "#fffbeb";
export const AMBBD = "#fcd34d";
export const RED = "#EF4444";
export const REDBG = "#fef2f2";
export const REDBD = "#fca5a5";
export const PURPLE = "#6366f1";
export const F = "'Outfit', system-ui, sans-serif";
export const FM = "'IBM Plex Mono', monospace";
export const ACOL = [TEALD, PURPLE, "#ec4899", "#f59e0b", "#10b981", "#8b5cf6"];

export const scolor = s => s >= 75 ? GRN : s >= 50 ? AMB : RED;
export const sbg = s => s >= 75 ? GRNBG : s >= 50 ? AMBBG : REDBG;
export const sbd = s => s >= 75 ? GRNBD : s >= 50 ? AMBBD : REDBD;
export const slabel = s => s >= 85 ? "Excellent" : s >= 75 ? "Strong" : s >= 60 ? "Moderate" : s >= 45 ? "Developing" : "Concern";
export const dL = s => s >= 80 ? "Strong hire" : s >= 70 ? "Hire with plan" : s >= 55 ? "Caution" : "Not recommended";
export const dC = s => s >= 80 ? GRN : s >= 70 ? TEALD : s >= 55 ? AMB : RED;

export const riskBg = r => (r === "Very Low" || r === "Low") ? GRNBG : r === "Medium" ? AMBBG : REDBG;
export const riskCol = r => (r === "Very Low" || r === "Low") ? GRN : r === "Medium" ? AMB : RED;
export const riskBd = r => (r === "Very Low" || r === "Low") ? GRNBD : r === "Medium" ? AMBBD : REDBD;

// ── Audit-trail provenance versions ──────────────────────────────────────────
// Bumped any time the scenario template, scoring rubric, or default model
// changes in a way that affects how reports are produced. Stored on every
// scoring run so the report can defensibly show which prompt and model
// generated the output. The values are written through to:
//   assessments.scenario_version
//   results.scoring_rubric_version
//   results.model_version
//   results.workspace_rubric_version
//   results.workspace_block_library_version
//
// PD_WORKSPACE_RUBRIC_VERSION bumps when the per-block scoring criteria
// or the cross-block aggregation logic changes in a way that materially
// affects the score (rewording a single line of a prompt does not bump it;
// adding or removing a criterion, changing the score weighting, or
// changing the synthesis call does).
//
// PD_WORKSPACE_BLOCK_LIBRARY_VERSION bumps when the set of block types
// shipped in the modular Workspace changes. Phase 1 ships the office
// shell with 10 blocks. When healthcare or education shells land, this
// constant flips to 'office-and-healthcare-block-library-v2.0' and so
// on. Recorded against every modular scoring run so a report defensibly
// shows which block library was in force at the time of scoring.
export const PD_SCENARIO_VERSION = 'scenario-v1.0';
export const PD_RUBRIC_VERSION = 'rubric-v1.0';
export const PD_MODEL_DEFAULT = 'claude-sonnet-4-5';
export const PD_WORKSPACE_RUBRIC_VERSION = 'workspace-rubric-v1.0';
export const PD_WORKSPACE_BLOCK_LIBRARY_VERSION = 'office-block-library-v1.0';
// Phase 2 Healthcare shell. All 10 healthcare blocks ship as real
// interactive components in v1.0. Per-block scorers (analogous to the
// office shell's lib/workspace-blocks/office/scoring/* fan-out) land
// in Phase 2.5; the rubric version below tracks scoring changes
// independently of the block library version.
export const PD_HEALTHCARE_BLOCK_LIBRARY_VERSION = 'healthcare-block-library-v1.0';
// Phase 2 Education shell. Stub stage: 9 blocks are placeholders that
// share the office BlockPlaceholder while the architecture and
// scenario generator are wired up. Bumps to v1.0 once all 9 blocks
// are real and per-block scorers are in place.
export const PD_EDUCATION_BLOCK_LIBRARY_VERSION = 'education-block-library-v0.1-stub';

// ── Compliance language ──────────────────────────────────────────────────────
// Standard wording used everywhere PRODICTA describes a candidate or surfaces
// a prediction. The platform is not a legal advisor and reports must not read
// as definitive claims. These strings are imported by the report page, every
// PDF generation route, and email templates so the wording stays in sync.
export const PD_VERDICT_DISCLAIMER = "This is a risk indicator, not a definitive prediction. Verification at interview is recommended before any hiring decision.";
export const PD_REPORT_DECISION_BASIS = "PRODICTA reports should be one input to your hiring decision, not the sole basis.";
export const PD_PDF_FOOTER = "PRODICTA reports describe assessment behaviour and surface risk indicators. They are not legal advice. Seek employment law advice where appropriate. PRODICTA reports should be one input to your hiring decision, not the sole basis.";
export const PD_WATCHOUT_VERIFY = "Recommended verification at interview before any decision is taken.";

export const cs = { background: CARD, border: `1px solid ${BD}`, borderRadius: 14, padding: "22px 26px" };
export const ps = (bg, fg) => ({ display: "inline-block", padding: "3px 12px", borderRadius: 50, fontSize: 11, fontWeight: 700, background: bg, color: fg });
export const bs = (v = "primary", sz = "md") => ({
  display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer",
  fontFamily: F, border: "none",
  padding: sz === "lg" ? "13px 28px" : sz === "sm" ? "7px 14px" : "10px 22px",
  borderRadius: 8,
  fontSize: sz === "lg" ? 15 : sz === "sm" ? 12 : 13.5,
  fontWeight: 700,
  ...(v === "primary"
    ? { background: TEAL, color: NAVY }
    : v === "danger"
    ? { background: RED, color: "#fff" }
    : { background: "transparent", color: TX2, border: `1.5px solid ${BD}` })
});
