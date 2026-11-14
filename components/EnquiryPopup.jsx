"use client";

/*
  Pop-up enquiry form.
  - Opens 20 seconds after the page loads (also after every refresh),
    and again 20 seconds after it is closed.
  - Never opens while the visitor is typing in the banner form, or while
    another panel (menu, policies) is open.
  - Stops once the visitor has submitted an enquiry — from the pop-up OR the
    hero form — for the rest of that visit (refreshing doesn't bring it back).
    Only a page REFRESH keeps the pop-up hidden. Opening the website again in
    any other way (typing the address, a link, a reopened/restored tab) counts
    as a new visit, so the pop-up works again.
  - After submitting inside the pop-up, "Thank you" shows for 3 seconds,
    then the pop-up closes by itself.
*/
import { useCallback, useEffect, useRef, useState } from "react";
import EnquiryForm from "./EnquiryForm";
import Icon from "./Icon";

const DELAY = 20000;
const DONE_KEY = "nivie-enquiry-sent";

export default function EnquiryPopup() {
  const [open, setOpen] = useState(false);
  const timer = useRef(0);
  const closeRef = useRef(null);
  const lastFocus = useRef(null);

  const isDone = () => {
    try {
      return sessionStorage.getItem(DONE_KEY) === "1";
    } catch {
      return false;
    }
  };

  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    if (isDone()) return;
    timer.current = setTimeout(function tryOpen() {
      const busy =
        document.activeElement?.closest?.(".hero-form") ||
        document.querySelector(".menu.is-open, .drawer.is-open");
      if (busy) {
        timer.current = setTimeout(tryOpen, 5000); // try again shortly
        return;
      }
      lastFocus.current = document.activeElement;
      setOpen(true);
    }, DELAY);
  }, []);

  useEffect(() => {
    // Remove the old long-lived marker from earlier versions of the site.
    try {
      localStorage.removeItem(DONE_KEY);
    } catch {}
    document.cookie = "nivie_enquiry_sent=; max-age=0; path=/";
    document.cookie = "nivie_enquired_visit=; max-age=0; path=/";

    // New visit (not a refresh) → forget the previous enquiry marker.
    // Chrome can restore a closed tab's sessionStorage, so this check is needed.
    try {
      const nav = performance.getEntriesByType("navigation")[0];
      if (nav?.type !== "reload") sessionStorage.removeItem(DONE_KEY);
    } catch {}
    schedule();
    return () => clearTimeout(timer.current);
  }, [schedule]);

  useEffect(() => {
    if (open) {
      window.__lenis?.stop();
      setTimeout(() => closeRef.current?.focus(), 50);
    } else {
      window.__lenis?.start();
    }
  }, [open]);

  const close = () => {
    setOpen(false);
    lastFocus.current?.focus?.();
    schedule();
  };

  const onSent = useCallback(() => {
    try {
      sessionStorage.setItem(DONE_KEY, "1");
    } catch {}
    clearTimeout(timer.current);
  }, []);

  // 3 seconds after "Thank you" → close the pop-up for good (no re-scheduling).
  const onFinished = useCallback(() => {
    clearTimeout(timer.current);
    setOpen(false);
    lastFocus.current?.focus?.();
  }, []);

  // the banner form also counts: once someone submits there, stop the pop-up
  useEffect(() => {
    window.addEventListener("nivie:enquiry-sent", onSent);
    return () => window.removeEventListener("nivie:enquiry-sent", onSent);
  }, [onSent]);

  return (
    <div
      className={`ep ${open ? "is-open" : ""}`}
      aria-hidden={!open}
      inert={!open ? true : undefined}
      onKeyDown={(e) => e.key === "Escape" && close()}
    >
      <div className="ep-scrim" onClick={close} />
      <div className="ep-box" role="dialog" aria-modal="true" aria-labelledby="ep-title" data-lenis-prevent>
        <div className="ep-media" aria-hidden="true">
          <img src="/images/voice-1.jpg" alt="" />
          <img className="ep-logo" src="/images/logo-mark-sm.png" alt="" />
        </div>
        <div className="ep-body">
          <button ref={closeRef} type="button" className="ep-close" onClick={close} aria-label="Close">
            <Icon name="close" />
          </button>
          <h2 id="ep-title" className="display">
            Book Your <em>Free</em> Consultation
          </h2>
          <EnquiryForm idPrefix="pop" title="" onSent={onSent} onFinished={onFinished} />
        </div>
      </div>
    </div>
  );
}
