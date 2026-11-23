"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import Link from "next/link";

const KEY = "nivie-cookie-choice";

export default function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let stored = null;
    try {
      stored = localStorage.getItem(KEY);
    } catch {}
    if (stored) return;
    // Appear once the visitor has started exploring (or after 15s).
    const show = () => {
      setOpen(true);
      window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => window.scrollY > window.innerHeight * 1.2 && show();
    window.addEventListener("scroll", onScroll, { passive: true });
    const t = setTimeout(show, 15000);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const choose = (value) => {
    try {
      localStorage.setItem(KEY, value);
    } catch {}
    // Hook analytics / marketing tags here when value === "all".
    window.dispatchEvent(new CustomEvent("nivie:cookies", { detail: value }));
    setOpen(false);
  };

  return (
    <div className={`cookie ${open ? "is-open" : ""}`} role="region" aria-label="Cookie consent" aria-hidden={!open} inert={!open ? true : undefined}>
      <div className="cookie-top">
        <Icon name="cookie" />
        <p>
          At Nivie Designs, we use cookies and similar technologies to improve
          your browsing experience, understand how visitors interact with our
          website, and enhance our online services.{" "}
          <Link href="/cookie-policy">Cookie Policy</Link>
        </p>
      </div>
      <div className="cookie-actions">
        <button type="button" onClick={() => choose("essential")}>Essential Cookies</button>
        <button type="button" className="yes" onClick={() => choose("all")}>Accept</button>
      </div>
    </div>
  );
}
