"use client";

/*
  Enquiry form — used in the hero and in the pop-up.
  - Submissions are POSTed to /api/leads and saved in MySQL (table `leads`).
  - If that fails (e.g. MySQL not running) the visitor's email app opens with the
    enquiry filled in, so the lead is never lost.
  - NEXT_PUBLIC_FORM_ENDPOINT can override /api/leads with another URL.
  Edit the dropdown options in lib/content.js (formOptions).
*/
import { useEffect, useState } from "react";
import { formOptions, site } from "@/lib/content";

const ENDPOINT = process.env.NEXT_PUBLIC_FORM_ENDPOINT || "";
const empty = { name: "", phone: "", budget: "", location: "", type: "", timeline: "" };

export default function EnquiryForm({
  idPrefix = "f",
  title = "Start your project",
  source,
  onSent,
  onFinished,
}) {
  const [f, setF] = useState(empty);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | sending | sent | mailto | error

  const computedSource =
    source ||
    (idPrefix === "hero"
      ? "Hero Section"
      : idPrefix === "pop"
      ? "Popup Modal"
      : idPrefix === "contact"
      ? "Contact Section"
      : "Website");

  // After a successful enquiry, show "Thank you" for 3 seconds,
  // then go back to the empty form (the pop-up closes itself at this point).
  useEffect(() => {
    if (status !== "sent" && status !== "mailto") return;
    const t = setTimeout(() => {
      setF(empty);
      setErrors({});
      setStatus("idle");
      onFinished?.();
    }, 3000);
    return () => clearTimeout(t);
  }, [status, onFinished]);

  const set = (k) => (e) => {
    let v = e.target.value;
    if (k === "phone") v = v.replace(/\D/g, "").slice(0, 10);
    setF({ ...f, [k]: v });
    if (errors[k]) setErrors({ ...errors, [k]: "" });
  };

  const validate = () => {
    const e = {};
    if (f.name.trim().length < 2) e.name = "Please enter your full name.";
    if (!/^[6-9]\d{9}$/.test(f.phone)) e.phone = "Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.";
    if (!f.budget) e.budget = "Please select a budget.";
    if (!f.location) e.location = "Please select a location.";
    if (!f.type) e.type = "Please select a property type.";
    if (!f.timeline) e.timeline = "Please select a timeline.";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      document.getElementById(`${idPrefix}-${Object.keys(e)[0]}`)?.focus();
      return;
    }
    const payload = {
      name: f.name.trim(),
      mobile: "+91 " + f.phone,
      interiorBudget: f.budget,
      propertyLocation: f.location,
      propertyType: f.type,
      projectTimeline: f.timeline,
      source: computedSource,
    };

    setStatus("sending");
    try {
      const endpoint = ENDPOINT || "/api/leads";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || (data && data.success === false)) {
        throw new Error(data?.error || String(res.status));
      }

      setStatus("sent");
      done();
    } catch (err) {
      console.warn("API lead submission error, falling back to email:", err);
      if (!ENDPOINT) {
        const body =
          `Full Name: ${payload.name}\nMobile Number: ${payload.mobile}\nInterior Budget: ${payload.interiorBudget}\n` +
          `Property Location: ${payload.propertyLocation}\nProperty Type: ${payload.propertyType}\nProject Timeline: ${payload.projectTimeline}\nSource: ${payload.source}`;
        window.location.href = `mailto:${site.email}?subject=${encodeURIComponent("Free consultation — " + payload.name)}&body=${encodeURIComponent(body)}`;
        setStatus("mailto");
        done();
      } else {
        setStatus("error");
      }
    }
  };

  const done = () => {
    onSent?.();
    window.dispatchEvent(new Event("nivie:enquiry-sent"));
    // Meta Pixel: count this as a Lead (for ads tracking)
    try {
      window.fbq?.("track", "Lead", { content_name: computedSource });
    } catch {}
    // Google Tag Manager / GA4: "generate_lead" event
    try {
      (window.dataLayer = window.dataLayer || []).push({ event: "generate_lead", form_name: computedSource });
    } catch {}
  };

  const err = (k) => (
    <span className="ef-err" id={`${idPrefix}-${k}-err`} aria-live="polite">{errors[k] || ""}</span>
  );

  const select = (k, label, placeholder, options) => (
    <div className={`ef-field ${errors[k] ? "has-err" : ""}`}>
      <label htmlFor={`${idPrefix}-${k}`}>{label} <span className="req" aria-hidden="true">*</span></label>
      <div className="ef-select">
        <select id={`${idPrefix}-${k}`} value={f[k]} onChange={set(k)} required aria-invalid={!!errors[k]} aria-describedby={`${idPrefix}-${k}-err`} className={f[k] ? "" : "is-empty"}>
          <option value="" disabled>{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </div>
      {err(k)}
    </div>
  );

  if (status === "sent" || status === "mailto") {
    return (
      <div className="form-card ef-card">
        <div className="sent" role="status">
          <svg viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="40" cy="40" r="36" />
            <path d="M26 41l9 9 19-20" />
          </svg>
          <h4>{status === "sent" ? "Thank you!" : "Almost there"}</h4>
          <p>
            {status === "sent"
              ? "Our design team will connect with you to understand your vision and project requirements."
              : "Your email app should open with your details filled in — just press send."}
          </p>
          <button type="button" className="btn-text" onClick={() => { setF(empty); setStatus("idle"); }}>
            Send another enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-card ef-card">
      <form onSubmit={submit} noValidate>
        {title && <h3 className="ef-title">{title}</h3>}
        <div className="ef-grid">
          <div className={`ef-field ${errors.name ? "has-err" : ""}`}>
            <label htmlFor={`${idPrefix}-name`}>Full Name <span className="req" aria-hidden="true">*</span></label>
            <input
              id={`${idPrefix}-name`}
              className="ef-line"
              type="text"
              placeholder="Your name"
              autoComplete="name"
              value={f.name}
              onChange={set("name")}
              required
              aria-invalid={!!errors.name}
              aria-describedby={`${idPrefix}-name-err`}
            />
            {err("name")}
          </div>
          <div className={`ef-field ${errors.phone ? "has-err" : ""}`}>
            <label htmlFor={`${idPrefix}-phone`}>Mobile Number <span className="req" aria-hidden="true">*</span></label>
            <div className="ef-phone">
              <span className="cc">+91</span>
              <input
                id={`${idPrefix}-phone`}
                className="ef-line"
                type="tel"
                inputMode="numeric"
                placeholder="10-digit mobile number"
                autoComplete="tel-national"
                value={f.phone}
                onChange={set("phone")}
                required
                aria-invalid={!!errors.phone}
                aria-describedby={`${idPrefix}-phone-err`}
              />
            </div>
            {err("phone")}
          </div>
          {select("budget", "Interior Budget", "Select budget", formOptions.budget)}
          {select("location", "Property Location", "Select location", formOptions.location)}
          {select("type", "Property Type", "Select type", formOptions.type)}
          {select("timeline", "Project Timeline", "Select timeline", formOptions.timeline)}
        </div>

        {status === "error" && (
          <p className="ef-status" role="alert">
            Something went wrong. Please call +91 {site.phone} or email {site.email}.
          </p>
        )}

        <button type="submit" className="ef-submit" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Book Your Free Consultation"}
        </button>
        <p className="ef-note">
          Our design team will connect with you to understand your vision and project requirements.
        </p>
      </form>
    </div>
  );
}
