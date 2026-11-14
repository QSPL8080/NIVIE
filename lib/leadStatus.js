// Lead pipeline statuses — shared by the admin panel (dropdowns, colours, chart)
// and the server (only these exact values can be saved).
// To add or rename a status, edit LEAD_STATUSES and push.

// Stages group the statuses for the colours and the pie chart.
// Chart colours are a colour-blind-checked palette, in this order.
export const STATUS_GROUPS = [
  { key: "new", label: "New", chart: "#2a78d6", color: "#1c5cab", bg: "#e8f1fc" },
  { key: "calling", label: "Calling & follow-up", chart: "#eb6834", color: "#b2461b", bg: "#fdeee7" },
  { key: "meeting", label: "Meeting & site visit", chart: "#1baf7a", color: "#0e7a54", bg: "#e2f6ee" },
  { key: "proposal", label: "Quotation & negotiation", chart: "#eda100", color: "#8a5c00", bg: "#fdf3dc" },
  { key: "won", label: "Won", chart: "#008300", color: "#006300", bg: "#e3f3e3" },
  { key: "invalid", label: "Invalid / duplicate", chart: "#6250d6", color: "#4a3aa7", bg: "#eeebfb" },
  { key: "lost", label: "Lost", chart: "#e34948", color: "#b52f2e", bg: "#fde9e9" },
];

export const LEAD_STATUSES = [
  { value: "New Lead", group: "new" },
  { value: "Attempted – No Answer", group: "calling" },
  { value: "Contacted", group: "calling" },
  { value: "Follow-Up Required", group: "calling" },
  { value: "Qualified Lead", group: "calling" },
  { value: "Meeting/consultation booked", group: "meeting" },
  { value: "Site Visit Scheduled", group: "meeting" },
  { value: "Site visit confirmed", group: "meeting" },
  { value: "Site Visit Completed", group: "meeting" },
  { value: "Quotation Shared", group: "proposal" },
  { value: "Negotiation", group: "proposal" },
  { value: "Won – Converted", group: "won" },
  { value: "Lost – Not Interested", group: "lost" },
  { value: "Lost – Budget Issue", group: "lost" },
  { value: "Lost – Competitor", group: "lost" },
  { value: "Invalid / Duplicate", group: "invalid" },
];

export const DEFAULT_STATUS = "New Lead";

const GROUP_BY_KEY = new Map(STATUS_GROUPS.map((g) => [g.key, g]));
const BY_VALUE = new Map(LEAD_STATUSES.map((s) => [s.value, s]));

export function isValidStatus(value) {
  return BY_VALUE.has(value);
}

// { key, label, chart, color, bg } for a status value
export function statusGroup(value) {
  return GROUP_BY_KEY.get(BY_VALUE.get(value)?.group) || STATUS_GROUPS[0];
}

export function statusColors(value) {
  return statusGroup(value);
}
