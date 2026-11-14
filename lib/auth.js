import crypto from "crypto";

export const SESSION_COOKIE_NAME = "nivie_admin_session";

// Admin is logged out after this long without any activity in the panel.
export const IDLE_MINUTES = 10;
export const IDLE_MS = IDLE_MINUTES * 60 * 1000;
// Bump this to log everyone out (old long-lived sessions from before are rejected).
const SESSION_VERSION = 2;

// All admin settings come from .env.local — there are no built-in fallback
// passwords, so a missing setting can never leave the panel open to a known default.
const env = (k) => (process.env[k] || "").trim();

function secret() {
  const s = env("SESSION_SECRET");
  if (s.length < 16) throw new Error("SESSION_SECRET in .env.local must be at least 16 characters.");
  return s;
}

const sha = (v) => crypto.createHash("sha256").update(String(v)).digest();
const safeEqual = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));

export function verifyCredentials(identifier, password) {
  const adminPassword = env("ADMIN_PASSWORD");
  if (!identifier || !password || !adminPassword) return null;

  const id = String(identifier).trim().toLowerCase();
  const email = env("ADMIN_EMAIL").toLowerCase();
  const username = (env("ADMIN_USERNAME") || "Nivie Admin").toLowerCase();

  const idOk = (email && id === email) || id === username;
  const pwdOk = safeEqual(String(password), adminPassword);
  if (!idOk || !pwdOk) return null;

  return {
    username: env("ADMIN_USERNAME") || "Nivie Admin",
    email: env("ADMIN_EMAIL"),
  };
}

const sign = (data) => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

export function createToken(payload, expiresInMs = IDLE_MS) {
  const data = Buffer.from(JSON.stringify({ ...payload, v: SESSION_VERSION, exp: Date.now() + expiresInMs })).toString("base64url");
  return `${data}.${sign(data)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") return null;
  const [data, signature, extra] = token.split(".");
  if (!data || !signature || extra !== undefined) return null;
  try {
    if (!safeEqual(signature, sign(data))) return null;
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8"));
    if (payload.v !== SESSION_VERSION) return null;
    // Never accept a token that claims to last longer than the idle limit.
    if (!payload.exp || Date.now() > payload.exp || payload.exp - Date.now() > IDLE_MS + 60000) return null;
    return payload;
  } catch {
    return null;
  }
}

// Secure cookies only work over https. Detect it per request so the panel also
// works on http://localhost and http://192.168.x.x (npm run network).
function isHttps(req) {
  if (!req) return false;
  const proto = req.headers.get("x-forwarded-proto");
  if (proto) return proto.split(",")[0].trim() === "https";
  return new URL(req.url).protocol === "https:";
}

// Writes a fresh 10-minute session cookie onto a NextResponse.
// Called on login and every time the panel reports activity (sliding expiry).
export function setSessionCookie(response, user, req) {
  const token = createToken({ username: user.username, email: user.email }, IDLE_MS);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isHttps(req),
    sameSite: "lax",
    maxAge: IDLE_MS / 1000,
    path: "/",
  });
  return response;
}

export function clearSessionCookie(response) {
  response.cookies.set({ name: SESSION_COOKIE_NAME, value: "", httpOnly: true, maxAge: 0, path: "/" });
  return response;
}
