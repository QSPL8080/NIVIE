"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { nav, site } from "@/lib/content";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0); // section currently in view (-1 = none)
  const [hover, setHover] = useState(-1); // link under the pointer
  const pill = useRef(null);
  const links = useRef([]);
  const glow = useRef(null);

  /* ---- mobile menu ---- */
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("nivie:closemenu", close);
    return () => window.removeEventListener("nivie:closemenu", close);
  }, []);

  useEffect(() => {
    if (open) window.__lenis?.stop();
    else window.__lenis?.start();
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  /* ---- which section is in view ---- */
  useEffect(() => {
    const sections = nav.map((n) => document.querySelector(n.href));
    let tick = 0;
    const check = () => {
      tick = 0;
      const mid = window.innerHeight * 0.45;
      let idx = -1;
      sections.forEach((s, i) => {
        if (!s) return;
        const r = s.getBoundingClientRect();
        if (r.top <= mid && r.bottom >= mid) idx = i;
      });
      setActive(idx);
    };
    const onScroll = () => {
      if (!tick) tick = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(tick);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* ---- sliding gold highlight ---- */
  const target = hover >= 0 ? hover : active;
  const place = useCallback(() => {
    const g = glow.current;
    const el = links.current[target];
    if (!g) return;
    if (!el) {
      g.style.opacity = "0";
      g.style.transform = `translateX(${g.dataset.x || 0}px) scale(0.6)`;
      return;
    }
    const x = el.offsetLeft;
    g.dataset.x = x;
    g.style.width = `${el.offsetWidth}px`;
    g.style.opacity = "1";
    g.style.transform = `translateX(${x}px) scale(1)`;
  }, [target]);

  useLayoutEffect(() => {
    place();
  }, [place]);

  useEffect(() => {
    const onR = () => place();
    window.addEventListener("resize", onR);
    document.fonts?.ready?.then(onR);
    return () => window.removeEventListener("resize", onR);
  }, [place]);

  return (
    <>
      <header className="nav" data-nav>
        <div className="nav-bar">
          <a href="#top" className="nav-logo" aria-label="Nivie Designs — Home">
            <img className="mark" src="/images/logo-mark-sm.png" alt="" width="240" height="213" />
            <img className="word" src="/images/wordmark-ivory.png" alt="" width="700" height="369" />
          </a>

          <nav aria-label="Primary" className="nav-center">
            <ul className="nav-pill" ref={pill} onMouseLeave={() => setHover(-1)}>
              <li className="nav-glow" ref={glow} aria-hidden="true" role="presentation" />
              {nav.map((n, i) => (
                <li key={n.href}>
                  <a
                    href={n.href}
                    ref={(el) => (links.current[i] = el)}
                    className={target === i ? "is-on" : ""}
                    aria-current={active === i ? "true" : undefined}
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(-1)}
                  >
                    <span className="t">
                      <span>{n.label}</span>
                      <span aria-hidden="true">{n.label}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav-right">
            <a href={`tel:+91${site.phone}`} className="nav-phone" aria-label={`Call ${site.phoneDisplay}`}>
              <Icon name="phone" />
              <span>+91 {site.phoneDisplay}</span>
            </a>
            <a href="#enquire" className="nav-enquire">
              Enquire now
            </a>
            <button
              type="button"
              className="menu-btn"
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-menu"
              onClick={() => setOpen(true)}
            >
              <span className="bars"><i /><i /></span>
            </button>
          </div>
        </div>
      </header>

      <div
        id="mobile-menu"
        className={`menu ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
        <button type="button" className="menu-close" aria-label="Close menu" onClick={() => setOpen(false)}>
          <Icon name="close" className="i16" />
        </button>
        <ol>
          {nav.map((n) => (
            <li key={n.href}>
              <a href={n.href} onClick={() => setOpen(false)}>{n.label}</a>
            </li>
          ))}
        </ol>
        <div className="menu-foot">
          <a href={`tel:+91${site.phone}`}>{site.phoneDisplay}</a>
          <a href={`mailto:${site.email}`}>{site.email}</a>
          <span>{site.addressShort}</span>
        </div>
      </div>
    </>
  );
}
