"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [notice, setNotice] = useState("");

  // Check existing session; if already authenticated, redirect to /panel
  useEffect(() => {
    // Why the admin was sent back here (auto logout)
    const reason = new URLSearchParams(window.location.search).get("reason");
    if (reason === "idle") setNotice("You were logged out after 10 minutes of inactivity. Please sign in again.");
    else if (reason === "expired") setNotice("Your session has expired. Please sign in again.");

    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) router.replace("/panel");
        else setChecking(false);
      })
      .catch(() => setChecking(false));

    // Pre-fill remembered identifier if saved
    try {
      const saved = localStorage.getItem("nivie_admin_remember");
      if (saved) {
        setIdentifier(saved);
        setRememberMe(true);
      }
    } catch {}
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Invalid login credentials. Please try again.");
        setLoading(false);
        return;
      }

      // Handle remember me in localStorage
      try {
        if (rememberMe) {
          localStorage.setItem("nivie_admin_remember", identifier.trim());
        } else {
          localStorage.removeItem("nivie_admin_remember");
        }
      } catch {}

      router.replace("/panel");
    } catch {
      setError("Unable to connect to server. Please try again.");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          {/* Official Nivie Designs Logo */}
          <div style={styles.logoRow}>
            <img
              src="/images/logo-mark-sm.png"
              alt="Nivie Logo Mark"
              style={styles.logoMark}
            />
            <img
              src="/images/wordmark-plum.png"
              alt="Nivie Designs"
              style={styles.logoWord}
            />
          </div>

          <p style={styles.subtitle}>Sign in to view and manage client leads</p>
        </div>

        {notice && !error && (
          <div style={styles.noticeBox} role="status">
            {notice}
          </div>
        )}

        {error && (
          <div style={styles.errorBox} role="alert">
            <svg style={styles.errorIcon} viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label htmlFor="identifier" style={styles.label}>
              Email or Username
            </label>
            <input
              id="identifier"
              type="text"
              required
              autoFocus={!identifier}
              autoComplete="username"
              placeholder="Email or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <div style={styles.labelRow}>
              <label htmlFor="password" style={styles.label}>
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.toggleBtn}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>

          {/* Remember Me Checkbox */}
          <div style={styles.rememberRow}>
            <label style={styles.rememberLabel}>
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={styles.checkbox}
              />
              <span style={styles.rememberText}>Remember my email</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitBtn,
              opacity: loading ? 0.75 : 1,
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Authenticating…" : "Sign In to Panel"}
          </button>
        </form>

        <Link href="/" style={styles.backLink}>
          ← Back to Website
        </Link>

      </div>
    </div>
  );
}

const styles = {
  loadingWrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f4f1ed",
  },
  spinner: {
    width: "36px",
    height: "36px",
    border: "3px solid rgba(129, 46, 90, 0.2)",
    borderTopColor: "#812e5a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #1f0613 0%, #2b0b1c 50%, #15040d 100%)",
    padding: "24px 16px",
    fontFamily: "var(--f-body, system-ui, -apple-system, sans-serif)",
  },
  card: {
    width: "100%",
    maxWidth: "440px",
    background: "#ffffff",
    borderRadius: "20px",
    padding: "44px 36px 36px",
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
  },
  header: {
    textAlign: "center",
    marginBottom: "26px",
    position: "relative",
  },
  backLink: {
    display: "block",
    width: "fit-content",
    margin: "22px auto 0",
    fontSize: "12px",
    color: "#812e5a",
    textDecoration: "none",
    fontWeight: "500",
    letterSpacing: "0.02em",
  },
  logoRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    marginBottom: "18px",
    marginTop: "8px",
  },
  logoMark: {
    width: "78px",
    height: "auto",
    display: "block",
  },
  logoWord: {
    height: "62px",
    width: "auto",
    display: "block",
  },
  subtitle: {
    fontSize: "13.5px",
    color: "#6b6267",
    margin: "0",
  },
  noticeBox: {
    color: "#c0182f",
    fontSize: "13.5px",
    fontWeight: "500",
    lineHeight: 1.5,
    textAlign: "center",
    margin: "0 0 18px 0",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "#fff0f3",
    color: "#b00020",
    border: "1px solid #f8c8d2",
    borderRadius: "10px",
    padding: "11px 14px",
    fontSize: "13px",
    marginBottom: "20px",
  },
  errorIcon: {
    width: "18px",
    height: "18px",
    flexShrink: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  labelRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: "12.5px",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#350c21",
  },
  toggleBtn: {
    background: "none",
    border: "none",
    color: "#812e5a",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    padding: 0,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 16px",
    borderRadius: "10px",
    border: "1.5px solid #e5dfe2",
    background: "#faf9f8",
    fontSize: "14.5px",
    color: "#1a1a1a",
    outline: "none",
    transition: "border-color 0.2s, background 0.2s",
  },
  rememberRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    marginTop: "-4px",
  },
  rememberLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    cursor: "pointer",
    userSelect: "none",
  },
  checkbox: {
    width: "16px",
    height: "16px",
    accentColor: "#812e5a",
    cursor: "pointer",
  },
  rememberText: {
    fontSize: "13px",
    color: "#4f454a",
  },
  submitBtn: {
    marginTop: "6px",
    width: "100%",
    padding: "14px 20px",
    background: "#812e5a",
    color: "#ffffff",
    border: "none",
    borderRadius: "10px",
    fontSize: "15px",
    fontWeight: "600",
    letterSpacing: "0.02em",
    transition: "background 0.2s, transform 0.1s",
  },
};
