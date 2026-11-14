"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Must match IDLE_MINUTES in lib/auth.js
const IDLE_MS = 10 * 60 * 1000;
const PING_EVERY_MS = 60 * 1000; // extend the server session at most once a minute while active
const ACTIVITY_KEY = "nivie_admin_last_active"; // shared by all open panel tabs

export default function AdminPanelPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
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
  const loadLeads = useCallback(async (silent = false) => {
    silent = silent === true;
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

  const handleDelete = async (id, e) => {
    e?.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this lead?")) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/leads?id=${id}`, { method: "DELETE" });
      if (res.status === 401) return handleLogout("expired");
      const data = await res.json();
      if (data.success) {
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

  // Filtered leads
  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      const matchSource = sourceFilter === "all" || l.source === sourceFilter;
      if (!matchSource) return false;
      if (!q) return true;
      return (
        l.name?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q) ||
        l.location?.toLowerCase().includes(q) ||
        l.type?.toLowerCase().includes(q) ||
        l.budget?.toLowerCase().includes(q) ||
        l.source?.toLowerCase().includes(q)
      );
    });
  }, [leads, search, sourceFilter]);

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
  const todayCount = useMemo(() => {
    const todayStr = new Date().toDateString();
    return leads.filter(
      (l) => l.created_at && new Date(l.created_at).toDateString() === todayStr
    ).length;
  }, [leads]);

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
                <span className="pn-metric-label" style={styles.metricLabel}>Total Received Leads</span>
                <strong style={styles.metricVal}>{leads.length}</strong>
                <span className="pn-metric-sub" style={styles.metricSub}>Recorded in MySQL leads table</span>
              </div>

              <div className="pn-metric" style={styles.metricCard}>
                <span className="pn-metric-label" style={styles.metricLabel}>Today&apos;s Enquiries</span>
                <strong style={{ ...styles.metricVal, color: "#812e5a" }}>{todayCount}</strong>
                <span className="pn-metric-sub" style={styles.metricSub}>Received today</span>
              </div>

              <div className="pn-metric" style={styles.metricCard}>
                <span className="pn-metric-label" style={styles.metricLabel}>Active Lead Sources</span>
                <strong style={styles.metricVal}>{sources.length || 1}</strong>
                <span className="pn-metric-sub" style={styles.metricSub}>Hero form, popup &amp; website</span>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="pn-toolbar" style={styles.toolbar}>
              <div className="pn-search" style={styles.toolSearchWrap}>
                <svg style={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by client name, mobile, location, property type, budget..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.toolSearch}
                />
                {search && (
                  <button onClick={() => setSearch("")} style={styles.clearBtn}>
                    ✕
                  </button>
                )}
              </div>

              <div style={styles.toolActions}>
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="pn-select" style={styles.selectFilter}
                >
                  <option value="all">All Sources ({leads.length})</option>
                  {sources.map((s) => (
                    <option key={s} value={s}>
                      Source: {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Full Width Leads Table Card */}
            <div className="pn-tablecard" style={styles.tableCard}>
              <div style={styles.tableHeaderBar}>
                <div>
                  <h2 style={styles.tableTitle}>Client Enquiries</h2>
                  <span style={styles.tableCount}>
                    Showing {filteredLeads.length} of {leads.length} recorded leads
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
                        <td colSpan="10" style={styles.emptyTd}>
                          <div style={styles.tableLoading}>
                            <div style={styles.miniSpinner} />
                            <span>Loading leads from MySQL...</span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {!loading && filteredLeads.length === 0 && (
                      <tr>
                        <td colSpan="10" style={styles.emptyTd}>
                          <div style={styles.emptyState}>
                            <svg style={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                              <line x1="8" y1="21" x2="16" y2="21" />
                              <line x1="12" y1="17" x2="12" y2="21" />
                            </svg>
                            <strong>No enquiries found</strong>
                            <p style={styles.emptySub}>
                              {search
                                ? `No enquiries matched "${search}".`
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
@media (max-width: 1200px) {
  .pn-main { padding: 26px 24px 50px !important; }
  .pn-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
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
  .pn-select { width: 100%; }
  .pn-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 12px !important; }
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
  .pn-td-actions { grid-column: 1 / -1; display: flex !important; justify-content: flex-end; gap: 8px; }
  .pn-table td[colspan] { display: block; }
}
@media (max-width: 600px) {
  .pn-nav-label { display: none; }
  .pn-actions { width: 100%; }
  .pn-actions > * { flex: 1; justify-content: center; }
  .pn-metrics { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 10px !important; margin-bottom: 18px !important; }
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
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
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
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
    marginBottom: "18px",
  },
  toolSearchWrap: {
    position: "relative",
    flex: "1 1 400px",
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
    boxSizing: "border-box",
    padding: "11px 36px 11px 40px",
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
    alignItems: "center",
    gap: "10px",
  },
  selectFilter: {
    padding: "10px 14px",
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
    maxWidth: "560px",
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
