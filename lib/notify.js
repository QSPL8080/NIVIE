// WhatsApp alert to the business number for every new website enquiry.
//
// Uses the CallMeBot WhatsApp API (free, for your own number). One-time setup:
//   1. Open https://www.callmebot.com/blog/free-api-whatsapp-messages/ and save the bot's
//      WhatsApp number shown there in the phone's contacts.
//   2. From the WhatsApp of the number that should receive alerts, send:
//        I allow callmebot to send me messages
//   3. The bot replies with your API key.
//   4. Set these environment variables (Hostinger hPanel + .env.local):
//        WHATSAPP_NOTIFY_PHONE=+919226333902
//        CALLMEBOT_APIKEY=123456
// If either is missing, alerts are simply skipped (the enquiry is still saved).

const TIMEOUT_MS = 10000;

export function formatIST(date = new Date()) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function newLeadMessage(lead, { id, panelUrl, saved = true, at = new Date() } = {}) {
  const lines = [
    "*New Enquiry – Nivie Designs*",
    "",
    `Name: ${lead.name}`,
    `Mobile: ${lead.phone}`,
    `Budget: ${lead.budget || "—"}`,
    `Location: ${lead.location || "—"}`,
    `Property: ${lead.type || "—"}`,
    `Timeline: ${lead.timeline || "—"}`,
    `Form: ${lead.source || "Page Form"}`,
    `Received: ${formatIST(at)} (IST)`,
  ];
  if (id) lines.push(`Lead ID: #${id}`);
  if (!saved) lines.push("", "⚠ Could not be saved in the admin panel — please note it down.");
  if (panelUrl && saved) lines.push("", `Open panel: ${panelUrl}`);
  return lines.join("\n");
}

export async function sendWhatsAppAlert(text) {
  const phone = (process.env.WHATSAPP_NOTIFY_PHONE || "").replace(/[^\d+]/g, "");
  const apikey = (process.env.CALLMEBOT_APIKEY || "").trim();
  if (!phone || !apikey) {
    console.warn("[whatsapp] Skipped: set WHATSAPP_NOTIFY_PHONE and CALLMEBOT_APIKEY to get alerts.");
    return false;
  }
  const url =
    "https://api.callmebot.com/whatsapp.php?" +
    new URLSearchParams({ phone, apikey, text, source: "nivie-website" }).toString();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    const body = (await res.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!res.ok || /error|invalid|not\s+(active|registered)/i.test(body)) {
      console.error("[whatsapp] Not sent:", res.status, body.slice(0, 200));
      return false;
    }
    console.log("[whatsapp] Alert sent to", phone);
    return true;
  } catch (err) {
    console.error("[whatsapp] Not sent:", err.name === "TimeoutError" ? "timed out" : err.message);
    return false;
  }
}
