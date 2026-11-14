"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { cookies, privacy, terms } from "@/lib/legal";

const docs = { terms, privacy, cookies };

function Block({ b }) {
  if (typeof b === "string") return <p>{b}</p>;
  return (
    <ul className={b.plain ? "plain" : undefined}>
      {b.list.map((li) => (
        <li key={li}>{li}</li>
      ))}
    </ul>
  );
}

export default function LegalDrawer() {
  const [open, setOpen] = useState(false);
  const [doc, setDoc] = useState("terms");
  const closeRef = useRef(null);
  const bodyRef = useRef(null);
  const lastFocus = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    window.__lenis?.start();
    lastFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    const onOpen = (e) => {
      lastFocus.current = document.activeElement;
      setDoc(docs[e.detail] ? e.detail : "terms");
      setOpen(true);
      window.__lenis?.stop();
      setTimeout(() => closeRef.current?.focus(), 60);
    };
    window.addEventListener("nivie:legal", onOpen);
    return () => window.removeEventListener("nivie:legal", onOpen);
  }, []);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [doc]);

  const d = docs[doc];

  return (
    <>
      <div className={`drawer-scrim ${open ? "is-open" : ""}`} onClick={close} aria-hidden="true" />
      <div
        className={`drawer ${open ? "is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-hidden={!open}
        inert={!open ? true : undefined}
        onKeyDown={(e) => e.key === "Escape" && close()}
        data-lenis-prevent
      >
        <div className="drawer-head">
          <h2 id="drawer-title">{d.title}</h2>
          <button ref={closeRef} type="button" className="drawer-close" onClick={close} aria-label="Close">
            <Icon name="close" className="i16" />
          </button>
        </div>
        <div className="drawer-tabs" role="tablist" aria-label="Legal documents">
          <button type="button" role="tab" aria-selected={doc === "terms"} onClick={() => setDoc("terms")}>
            Terms &amp; Conditions
          </button>
          <button type="button" role="tab" aria-selected={doc === "privacy"} onClick={() => setDoc("privacy")}>
            Privacy Policy
          </button>
          <button type="button" role="tab" aria-selected={doc === "cookies"} onClick={() => setDoc("cookies")}>
            Cookie Policy
          </button>
        </div>
        <div className="drawer-body" ref={bodyRef}>
          <p className="intro">{d.intro}</p>
          {d.sections.map((s) => (
            <section key={s.h}>
              <h3>{s.h}</h3>
              {s.body.map((b, i) => (
                <Block b={b} key={i} />
              ))}
            </section>
          ))}
          {d.updated && <p className="updated"><strong>{d.updated}</strong></p>}
        </div>
      </div>
    </>
  );
}
