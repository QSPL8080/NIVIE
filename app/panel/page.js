"use client";

import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LEAD_STATUSES, STATUS_GROUPS, statusColors, statusGroup } from "@/lib/leadStatus";

// Must match IDLE_MINUTES in lib/auth.js
const IDLE_MS = 10 * 60 * 1000;
const PING_EVERY_MS = 60 * 1000; // extend the server session at most once a minute while active
const ACTIVITY_KEY = "nivie_admin_last_active"; // shared by all open panel tabs

// Dates are compared in India time, so a lead at 11:30 pm stays on the right day/month.
const istDate = (d) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(d ? new Date(d) : new Date()); // "2026-11-14"
const shiftMonth = (ym, delta) => {
  let [y, m] = ym.split("-").map(Number);
  m += delta;
  while (m < 1) { m += 12; y -= 1; }
  while (m > 12) { m -= 12; y += 1; }
  return `${y}-${String(m).padStart(2, "0")}`;
};
const formatDay = (ymd) => {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};
const monthLabel = (ym, short = false) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleString("en-IN", {
    month: short ? "short" : "long",
    year: "numeric",
    timeZone: "UTC",
  });
};

export default function AdminPanelPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  // "current" always means the live month (it moves to the next month by itself)
  const [monthFilter, setMonthFilter] = useState("current");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [today, setToday] = useState(() => istDate());
  useEffect(() => {
    const t = setInterval(() => setToday(istDate()), 60000);
    return () => clearInterval(t);
  }, []);
  const liveMonth = today.slice(0, 7);
  const [selectedLead, setSelectedLead] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  // Authenticate & fetch user
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) {
          router.replace("/login");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.authenticated) {
          setUser(data.user);
          loadLeads();
        }
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  // silent = true for the 5-second auto refresh (no spinner, no flicker)
  const lastLeadsJson = useRef("");
  const busy = useRef(0); // >0 while a status/note is being saved → skip auto refresh
  const loadLeads = useCallback(async (silent = false) => {
    silent = silent === true;
    if (silent && busy.current > 0) return;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const res = await fetch("/api/admin/leads", { cache: "no-store" });
      if (res.status === 401) {
        handleLogout("expired");
        return;
      }
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load leads from database.");
        if (!silent) setLeads([]);
      } else {
        setError("");
        const json = JSON.stringify(data.leads || []);
        if (json !== lastLeadsJson.current) {
          lastLeadsJson.current = json;
          setLeads(data.leads || []);
        }
      }
    } catch (err) {
      if (!silent) setError("Network or database connection error: " + err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [router]);

  // ---- Auto refresh leads every 5 seconds (paused while the tab is hidden) ----
  useEffect(() => {
    if (!user) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !loggingOut.current) loadLeads(true);
    }, 5000);
    return () => clearInterval(timer);
  }, [user, loadLeads]);

  const loggingOut = useRef(false);
  const handleLogout = useCallback(
    async (reason) => {
      if (loggingOut.current) return;
      loggingOut.current = true;
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {}
      try {
        localStorage.removeItem(ACTIVITY_KEY);
      } catch {}
      router.replace(typeof reason === "string" ? `/login?reason=${reason}` : "/login");
    },
    [router]
  );

  // ---- Auto logout after 10 minutes with no activity ----
  useEffect(() => {
    if (!user) return;
    let lastActive = Date.now();
    let lastPing = Date.now();
    let lastSaved = 0;

    const readShared = () => {
      try {
        return Number(localStorage.getItem(ACTIVITY_KEY)) || 0;
      } catch {
        return 0;
      }
    };
    const markActive = () => {
      lastActive = Date.now();
      if (lastActive - lastSaved > 5000) {
        lastSaved = lastActive;
        try {
          localStorage.setItem(ACTIVITY_KEY, String(lastActive));
        } catch {}
      }
    };

    const check = async () => {
      if (loggingOut.current) return;
      const last = Math.max(lastActive, readShared());
      const now = Date.now();
      if (now - last >= IDLE_MS) {
        handleLogout("idle");
        return;
      }
      // Active recently → keep the server session alive.
      if (last > lastPing && now - lastPing >= PING_EVERY_MS) {
        lastPing = now;
        try {
          const res = await fetch("/api/auth/ping", { method: "POST" });
          if (res.status === 401) handleLogout("expired");
        } catch {}
      }
    };

    markActive();
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];
    events.forEach((e) => window.addEventListener(e, markActive, { passive: true }));
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    const timer = setInterval(check, 15000);

    return () => {
      events.forEach((e) => window.removeEventListener(e, markActive));
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      clearInterval(timer);
    };
  }, [user, handleLogout]);

  // ---- Lead status ----
  const updateStatus = async (id, status) => {
    const before = leads.find((l) => l.id === id)?.status;
    if (!status || status === before) return;
    busy.current++;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    try {
      const res = await fetch("/api/admin/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.status === 401) return handleLogout("expired");
      const data = await res.json();
      if (data.success) {
        if (data.changedAt) {
          setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status_updated_at: data.changedAt } : l)));
        }
        if (id === selectedLeadIdRef.current) loadHistory(id);
      } else {
        if (data.notFound) {
          setLeads((prev) => prev.filter((l) => l.id !== id));
          setSelectedLead((cur) => (cur?.id === id ? null : cur));
        } else {
          setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: before } : l)));
        }
        alert(data.error || "Could not update the status.");
      }
    } catch {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: before } : l)));
      alert("Error connecting to server. Status not changed.");
    } finally {
      busy.current--;
    }
  };

  // ---- Notes (shown in the details pop-up) ----
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteError, setNoteError] = useState("");
  const openLeadId = selectedLead?.id;
  const selectedLeadIdRef = useRef(null);
  selectedLeadIdRef.current = openLeadId ?? null;

  // ---- Status history (every change, with date/time and who) ----
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const loadHistory = useCallback(
    async (leadId) => {
      try {
        const res = await fetch(`/api/admin/history?leadId=${leadId}`, { cache: "no-store" });
        if (res.status === 401) return handleLogout("expired");
        const data = await res.json();
        if (data.success && selectedLeadIdRef.current === leadId) setHistory(data.history || []);
      } catch {}
    },
    [handleLogout]
  );
  useEffect(() => {
    setHistory([]);
    if (!openLeadId) return;
    setHistoryLoading(true);
    loadHistory(openLeadId).finally(() => setHistoryLoading(false));
  }, [openLeadId, loadHistory]);

  const [modalTab, setModalTab] = useState("details");
  useEffect(() => {
    setModalTab("details");
    setEditingNoteId(null);
    setNotes([]);
    setNoteText("");
    setNoteError("");
    if (!openLeadId) return;
    let cancelled = false;
    setNotesLoading(true);
    fetch(`/api/admin/notes?leadId=${openLeadId}`, { cache: "no-store" })
      .then(async (res) => {
        if (res.status === 401) return handleLogout("expired");
        const data = await res.json();
        if (!cancelled && data.success) setNotes(data.notes || []);
      })
      .catch(() => !cancelled && setNoteError("Could not load notes."))
      .finally(() => !cancelled && setNotesLoading(false));
    return () => {
      cancelled = true;
    };
  }, [openLeadId, handleLogout]);

  // keep the open pop-up in sync with the 5-second auto refresh
  useEffect(() => {
    if (!openLeadId) return;
    const fresh = leads.find((l) => l.id === openLeadId);
    if (fresh) setSelectedLead((cur) => (cur && cur !== fresh ? fresh : cur));
  }, [leads, openLeadId]);

  const syncNoteSummary = (leadId, list) => {
    setLeads((prev) =>
      prev.map((l) =>
        l.id === leadId ? { ...l, notes_count: list.length, last_note: list[0]?.note || null } : l
      )
    );
  };

  const addNote = async () => {
    const text = noteText.trim();
    if (!text || !openLeadId || noteSaving) return;
    setNoteSaving(true);
    setNoteError("");
    busy.current++;
    try {
      const res = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: openLeadId, note: text }),
      });
      if (res.status === 401) return handleLogout("expired");
      const data = await res.json();
      if (!data.success) {
        setNoteError(data.error || "Could not save the note.");
        return;
      }
      const list = [data.note, ...notes];
      setNotes(list);
      syncNoteSummary(openLeadId, list);
      setNoteText("");
    } catch {
      setNoteError("Error connecting to server. Note not saved.");
    } finally {
      busy.current--;
      setNoteSaving(false);
    }
  };

  // Notes can be edited (never deleted)
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editText, setEditText] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const startEdit = (n) => {
    setEditingNoteId(n.id);
    setEditText(n.note);
  };
  const saveEdit = async () => {
    const text = editText.trim();
    if (!text || editSaving) return;
    const original = notes.find((n) => n.id === editingNoteId);
    if (original && original.note === text) return setEditingNoteId(null);
    setEditSaving(true);
    busy.current++;
    try {
      const res = await fetch("/api/admin/notes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingNoteId, note: text }),
      });
      if (res.status === 401) return handleLogout("expired");
      const data = await res.json();
      if (!data.success) return alert(data.error || "Could not save the change.");
      const list = notes.map((n) => (n.id === data.note.id ? data.note : n));
      setNotes(list);
      syncNoteSummary(openLeadId, list);
      setEditingNoteId(null);
    } catch {
      alert("Error connecting to server. Change not saved.");
    } finally {
      busy.current--;
      setEditSaving(false);
    }
  };

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Delete this lead permanently? It will be removed from the database and cannot be recovered.")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/leads?id=${id}`, { method: "DELETE" });
      if (res.status === 401) return handleLogout("expired");
      const data = await res.json();
      if (data.success || data.notFound) {
        // Gone from the database → remove it from the screen too
        setLeads((prev) => prev.filter((l) => l.id !== id));
        if (selectedLead?.id === id) setSelectedLead(null);
      } else {
        alert(data.error || "Failed to delete lead.");
      }
    } catch {
      alert("Error connecting to server.");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  // Unique sources for filter
  const sources = useMemo(() => {
    const s = new Set();
    leads.forEach((l) => l.source && s.add(l.source));
    return Array.from(s);
  }, [leads]);

  // Months in the month dropdown: the last 12 months, every older month that has leads,
  // and whatever month the arrows are on (newest first).
  const monthOptions = useMemo(() => {
    let first = shiftMonth(liveMonth, -11);
    leads.forEach((l) => {
      if (l.created_at) {
        const ym = istDate(l.created_at).slice(0, 7);
        if (ym < first) first = ym;
      }
    });
    const chosen = monthFilter !== "all" && monthFilter !== "current" ? monthFilter : null;
    if (chosen && chosen < first) first = chosen;
    const last = chosen && chosen > liveMonth ? chosen : liveMonth;
    const list = [];
    for (let ym = last; ym >= first && list.length < 400; ym = shiftMonth(ym, -1)) list.push(ym);
    return list;
  }, [leads, liveMonth, monthFilter]);

  const activeMonth = monthFilter === "current" ? liveMonth : monthFilter; // "all" or "YYYY-MM"

  // Choosing the live month keeps it "live" (it moves on by itself when the month changes)
  const pickMonth = (ym) => {
    setMonthFilter(ym === liveMonth ? "current" : ym);
    setDateFrom("");
    setDateTo("");
  };
  // Arrows always work — any month can be opened (months with no leads simply show 0).
  const MIN_MONTH = "2020-01";
  const MAX_MONTH = shiftMonth(liveMonth, 12);
  const canPrev = activeMonth === "all" || activeMonth > MIN_MONTH;
  const canNext = activeMonth === "all" || activeMonth < MAX_MONTH;
  const stepMonth = (delta) => {
    if (activeMonth === "all") return pickMonth(liveMonth); // from "All months", either arrow goes to the current month
    const next = shiftMonth(activeMonth, delta);
    if (next < MIN_MONTH || next > MAX_MONTH) return;
    pickMonth(next);
  };
  const periodLabel =
    dateFrom || dateTo
      ? `${dateFrom ? formatDay(dateFrom) : "Start"} – ${dateTo ? formatDay(dateTo) : "Today"}`
      : activeMonth === "all"
      ? "All time"
      : monthLabel(activeMonth);

  // Leads inside the chosen period (month + date range + source) — used by the chart and the table
  const periodLeads = useMemo(() => {
    return leads.filter((l) => {
      if (sourceFilter !== "all" && l.source !== sourceFilter) return false;
      const day = l.created_at ? istDate(l.created_at) : "";
      if (activeMonth !== "all" && !day.startsWith(activeMonth)) return false;
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    });
  }, [leads, sourceFilter, activeMonth, dateFrom, dateTo]);

  // Table rows: period + status + search
  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return periodLeads.filter((l) => {
      if (statusFilter !== "all" && (l.status || "New Lead") !== statusFilter) return false;
      if (!q) return true;
      if (qDigits.length >= 3 && (l.phone || "").replace(/\D/g, "").includes(qDigits)) return true;
      return [l.name, l.phone, l.location, l.type, l.budget, l.timeline, l.source, l.status || "New Lead", l.last_note]
        .some((v) => v && String(v).toLowerCase().includes(q));
    });
  }, [periodLeads, search, statusFilter]);

  const filtersActive =
    search || sourceFilter !== "all" || statusFilter !== "all" || monthFilter !== "current" || dateFrom || dateTo;
  const clearFilters = () => {
    setSearch("");
    setSourceFilter("all");
    setStatusFilter("all");
    setMonthFilter("current");
    setDateFrom("");
    setDateTo("");
  };

  const statusCounts = useMemo(() => {
    const c = {};
    periodLeads.forEach((l) => {
      const st = l.status || "New Lead";
      c[st] = (c[st] || 0) + 1;
    });
    return c;
  }, [periodLeads]);

  // Export to CSV
  const exportCSV = () => {
    if (!leads.length) return;
    const headers = [
      "Sr No",
      "Lead ID",
      "Date & Time",
      "Source",
      "Full Name",
      "Mobile Number",
      "Interior Budget",
      "Property Location",
      "Property Type",
      "Project Timeline",
      "Status",
      "Notes",
      "Latest Note",
    ];

    const rows = leads.map((l, idx) => [
      idx + 1,
      l.id,
      `"${formatDate(l.created_at)}"`,
      `"${l.source || "Website"}"`,
      `"${(l.name || "").replace(/"/g, '""')}"`,
      `"${(l.phone || "").replace(/"/g, '""')}"`,
      `"${(l.budget || "").replace(/"/g, '""')}"`,
      `"${(l.location || "").replace(/"/g, '""')}"`,
      `"${(l.type || "").replace(/"/g, '""')}"`,
      `"${(l.timeline || "").replace(/"/g, '""')}"`,
      `"${(l.status || "New Lead").replace(/"/g, '""')}"`,
      l.notes_count || 0,
      `"${(l.last_note || "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Nivie_Leads_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const todayCount = useMemo(
    () => leads.filter((l) => l.created_at && istDate(l.created_at) === today).length,
    [leads, today]
  );

  return (
    <div className="pn-layout" style={styles.layout}>
      <style>{RESPONSIVE_CSS}</style>
      {/* ===================== SIDEBAR ===================== */}
      <aside className="pn-sidebar" style={styles.sidebar}>
        {/* Brand Logo Lockup */}
        <div className="pn-brand" style={styles.sideBrand}>
          <div style={styles.logoRow}>
            <img
              src="/images/logo-mark-sm.png"
              alt="Nivie Logo"
              className="pn-mark"
              style={styles.sideLogoMark}
            />
            <img
              src="/images/wordmark-ivory.png"
              alt="Nivie Designs"
              className="pn-word"
              style={styles.sideWordmark}
            />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="pn-sidenav" style={styles.sideNav}>
          <button
            onClick={() => loadLeads()}
            className="pn-nav-leads"
            style={{ ...styles.navItem, ...styles.navItemActive }}
          >
            <svg style={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span style={styles.navLabel}>Client Leads</span>
            <span style={styles.navCountPill}>{leads.length}</span>
          </button>

          <Link href="/" target="_blank" className="pn-nav-site" style={styles.navItemLink}>
            <svg style={styles.navIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            <span className="pn-nav-label" style={styles.navLabel}>View Website</span>
          </Link>
        </nav>

        {/* Sidebar Footer: Profile & Logout */}
        <div className="pn-sidefooter" style={styles.sideFooter}>
          <div className="pn-profile" style={styles.profileBox}>
            <div style={styles.avatar}>NA</div>
            <div style={styles.profileInfo}>
              <strong style={styles.profileName}>{user?.username || "Nivie Admin"}</strong>
              <small style={styles.profileEmail}>{user?.email || "admin@nivie.com"}</small>
            </div>
          </div>

          <button onClick={handleLogout} className="pn-logout" style={styles.logoutBtn} aria-label="Logout">
            <svg style={styles.logoutIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="pn-nav-label">Logout</span>
          </button>
        </div>
      </aside>

      {/* ===================== MAIN CONTENT ===================== */}
      <main className="pn-main" style={styles.main}>
        {/* Top Header Bar */}
        <header className="pn-header" style={styles.mainHeader}>
          <div>
            <h1 className="pn-title" style={styles.pageTitle}>
              Leads Management
            </h1>
            <p style={styles.pageSub}>
              View, search, and export enquiries submitted through your website.
            </p>
          </div>

          <div className="pn-actions" style={styles.headerRight}>
            <>
                <button onClick={() => loadLeads()} disabled={loading} style={styles.iconBtn}>
                  <svg
                    style={{
                      ...styles.actionIcon,
                      animation: loading ? "spin 1s linear infinite" : "none",
                    }}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M23 4v6h-6" />
                    <path d="M1 20v-6h6" />
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  Refresh
                </button>

                <button
                  onClick={exportCSV}
                  disabled={!leads.length}
                  style={{
                    ...styles.exportBtn,
                    opacity: leads.length ? 1 : 0.5,
                    cursor: leads.length ? "pointer" : "not-allowed",
                  }}
                >
                  <svg style={styles.actionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Export CSV
                </button>
            </>
          </div>
        </header>

        {/* LEADS VIEW */}
          <>
            {/* Quick Metrics (Full Width Grid) */}
            <div className="pn-metrics" style={styles.metricsGrid}>
              <div className="pn-metric" style={styles.metricCard}>
                <span className="pn-metric-label" style={styles.metricLabel}>Leads · {periodLabel}</span>
                <strong style={styles.metricVal}>{periodLeads.length}</strong>
                <span className="pn-metric-sub" style={styles.metricSub}>{leads.length} received in total</span>
              </div>

              <div className="pn-metric" style={styles.metricCard}>
                <span className="pn-metric-label" style={styles.metricLabel}>Today&apos;s Enquiries</span>
                <strong style={{ ...styles.metricVal, color: "#812e5a" }}>{todayCount}</strong>
                <span className="pn-metric-sub" style={styles.metricSub}>Received today</span>
              </div>

              <div className="pn-chart-card" style={{ ...styles.metricCard, ...styles.chartCard }}>
                <span className="pn-metric-label" style={styles.metricLabel}>Lead Status · {periodLabel}</span>
                <StatusChart
                  leads={periodLeads}
                  activeStatus={statusFilter}
                  onPick={(st) => setStatusFilter((cur) => (cur === st ? "all" : st))}
                />
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="pn-toolbar" style={styles.toolbar}>
              <label className="pn-search" style={{ ...styles.filterField, ...styles.toolSearchWrap }}>
                <span style={styles.filterLabel}>Search</span>
                <span style={{ position: "relative", display: "block" }}>
                <svg style={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Name, mobile, location, budget, status…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.toolSearch}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={styles.clearBtn}>
                    ✕
                  </button>
                )}
                </span>
              </label>

              <div className="pn-filters" style={styles.toolActions}>
                <div className="pn-month" style={styles.filterField}>
                  <span style={styles.filterLabel}>Month</span>
                  <div style={styles.monthNav}>
                    <button
                      type="button"
                      onClick={() => stepMonth(-1)}
                      disabled={!canPrev}
                      aria-label="Previous month"
                      style={{ ...styles.monthArrow, opacity: canPrev ? 1 : 0.35 }}
                    >
                      ‹
                    </button>
                    <select
                      value={monthFilter === "current" ? liveMonth : monthFilter}
                      onChange={(e) => pickMonth(e.target.value)}
                      aria-label="Month"
                      style={styles.monthSelect}
                    >
                      <option value="all">All months</option>
                      {monthOptions.map((ym) => (
                        <option key={ym} value={ym}>
                          {monthLabel(ym)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => stepMonth(1)}
                      disabled={!canNext}
                      aria-label="Next month"
                      style={{ ...styles.monthArrow, opacity: canNext ? 1 : 0.35 }}
                    >
                      ›
                    </button>
                  </div>
                </div>
                <label style={styles.filterField}>
                  <span style={styles.filterLabel}>From</span>
                  <input
                    type="date"
                    value={dateFrom}
                    max={dateTo || today}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      if (e.target.value) setMonthFilter("all");
                    }}
                    className="pn-select"
                    style={{ ...styles.selectFilter, width: "128px" }}
                  />
                </label>
                <label style={styles.filterField}>
                  <span style={styles.filterLabel}>To</span>
                  <input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    max={today}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      if (e.target.value) setMonthFilter("all");
                    }}
                    className="pn-select"
                    style={{ ...styles.selectFilter, width: "128px" }}
                  />
                </label>
                <div className="pn-dd-field" style={styles.filterField}>
                  <span style={styles.filterLabel}>Source</span>
                  <FilterDropdown
                    ariaLabel="Filter by source"
                    width={118}
                    value={sourceFilter}
                    onChange={setSourceFilter}
                    options={[
                      { value: "all", label: "All sources" },
                      ...sources.map((src) => ({ value: src, label: src })),
                    ]}
                  />
                </div>
                <div className="pn-dd-field" style={styles.filterField}>
                  <span style={styles.filterLabel}>Status</span>
                  <FilterDropdown
                    ariaLabel="Filter by status"
                    width={158}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    options={[
                      { value: "all", label: "All statuses", count: periodLeads.length },
                      ...LEAD_STATUSES.map((st) => ({
                        value: st.value,
                        label: st.value,
                        count: statusCounts[st.value] || 0,
                        dot: statusGroup(st.value).chart,
                      })),
                    ]}
                  />
                </div>
                {filtersActive && (
                  <button onClick={clearFilters} style={styles.clearFiltersBtn}>
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Full Width Leads Table Card */}
            <div className="pn-tablecard" style={styles.tableCard}>
              <div style={styles.tableHeaderBar}>
                <div>
                  <h2 style={styles.tableTitle}>Client Enquiries</h2>
                  <span style={styles.tableCount}>
                    Showing {filteredLeads.length} of {periodLeads.length} leads · {periodLabel}
                  </span>
                </div>
              </div>

              <div style={styles.tableResponsive}>
                <table className="pn-table" style={styles.table}>
                  <thead className="pn-thead">
                    <tr style={styles.thRow}>
                      <th style={styles.th}>Sr. No</th>
                      <th style={styles.th}>Date &amp; Time</th>
                      <th style={styles.th}>Source</th>
                      <th style={styles.th}>Client Name</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Mobile Number</th>
                      <th style={styles.th}>Interior Budget</th>
                      <th style={styles.th}>Location</th>
                      <th style={styles.th}>Property Type</th>
                      <th style={styles.th}>Timeline</th>
                      <th style={{ ...styles.th, textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading && (
                      <tr>
                        <td colSpan="11" style={styles.emptyTd}>
                          <div style={styles.tableLoading}>
                            <div style={styles.miniSpinner} />
                            <span>Loading leads from MySQL...</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!loading && filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan="11" style={styles.emptyTd}>
                          <div style={styles.emptyState}>
                            <svg style={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                              <line x1="8" y1="21" x2="16" y2="21" />
                              <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            <strong>No enquiries found</strong>
                            <p style={styles.emptySub}>
                              {search
                                ? `No enquiries matched "${search}" in ${periodLabel}.`
                                : leads.length
                                ? `No enquiries for ${periodLabel} with these filters. Try "All months" or Reset filters.`
                                : "Submissions from your website enquiry forms will appear here automatically."}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      filteredLeads.map((lead, idx) => (
                        <tr
                          key={lead.id}
                          onClick={() => setSelectedLead(lead)}
                          className="pn-row"
                          style={{
                            ...styles.tr,
                            backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fdfbfb",
                          }}
                        >
                          <td className="pn-td-sr" style={styles.tdSr}>
                            <span style={styles.srBadge}>#{idx + 1}</span>
                          </td>
                          <td className="pn-td-date" data-label="Received" style={styles.tdDate}>
                            <span style={styles.dateMain}>{formatDate(lead.created_at)}</span>
                          </td>
                          <td className="pn-td-source" data-label="Source" style={styles.td}>
                            <span style={getSourceBadgeStyle(lead.source)}>
                              {lead.source || "Website"}
                            </span>
                          </td>
                          <td className="pn-td-name" style={styles.tdName}>
                            <strong>{lead.name}</strong>
                            {lead.notes_count > 0 && (
                              <span style={styles.notesCount} title={lead.last_note || ""}>
                                {lead.notes_count} {lead.notes_count === 1 ? "note" : "notes"}
                              </span>
                            )}
                          </td>
                          <td className="pn-td-status" data-label="Status" style={styles.td} onClick={(e) => e.stopPropagation()}>
                            <StatusSelect value={lead.status} onChange={(v) => updateStatus(lead.id, v)} />
                            {lead.status_updated_at && (
                              <span style={styles.statusStamp} title="Last status change">
                                {formatDate(lead.status_updated_at)}
                              </span>
                            )}
                          </td>
                          <td data-label="Mobile" style={styles.td}>
                            <a
                              href={`tel:${lead.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              style={styles.phoneLink}
                            >
                              {lead.phone}
                            </a>
                          </td>
                          <td data-label="Budget" style={styles.td}>
                            <span style={styles.budgetBadge}>{lead.budget || "—"}</span>
                          </td>
                          <td data-label="Location" style={styles.td}>{lead.location || "—"}</td>
                          <td data-label="Property type" style={styles.td}>
                            <span style={styles.typeTag}>{lead.type || "—"}</span>
                          </td>
                          <td data-label="Timeline" style={styles.td}>{lead.timeline || "—"}</td>
                          <td className="pn-td-actions" style={styles.tdAction}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLead(lead);
                              }}
                              style={styles.viewBtn}
                            >
                              View
                            </button>
                            <button
                              onClick={(e) => handleDelete(lead.id, e)}
                              disabled={deletingId === lead.id}
                              style={styles.delBtn}
                            >
                              {deletingId === lead.id ? "…" : "✕"}
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
      </main>

      {/* Full Details Modal */}
      {selectedLead && (
        <div className="pn-modal-overlay" style={styles.modalOverlay} onClick={() => setSelectedLead(null)}>
          <div className="pn-modal" style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHead}>
              <div>
                <span style={getSourceBadgeStyle(selectedLead.source)}>
                  Source: {selectedLead.source || "Website"}
                </span>
                <h3 style={styles.modalTitle}>{selectedLead.name}</h3>
                <span style={styles.modalDate}>{formatDate(selectedLead.created_at)}</span>
              </div>
              <button onClick={() => setSelectedLead(null)} style={styles.modalCloseBtn}>
                ✕
              </button>
            </div>

            <div style={styles.tabBar} role="tablist">
              {[
                ["details", "Details"],
                ["status", `Lead Status${history.length ? ` (${history.length})` : ""}`],
                ["notes", `Notes${notes.length ? ` (${notes.length})` : ""}`],
              ].map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={modalTab === key}
                  onClick={() => setModalTab(key)}
                  style={{ ...styles.tabBtn, ...(modalTab === key ? styles.tabBtnActive : null) }}
                >
                  {label}
                </button>
              ))}
            </div>

            {modalTab === "details" && (
              <>
            <div className="pn-modal-grid" style={styles.modalGrid}>
              <div style={styles.modalItem}>
                <span style={styles.modalLabel}>Mobile Number</span>
                <a href={`tel:${selectedLead.phone}`} style={styles.modalValLink}>
                  {selectedLead.phone}
                </a>
              </div>

              <div style={styles.modalItem}>
                <span style={styles.modalLabel}>Interior Budget</span>
                <strong style={styles.modalValHighlight}>
                  {selectedLead.budget || "Not specified"}
                </strong>
              </div>

              <div style={styles.modalItem}>
                <span style={styles.modalLabel}>Property Location</span>
                <span style={styles.modalVal}>{selectedLead.location || "Not specified"}</span>
              </div>

              <div style={styles.modalItem}>
                <span style={styles.modalLabel}>Property Type</span>
                <span style={styles.modalVal}>{selectedLead.type || "Not specified"}</span>
              </div>

              <div style={styles.modalItem}>
                <span style={styles.modalLabel}>Project Timeline</span>
                <span style={styles.modalVal}>{selectedLead.timeline || "Not specified"}</span>
              </div>

              <div style={styles.modalItem}>
                <span style={styles.modalLabel}>MySQL Lead ID</span>
                <span style={styles.modalVal}>#{selectedLead.id}</span>
              </div>
            </div>

              </>
            )}

            {modalTab === "status" && (
              <div style={styles.tabPanel}>
                <div style={styles.modalStatusRow}>
                  <StatusSelect
                    value={selectedLead.status}
                    onChange={(v) => updateStatus(selectedLead.id, v)}
                    large
                  />
                  {selectedLead.status_updated_at && (
                    <span style={styles.statusUpdated}>Last changed {formatDate(selectedLead.status_updated_at)}</span>
                  )}
                </div>
                <span style={styles.modalLabel}>Status History</span>
                <TwoVisibleList as="ol" style={styles.historyList} deps={[history, selectedLead.id]}>
                  {historyLoading && history.length === 0 && <li style={styles.noteEmpty}>Loading…</li>}
                  {history.map((h) => (
                    <li key={h.id} style={styles.historyItem}>
                      <span style={{ ...styles.historyDot, background: statusGroup(h.to_status).chart }} />
                      <div style={styles.historyBody}>
                        <span style={styles.historyChange}>
                          {h.from_status ? <span style={styles.historyFrom}>{h.from_status} → </span> : null}
                          <strong style={{ color: statusGroup(h.to_status).color }}>{h.to_status}</strong>
                        </span>
                        <span style={styles.historyMeta}>
                          {formatDate(h.changed_at)}
                          {h.changed_by ? ` · by ${h.changed_by}` : ""}
                        </span>
                      </div>
                    </li>
                  ))}
                  <li style={styles.historyItem}>
                    <span style={{ ...styles.historyDot, background: statusGroup("New Lead").chart }} />
                    <div style={styles.historyBody}>
                      <span style={styles.historyChange}>
                        Enquiry received · <strong style={{ color: statusGroup("New Lead").color }}>New Lead</strong>
                      </span>
                      <span style={styles.historyMeta}>
                        {formatDate(selectedLead.created_at)} · {selectedLead.source || "Website"}
                      </span>
                    </div>
                  </li>
                </TwoVisibleList>
              </div>
            )}

            {modalTab === "notes" && (
              <div style={styles.tabPanel}>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      addNote();
                    }
                  }}
                  placeholder="Add a note — e.g. Called, asked to call back on Monday evening"
                  maxLength={2000}
                  rows={3}
                  style={styles.noteInput}
                />
                <div style={styles.noteBar}>
                  <span style={styles.noteHint}>{noteError || "Ctrl + Enter to save"}</span>
                  <button
                    onClick={addNote}
                    disabled={!noteText.trim() || noteSaving}
                    style={{ ...styles.noteAddBtn, opacity: !noteText.trim() || noteSaving ? 0.5 : 1 }}
                  >
                    {noteSaving ? "Saving…" : "Add Note"}
                  </button>
                </div>

                <TwoVisibleList style={styles.noteList} deps={[notes, editingNoteId, selectedLead.id]}>
                  {notesLoading && <span style={styles.noteEmpty}>Loading notes…</span>}
                  {!notesLoading && notes.length === 0 && <span style={styles.noteEmpty}>No notes yet.</span>}
                  {notes.map((n) => (
                    <div key={n.id} style={styles.noteItem}>
                      <div style={styles.noteTop}>
                        <span style={styles.noteDate}>
                          {formatDate(n.created_at)}
                          {n.updated_at ? <span style={styles.noteEdited}> · edited {formatDate(n.updated_at)}</span> : null}
                        </span>
                        {editingNoteId !== n.id && (
                          <button onClick={() => startEdit(n)} style={styles.noteEditBtn}>
                            Edit
                          </button>
                        )}
                      </div>
                      {editingNoteId === n.id ? (
                        <>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                                e.preventDefault();
                                saveEdit();
                              }
                              if (e.key === "Escape") {
                                e.stopPropagation();
                                setEditingNoteId(null);
                              }
                            }}
                            maxLength={2000}
                            rows={3}
                            autoFocus
                            style={{ ...styles.noteInput, minHeight: "64px", marginTop: "4px" }}
                          />
                          <div style={{ ...styles.noteBar, justifyContent: "flex-end", marginTop: "8px" }}>
                            <button onClick={() => setEditingNoteId(null)} style={styles.noteCancelBtn}>
                              Cancel
                            </button>
                            <button
                              onClick={saveEdit}
                              disabled={!editText.trim() || editSaving}
                              style={{ ...styles.noteAddBtn, opacity: !editText.trim() || editSaving ? 0.5 : 1 }}
                            >
                              {editSaving ? "Saving…" : "Save"}
                            </button>
                          </div>
                        </>
                      ) : (
                        <p style={styles.noteText}>{n.note}</p>
                      )}
                    </div>
                  ))}
                </TwoVisibleList>
              </div>
            )}

            <div className="pn-modal-actions" style={styles.modalActions}>
              <a href={`tel:${selectedLead.phone}`} style={styles.modalCallBtn}>
                <svg style={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                Call Client
              </a>
              <a
                href={`https://wa.me/${(selectedLead.phone || "").replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.modalWaBtn}
              >
                <svg style={styles.btnIcon} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z" />
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.73 1.2h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.84 9.84 0 0 0 12.04 2zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24z" />
                </svg>
                WhatsApp
              </a>
              <button
                onClick={(e) => handleDelete(selectedLead.id, e)}
                style={styles.modalDelBtn}
              >
                <svg style={styles.btnIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
                Delete Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Dropdown for the filter bar. Unlike a plain <select>, its list always opens inside the
// screen: it lines up with the right edge when there's no room on the right, opens upwards
// when there's no room below, and scrolls when the list is long.
function FilterDropdown({ value, onChange, options, width = 150, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ right: false, up: false, maxH: 320 });
  const [active, setActive] = useState(0);
  const wrap = useRef(null);
  const list = useRef(null);
  const current = options.find((o) => o.value === value) || options[0];
  const text = (o) => (o.count !== undefined ? `${o.label} (${o.count})` : o.label);

  const openList = () => {
    const r = wrap.current.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 240 && above > below;
    setPlace({
      right: r.left + 300 > window.innerWidth - 12,
      up,
      maxH: Math.max(160, Math.min(380, up ? above : below)),
    });
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const choose = (o) => {
    onChange(o.value);
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const close = (e) => wrap.current && !wrap.current.contains(e.target) && setOpen(false);
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("touchstart", close);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("touchstart", close);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const onKey = (e) => {
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      return openList();
    }
    if (!open) return;
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(options[active]); }
    else if (e.key === "Tab") setOpen(false);
  };

  return (
    <div ref={wrap} className="pn-dd" style={{ position: "relative", width: `${width}px` }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
        style={styles.ddButton}
      >
        <span style={styles.ddButtonText}>{text(current)}</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul
          ref={list}
          role="listbox"
          aria-label={ariaLabel}
          style={{
            ...styles.ddList,
            maxHeight: `${place.maxH}px`,
            ...(place.right ? { right: 0 } : { left: 0 }),
            ...(place.up ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }),
          }}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(o)}
              style={{
                ...styles.ddItem,
                ...(i === active ? styles.ddItemActive : null),
                ...(o.value === value ? styles.ddItemSelected : null),
              }}
            >
              {o.dot ? <span style={{ ...styles.ddDot, background: o.dot }} /> : null}
              <span style={{ flex: 1 }}>{o.label}</span>
              {o.count !== undefined ? <span style={styles.ddCount}>{o.count}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Scroll box that is exactly tall enough to show the first two items; the rest scroll.
function TwoVisibleList({ as: Tag = "div", style, deps = [], children }) {
  const ref = useRef(null);
  const [maxH, setMaxH] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const kids = Array.from(el.children).filter((c) => c.offsetHeight > 0);
      if (kids.length <= 2) return setMaxH(null);
      const top = kids[0].offsetTop;
      const second = kids[1];
      setMaxH(second.offsetTop + second.offsetHeight - top + 4);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return (
    <Tag
      ref={ref}
      style={{ ...style, maxHeight: maxH ? `${maxH}px` : "none", overflowY: maxH ? "auto" : "visible", position: "relative" }}
    >
      {children}
    </Tag>
  );
}

// Donut of leads by pipeline stage + a legend listing every status with its count.
// Click a status in the legend to filter the table by it (click again to clear).
function StatusChart({ leads, activeStatus, onPick }) {
  const [hover, setHover] = useState(null);
  const total = leads.length;
  const statusCount = {};
  leads.forEach((l) => {
    const st = l.status || "New Lead";
    statusCount[st] = (statusCount[st] || 0) + 1;
  });
  const groups = STATUS_GROUPS.map((g) => {
    const items = LEAD_STATUSES.filter((st) => st.group === g.key).map((st) => ({
      value: st.value,
      count: statusCount[st.value] || 0,
    }));
    return { ...g, items, count: items.reduce((a, b) => a + b.count, 0) };
  });

  const R = 46;
  const C = 2 * Math.PI * R;
  const GAP = 2.2; // surface gap between slices
  const visible = groups.filter((g) => g.count > 0);
  let offset = 0;
  const arcs = visible.map((g) => {
    const len = (g.count / total) * C;
    const dash = visible.length > 1 ? Math.max(len - GAP, 0.5) : len;
    const arc = { g, dash, offset };
    offset += len;
    return arc;
  });
  const hovered = hover ? groups.find((g) => g.key === hover) : null;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="pn-chart-wrap" style={styles.chartWrap}>
      <div style={styles.donutBox}>
        <svg viewBox="0 0 120 120" style={styles.donut} role="img" aria-label="Leads by status stage">
          <circle cx="60" cy="60" r={R} fill="none" stroke="#f1ecef" strokeWidth="16" />
          {arcs.map(({ g, dash, offset: off }) => (
            <circle
              key={g.key}
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={g.chart}
              strokeWidth={hover === g.key ? 19 : 16}
              strokeDasharray={`${dash} ${C - dash}`}
              strokeDashoffset={-off}
              transform="rotate(-90 60 60)"
              style={{ cursor: "pointer", transition: "stroke-width .15s", opacity: hover && hover !== g.key ? 0.45 : 1 }}
              onMouseEnter={() => setHover(g.key)}
              onMouseLeave={() => setHover(null)}
            >
              <title>{`${g.label}: ${g.count} (${pct(g.count)}%)`}</title>
            </circle>
          ))}
        </svg>
        <div style={styles.donutCenter}>
          <strong style={styles.donutNum}>{hovered ? hovered.count : total}</strong>
          <span style={styles.donutCap}>{hovered ? `${hovered.label} · ${pct(hovered.count)}%` : "total leads"}</span>
        </div>
      </div>

      <div className="pn-chart-legend" style={styles.legend}>
        {groups.map((g) => (
          <div
            key={g.key}
            style={{ ...styles.legendGroup, opacity: g.count ? 1 : 0.5 }}
            onMouseEnter={() => g.count && setHover(g.key)}
            onMouseLeave={() => setHover(null)}
          >
            <div style={styles.legendHead}>
              <span style={{ ...styles.legendDot, background: g.chart }} />
              <span style={styles.legendLabel}>{g.label}</span>
              <span style={styles.legendCount}>
                {g.count} <span style={styles.legendPct}>· {pct(g.count)}%</span>
              </span>
            </div>
            {g.items
              .filter((it) => it.count > 0)
              .map((it) => (
                <button
                  key={it.value}
                  onClick={() => onPick(it.value)}
                  style={{ ...styles.legendItem, ...(activeStatus === it.value ? styles.legendItemActive : null) }}
                  title={activeStatus === it.value ? "Show all leads" : `Show only "${it.value}"`}
                >
                  <span>{it.value}</span>
                  <span>{it.count}</span>
                </button>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusSelect({ value, onChange, large = false }) {
  const current = value || "New Lead";
  const c = statusColors(current);
  return (
    <select
      value={current}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      aria-label="Lead status"
      style={{
        ...styles.statusSelect,
        ...(large ? styles.statusSelectLarge : null),
        color: c.color,
        backgroundColor: c.bg,
        borderColor: c.color + "55",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(c.color)}' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
      }}
    >
      {LEAD_STATUSES.map((st) => (
        <option key={st.value} value={st.value} style={{ color: "#000", backgroundColor: "#fff" }}>
          {st.value}
        </option>
      ))}
    </select>
  );
}

function getSourceBadgeStyle(source = "") {
  const isHero = source.toLowerCase().includes("hero");
  const isPop = source.toLowerCase().includes("pop");
  return {
    display: "inline-block",
    padding: "4px 9px",
    borderRadius: "6px",
    fontSize: "11.5px",
    fontWeight: "600",
    letterSpacing: "0.02em",
    background: isHero ? "#f3e8ee" : isPop ? "#ede8f5" : "#f1f1f1",
    color: isHero ? "#812e5a" : isPop ? "#4a2d7a" : "#444444",
    border: `1px solid ${isHero ? "rgba(129,46,90,0.2)" : isPop ? "rgba(74,45,122,0.2)" : "#ddd"}`,
  };
}

/* ---- Responsive layout (inline styles above are the desktop design) ---- */
const RESPONSIVE_CSS = `
/* very wide screens: keep the content at a comfortable reading width, centred */
@media (min-width: 2000px) {
  .pn-main > * { max-width: 1800px; margin-left: auto !important; margin-right: auto !important; }
}
@media (max-width: 1365px) {
  .pn-toolbar { flex-wrap: wrap !important; }
  .pn-search { flex: 1 1 100% !important; }
  .pn-filters { flex: 1 1 100% !important; flex-wrap: wrap !important; }
}
@media (max-width: 1200px) {
  .pn-main { padding: 26px 24px 50px !important; }
  .pn-table { min-width: 980px; }
}
@media (max-width: 900px) {
  .pn-layout { flex-direction: column !important; }
  .pn-sidebar {
    width: 100% !important; min-width: 0 !important; height: auto !important;
    flex-direction: row !important; align-items: center !important;
    padding: 10px 16px !important; z-index: 50; top: 0 !important;
    border-right: 0 !important; border-bottom: 1px solid rgba(255,255,255,0.08);
    gap: 10px;
  }
  .pn-brand { padding: 0 !important; margin: 0 !important; border: 0 !important; }
  .pn-brand > div { margin: 0 !important; gap: 10px !important; }
  .pn-mark { width: 40px !important; }
  .pn-word { height: 34px !important; }
  .pn-sidenav { flex-direction: row !important; flex: 1 !important; justify-content: flex-end !important; gap: 6px !important; }
  .pn-nav-leads { display: none !important; }
  .pn-nav-site, .pn-logout { width: auto !important; padding: 10px 12px !important; margin: 0 !important; }
  .pn-sidefooter { flex-direction: row !important; padding: 0 !important; margin: 0 !important; border: 0 !important; gap: 6px; }
  .pn-profile { display: none !important; }
  .pn-main { width: 100% !important; padding: 22px 16px 40px !important; }
  .pn-header { align-items: flex-start !important; margin-bottom: 20px !important; }
  .pn-title { font-size: 24px !important; }
  .pn-search { flex: 1 1 100% !important; }
  .pn-select { width: 100% !important; }
  .pn-filters > label, .pn-filters > div { flex: 1 1 calc(50% - 10px); min-width: 0; }
  .pn-filters .pn-month { flex: 1 1 100% !important; }
  .pn-filters .pn-dd { width: 100% !important; }
  .pn-filters select[aria-label="Month"] { flex: 1 1 auto; width: auto !important; min-width: 0; }
  .pn-filters > button { flex: 1 1 100%; }
  .pn-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 12px !important; }
  .pn-chart-card { grid-column: 1 / -1 !important; grid-row: auto !important; }
  /* table becomes a list of cards */
  .pn-table { min-width: 0; }
  .pn-thead { display: none; }
  .pn-table, .pn-table tbody { display: block; }
  .pn-row {
    display: grid !important; grid-template-columns: 1fr 1fr; gap: 10px 16px;
    padding: 16px; border-bottom: 1px solid #eee7ea;
  }
  .pn-row td { display: block; padding: 0 !important; border: 0 !important; min-width: 0; white-space: normal !important; }
  .pn-row td[data-label]::before {
    content: attr(data-label); display: block; margin-bottom: 3px;
    font-size: 10.5px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #9a8d94;
  }
  .pn-td-sr { display: none !important; }
  .pn-td-name { grid-column: 1 / -1; order: -2; font-size: 16px; }
  .pn-td-date { order: -1; }
  .pn-td-status { grid-column: 1 / -1; order: -1; }
  .pn-td-actions { grid-column: 1 / -1; display: flex !important; justify-content: flex-end; gap: 8px; }
  .pn-table td[colspan] { display: block; }
}
@media (max-width: 600px) {
  .pn-nav-label { display: none; }
  .pn-actions { width: 100%; }
  .pn-actions > * { flex: 1; justify-content: center; }
  .pn-metrics { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; margin-bottom: 18px !important; }
  .pn-chart-wrap { flex-direction: column !important; align-items: stretch !important; }
  .pn-chart-legend { grid-template-columns: 1fr !important; }
  .pn-metric { padding: 14px 12px !important; border-radius: 12px !important; }
  .pn-metric-label { font-size: 9.5px !important; letter-spacing: .04em !important; }
  .pn-metric strong { font-size: 26px !important; }
  .pn-metric-sub { display: none !important; }
  .pn-modal-overlay { padding: 12px !important; align-items: flex-end !important; }
  .pn-modal { padding: 22px 18px !important; max-height: calc(100svh - 24px); overflow-y: auto; border-radius: 16px !important; }
  .pn-modal-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
  .pn-modal-actions { flex-wrap: wrap; }
  .pn-modal-actions > * { flex: 1 1 140px; justify-content: center; }
}
@media (max-width: 340px) {
  .pn-row { grid-template-columns: 1fr; }
  .pn-word { display: none; }
}
`;

const styles = {
  layout: {
    display: "flex",
    width: "100%",
    minHeight: "100vh",
    backgroundColor: "#f7f6f5",
    fontFamily: "var(--f-body, system-ui, -apple-system, sans-serif)",
    color: "#222",
  },

  // SIDEBAR STYLES
  sidebar: {
    width: "260px",
    minWidth: "260px",
    backgroundColor: "#1c0715",
    color: "#ffffff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    borderRight: "1px solid rgba(255, 255, 255, 0.08)",
    padding: "24px 18px",
    boxSizing: "border-box",
    position: "sticky",
    top: 0,
    height: "100vh",
  },
  sideBrand: {
    paddingBottom: "22px",
    borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
    marginBottom: "20px",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "10px",
  },
  sideLogoMark: {
    width: "60px",
    height: "auto",
    display: "block",
  },
  sideWordmark: {
    height: "50px",
    width: "auto",
    display: "block",
  },
  sideNav: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    flex: 1,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    border: "none",
    background: "transparent",
    color: "#cbbec6",
    fontSize: "13.5px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "background 0.15s, color 0.15s",
    textAlign: "left",
  },
  navItemActive: {
    background: "#812e5a",
    color: "#ffffff",
    fontWeight: "600",
    boxShadow: "0 4px 14px rgba(129, 46, 90, 0.35)",
  },
  navItemLink: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    width: "100%",
    padding: "11px 14px",
    borderRadius: "10px",
    color: "#cbbec6",
    fontSize: "13.5px",
    fontWeight: "500",
    textDecoration: "none",
    transition: "background 0.15s, color 0.15s",
    boxSizing: "border-box",
  },
  navIcon: {
    width: "18px",
    height: "18px",
    flexShrink: 0,
  },
  navLabel: {
    flex: 1,
  },
  navCountPill: {
    background: "rgba(255, 255, 255, 0.16)",
    padding: "2px 7px",
    borderRadius: "10px",
    fontSize: "11px",
    fontWeight: "600",
  },
  sideFooter: {
    paddingTop: "18px",
    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  profileBox: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "6px 8px",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#812e5a",
    color: "#ffffff",
    display: "grid",
    placeItems: "center",
    fontSize: "11px",
    fontWeight: "700",
  },
  profileInfo: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  profileName: {
    fontSize: "12.5px",
    color: "#ffffff",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  profileEmail: {
    fontSize: "10.5px",
    color: "#9f8e97",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "9px 12px",
    borderRadius: "8px",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    background: "rgba(255, 255, 255, 0.05)",
    color: "#f0e4ec",
    fontSize: "12.5px",
    fontWeight: "500",
    cursor: "pointer",
  },
  logoutIcon: {
    width: "14px",
    height: "14px",
  },

  // MAIN CONTENT STYLES (FULL WIDTH)
  main: {
    flex: 1,
    minWidth: 0,
    width: "calc(100% - 260px)",
    padding: "30px 36px 60px",
    boxSizing: "border-box",
  },
  mainHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "28px",
  },
  pageTitle: {
    fontFamily: "var(--f-display, Georgia, serif)",
    fontSize: "28px",
    fontWeight: "400",
    color: "#1a1a1a",
    margin: "0 0 4px 0",
    letterSpacing: "-0.01em",
  },
  pageSub: {
    fontSize: "13.5px",
    color: "#6b6267",
    margin: 0,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  iconBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 15px",
    borderRadius: "9px",
    border: "1.5px solid #dfd8dc",
    background: "#ffffff",
    fontSize: "13px",
    fontWeight: "500",
    color: "#444",
    cursor: "pointer",
  },
  actionIcon: {
    width: "15px",
    height: "15px",
  },
  exportBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "9px 18px",
    borderRadius: "9px",
    border: "none",
    background: "#812e5a",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "600",
    letterSpacing: "0.02em",
  },

  // METRICS (FULL WIDTH GRID)
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(220px, 1fr) minmax(0, 2.6fr)",
    gridAutoRows: "auto",
    gap: "18px",
    marginBottom: "24px",
  },
  metricCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    padding: "22px 24px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
    border: "1px solid #e9e4e6",
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  chartCard: {
    gridColumn: "2",
    gridRow: "1 / span 2",
    gap: "14px",
  },
  metricLabel: {
    fontSize: "11.5px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#7d7077",
  },
  metricVal: {
    fontFamily: "var(--f-display, Georgia, serif)",
    fontSize: "34px",
    fontWeight: "400",
    color: "#222",
    lineHeight: "1.1",
  },
  metricSub: {
    fontSize: "12px",
    color: "#8c8287",
  },

  // WARNING BANNER

  // TOOLBAR
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "nowrap",
    gap: "14px",
    marginBottom: "18px",
  },
  toolSearchWrap: {
    flex: "1 1 200px",
    minWidth: "120px",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "16px",
    height: "16px",
    color: "#8e8288",
  },
  toolSearch: {
    width: "100%",
    height: "40px",
    boxSizing: "border-box",
    fontFamily: "inherit",
    padding: "0 36px 0 40px",
    borderRadius: "10px",
    border: "1.5px solid #dfd8dc",
    background: "#ffffff",
    fontSize: "13.5px",
    outline: "none",
  },
  clearBtn: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    border: "none",
    background: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: "13px",
  },
  toolActions: {
    display: "flex",
    alignItems: "flex-end",
    flexWrap: "nowrap",
    gap: "10px",
    flex: "0 0 auto",
  },
  ddButton: {
    width: "100%",
    height: "40px",
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "6px",
    padding: "0 10px 0 12px",
    borderRadius: "9px",
    border: "1.5px solid #dfd8dc",
    background: "#ffffff",
    fontFamily: "inherit",
    fontSize: "13px",
    color: "#222",
    cursor: "pointer",
    textAlign: "left",
  },
  ddButtonText: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  ddList: {
    position: "absolute",
    zIndex: 80,
    minWidth: "100%",
    width: "max-content",
    maxWidth: "calc(100vw - 24px)",
    overflowY: "auto",
    margin: 0,
    padding: "6px",
    listStyle: "none",
    background: "#fff",
    border: "1px solid #e6dee2",
    borderRadius: "12px",
    boxShadow: "0 18px 40px rgba(36, 8, 22, 0.16)",
    boxSizing: "border-box",
  },
  ddItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "8px",
    fontSize: "13px",
    color: "#222",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  ddItemActive: {
    background: "#f6eef2",
  },
  ddItemSelected: {
    fontWeight: "700",
    color: "#812e5a",
  },
  ddDot: {
    width: "9px",
    height: "9px",
    borderRadius: "3px",
    flexShrink: 0,
  },
  ddCount: {
    minWidth: "22px",
    textAlign: "right",
    fontSize: "12px",
    color: "#7d7077",
    fontVariantNumeric: "tabular-nums",
  },
  monthNav: {
    display: "flex",
    alignItems: "center",
    height: "40px",
    border: "1.5px solid #dfd8dc",
    borderRadius: "9px",
    background: "#fff",
    overflow: "hidden",
  },
  monthArrow: {
    width: "32px",
    height: "100%",
    border: 0,
    background: "transparent",
    color: "#812e5a",
    fontSize: "20px",
    lineHeight: 1,
    cursor: "pointer",
    flexShrink: 0,
  },
  monthSelect: {
    height: "100%",
    width: "136px",
    border: 0,
    borderLeft: "1px solid #eee7ea",
    borderRight: "1px solid #eee7ea",
    background: "#fff",
    fontFamily: "inherit",
    fontSize: "13px",
    fontWeight: "600",
    color: "#222",
    textAlign: "center",
    textAlignLast: "center",
    appearance: "none",
    WebkitAppearance: "none",
    cursor: "pointer",
    outline: "none",
    padding: "0 6px",
  },
  filterField: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  filterLabel: {
    fontSize: "10.5px",
    fontWeight: "700",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "#7d7077",
  },
  clearFiltersBtn: {
    height: "40px",
    whiteSpace: "nowrap",
    padding: "0 14px",
    borderRadius: "9px",
    border: "1.5px solid #e3cddb",
    background: "#fbf3f7",
    color: "#812e5a",
    fontSize: "13px",
    fontWeight: "600",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  selectFilter: {
    height: "40px",
    boxSizing: "border-box",
    fontFamily: "inherit",
    padding: "0 12px",
    borderRadius: "9px",
    border: "1.5px solid #dfd8dc",
    background: "#ffffff",
    fontSize: "13px",
    color: "#333",
    outline: "none",
  },

  // TABLE STYLES (EXPANSIVE FULL WIDTH)
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "14px",
    boxShadow: "0 2px 14px rgba(0,0,0,0.03)",
    border: "1px solid #e8e3e5",
    overflow: "hidden",
  },
  tableHeaderBar: {
    padding: "18px 24px",
    borderBottom: "1px solid #eee9ec",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tableTitle: {
    margin: "0 0 3px 0",
    fontFamily: "var(--f-display, Georgia, serif)",
    fontSize: "20px",
    fontWeight: "500",
    color: "#222",
  },
  tableCount: {
    fontSize: "12px",
    color: "#777",
  },
  tableResponsive: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "13px",
  },
  thRow: {
    backgroundColor: "#faf8f9",
    borderBottom: "1px solid #ebe5e8",
  },
  th: {
    padding: "14px 18px",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#7d7077",
    whiteSpace: "nowrap",
  },
  tr: {
    borderBottom: "1px solid #f2eeef",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  tdSr: {
    padding: "16px 18px",
    whiteSpace: "nowrap",
  },
  srBadge: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#812e5a",
  },
  tdDate: {
    padding: "16px 18px",
    whiteSpace: "nowrap",
  },
  dateMain: {
    color: "#555",
    fontSize: "12px",
  },
  td: {
    padding: "16px 18px",
    color: "#333",
    whiteSpace: "nowrap",
  },
  tdName: {
    padding: "16px 18px",
    color: "#1a1a1a",
    fontSize: "13.5px",
    whiteSpace: "nowrap",
  },
  phoneLink: {
    color: "#812e5a",
    textDecoration: "none",
    fontWeight: "600",
  },
  budgetBadge: {
    backgroundColor: "#f4eff2",
    color: "#6b2349",
    padding: "4px 9px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: "600",
  },
  typeTag: {
    backgroundColor: "#f7f7f7",
    padding: "3px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    color: "#555",
  },
  tdAction: {
    padding: "16px 18px",
    textAlign: "right",
    whiteSpace: "nowrap",
  },
  viewBtn: {
    padding: "5px 11px",
    borderRadius: "6px",
    border: "1px solid #812e5a",
    background: "#ffffff",
    color: "#812e5a",
    fontSize: "11.5px",
    fontWeight: "600",
    cursor: "pointer",
    marginRight: "6px",
  },
  delBtn: {
    padding: "5px 9px",
    borderRadius: "6px",
    border: "1px solid #e8c5ce",
    background: "#fff5f7",
    color: "#b00020",
    fontSize: "11px",
    fontWeight: "700",
    cursor: "pointer",
  },
  emptyTd: {
    padding: "60px 20px",
    textAlign: "center",
  },
  tableLoading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    color: "#777",
  },
  miniSpinner: {
    width: "18px",
    height: "18px",
    border: "2px solid rgba(129,46,90,0.2)",
    borderTopColor: "#812e5a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    color: "#555",
  },
  emptyIcon: {
    width: "36px",
    height: "36px",
    color: "#b5aab0",
    marginBottom: "4px",
  },
  emptySub: {
    fontSize: "12.5px",
    color: "#888",
    maxWidth: "420px",
    margin: 0,
  },

  // DATABASE CONFIGURATION TAB

  // MODAL
  modalOverlay: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    backdropFilter: "blur(3px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "20px",
  },
  modalCard: {
    width: "100%",
    maxWidth: "640px",
    maxHeight: "calc(100vh - 40px)",
    overflowY: "auto",
    backgroundColor: "#ffffff",
    borderRadius: "18px",
    padding: "32px",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  },
  modalHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "24px",
    paddingBottom: "18px",
    borderBottom: "1px solid #ede8ea",
  },
  modalTitle: {
    fontFamily: "var(--f-display, Georgia, serif)",
    fontSize: "26px",
    fontWeight: "400",
    margin: "8px 0 4px 0",
    color: "#1a1a1a",
  },
  modalDate: {
    fontSize: "12px",
    color: "#888",
  },
  modalCloseBtn: {
    background: "none",
    border: "none",
    fontSize: "18px",
    color: "#888",
    cursor: "pointer",
    padding: "4px",
  },
  modalGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "18px",
    marginBottom: "28px",
  },
  modalItem: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  modalLabel: {
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#812e5a",
  },
  modalVal: {
    fontSize: "14px",
    color: "#222",
  },
  modalValHighlight: {
    fontSize: "15px",
    color: "#812e5a",
  },
  modalValLink: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#812e5a",
    textDecoration: "none",
  },
  btnIcon: {
    width: "16px",
    height: "16px",
    flexShrink: 0,
    display: "block",
  },
  statusSelect: {
    appearance: "none",
    WebkitAppearance: "none",
    border: "1px solid",
    borderRadius: "999px",
    padding: "6px 30px 6px 12px",
    fontSize: "12.5px",
    fontWeight: "600",
    fontFamily: "inherit",
    cursor: "pointer",
    maxWidth: "210px",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 10px center",
    backgroundSize: "12px",
    outline: "none",
  },
  statusSelectLarge: {
    fontSize: "14px",
    padding: "9px 34px 9px 14px",
    maxWidth: "100%",
  },
  chartWrap: {
    display: "flex",
    alignItems: "center",
    gap: "26px",
  },
  donutBox: {
    position: "relative",
    width: "150px",
    height: "150px",
    flexShrink: 0,
    alignSelf: "center",
  },
  donut: {
    width: "100%",
    height: "100%",
    display: "block",
  },
  donutCenter: {
    position: "absolute",
    inset: "28px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    pointerEvents: "none",
  },
  donutNum: {
    fontFamily: "var(--f-display, Georgia, serif)",
    fontSize: "30px",
    fontWeight: "500",
    color: "#0b0b0b",
    lineHeight: 1,
  },
  donutCap: {
    marginTop: "4px",
    fontSize: "10.5px",
    lineHeight: 1.25,
    color: "#52514e",
  },
  legend: {
    flex: 1,
    minWidth: 0,
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "8px 22px",
    alignContent: "start",
  },
  legendGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  legendHead: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "13px",
  },
  legendDot: {
    width: "10px",
    height: "10px",
    borderRadius: "3px",
    flexShrink: 0,
  },
  legendLabel: {
    flex: 1,
    fontWeight: "600",
    color: "#0b0b0b",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  legendCount: {
    fontWeight: "600",
    color: "#0b0b0b",
    whiteSpace: "nowrap",
  },
  legendPct: {
    fontWeight: "400",
    color: "#898781",
  },
  legendItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
    marginLeft: "18px",
    padding: "2px 6px",
    border: 0,
    borderRadius: "6px",
    background: "transparent",
    fontFamily: "inherit",
    fontSize: "12px",
    color: "#52514e",
    textAlign: "left",
    cursor: "pointer",
  },
  legendItemActive: {
    background: "#f3e9ef",
    color: "#0b0b0b",
    fontWeight: "600",
  },
  statusStamp: {
    display: "block",
    marginTop: "5px",
    fontSize: "11px",
    color: "#8a7c84",
    whiteSpace: "nowrap",
  },
  historyBox: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "4px 0 16px",
  },
  historyList: {
    listStyle: "none",
    margin: 0,
    padding: "0 0 0 8px",
    display: "flex",
    flexDirection: "column",
    gap: "0",
  },
  historyItem: {
    display: "flex",
    gap: "12px",
    padding: "8px 0",
    borderLeft: "2px solid #eee5ea",
    marginLeft: "5px",
    paddingLeft: "14px",
    position: "relative",
  },
  historyDot: {
    position: "absolute",
    left: "-7px",
    top: "13px",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    border: "2px solid #fff",
    boxSizing: "border-box",
  },
  historyBody: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  historyChange: {
    fontSize: "13.5px",
    color: "#222",
  },
  historyFrom: {
    color: "#6f6268",
  },
  historyMeta: {
    fontSize: "12px",
    color: "#8a7c84",
  },
  notesCount: {
    display: "block",
    marginTop: "3px",
    fontSize: "11.5px",
    fontWeight: "500",
    color: "#8a7c84",
  },
  modalStatusRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px 14px",
    paddingBottom: "6px",
  },
  tabBar: {
    display: "flex",
    gap: "4px",
    marginBottom: "20px",
    borderBottom: "1px solid #ede8ea",
    overflowX: "auto",
  },
  tabBtn: {
    border: 0,
    background: "transparent",
    padding: "10px 14px",
    marginBottom: "-1px",
    borderBottom: "2px solid transparent",
    fontFamily: "inherit",
    fontSize: "13.5px",
    fontWeight: "600",
    color: "#7d7077",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  tabBtnActive: {
    color: "#812e5a",
    borderBottom: "2px solid #812e5a",
  },
  tabPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "20px",
  },
  noteEdited: {
    fontWeight: "400",
    color: "#8a7c84",
  },
  noteEditBtn: {
    border: "1px solid #e3cddb",
    background: "#fff",
    color: "#812e5a",
    borderRadius: "7px",
    padding: "3px 10px",
    fontSize: "12px",
    fontWeight: "600",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  noteCancelBtn: {
    border: "1px solid #e2d9de",
    background: "#fff",
    color: "#52514e",
    borderRadius: "9px",
    padding: "9px 16px",
    fontSize: "13.5px",
    fontWeight: "600",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  statusUpdated: {
    fontSize: "12px",
    color: "#8a7c84",
  },
  notesBox: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "16px 0 4px",
    borderTop: "1px solid #ede8ea",
  },
  noteInput: {
    width: "100%",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: "76px",
    padding: "12px 14px",
    border: "1px solid #e2d9de",
    borderRadius: "10px",
    fontFamily: "inherit",
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#111",
    outline: "none",
    background: "#fff",
  },
  noteBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "10px",
  },
  noteHint: {
    fontSize: "12px",
    color: "#8a7c84",
  },
  noteAddBtn: {
    border: 0,
    borderRadius: "9px",
    padding: "9px 18px",
    background: "#812e5a",
    color: "#fff",
    fontWeight: "600",
    fontSize: "13.5px",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  noteList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginTop: "4px",
    paddingRight: "2px",
  },
  noteEmpty: {
    fontSize: "13px",
    color: "#9a8d94",
  },
  noteItem: {
    background: "#faf6f8",
    border: "1px solid #efe6eb",
    borderRadius: "10px",
    padding: "10px 12px",
  },
  noteTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "4px",
  },
  noteDate: {
    fontSize: "11.5px",
    fontWeight: "600",
    color: "#812e5a",
  },
  noteText: {
    margin: 0,
    fontSize: "14px",
    lineHeight: 1.5,
    color: "#222",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  modalActions: {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
    paddingTop: "18px",
    borderTop: "1px solid #ede8ea",
  },
  modalCallBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    height: "42px",
    boxSizing: "border-box",
    lineHeight: 1,
    padding: "10px 18px",
    backgroundColor: "#812e5a",
    color: "#ffffff",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "600",
  },
  modalWaBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    height: "42px",
    boxSizing: "border-box",
    lineHeight: 1,
    padding: "10px 18px",
    backgroundColor: "#25D366",
    color: "#ffffff",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "600",
  },
  modalDelBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    height: "42px",
    boxSizing: "border-box",
    lineHeight: 1,
    padding: "10px 16px",
    backgroundColor: "#fff0f3",
    color: "#b00020",
    border: "1px solid #f8c8d2",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
  },
};
