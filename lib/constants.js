export const NAVY = "#0f2137";
export const TEAL = "#00BFA5";
export const TEALD = "#009688";
export const TEALLT = "#e0f2f0";
export const BG = "#f7f9fb";
export const CARD = "#fff";
export const BD = "#e4e9f0";
export const TX = "#0f172a";
export const TX2 = "#5e6b7f";
export const TX3 = "#94a1b3";
export const GRN = "#16a34a";
export const GRNBG = "#ecfdf5";
export const GRNBD = "#bbf7d0";
export const AMB = "#d97706";
export const AMBBG = "#fffbeb";
export const AMBBD = "#fde68a";
export const RED = "#dc2626";
export const REDBG = "#fef2f2";
export const REDBD = "#fecaca";
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
