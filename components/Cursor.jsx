"use client";

/*
  Soft custom cursor
  - Own requestAnimationFrame loop with frame-rate–independent easing,
    so it glides the same on 60 Hz, 120 Hz and 144 Hz screens.
  - Ring trails softly; dot follows almost instantly.
  - Ring gently stretches in the direction of movement.
  - Size changes use transform (GPU) — no layout jitter.
  - Re-checks what is under the pointer while the page scrolls,
    so hover states never get "stuck".
  - Switches colour on light sections so it is always visible.
  - Native cursor is only hidden after the first mouse move, and comes back
    automatically for touch / pen input or when the mouse leaves the window.
*/

import { useEffect, useRef } from "react";

const LIGHT = ".studio, .stories, .services, .why, .voices, .cta, .contact, .insta, .drawer, .cookie, .loader, .footer, .hero-form, .ep-box";
const LINK = "a, button, label, select, summary, [role=button], [role=tab], input[type=checkbox], input[type=radio]";
const TEXT = "input:not([type=checkbox]):not([type=radio]):not([type=submit]), textarea, [contenteditable=true]";

export default function Cursor() {
  const root = useRef(null);
  const ring = useRef(null);
  const dot = useRef(null);
  const label = useRef(null);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduce.matches) return;

    const html = document.documentElement;
    const r = root.current;
    html.classList.add("has-cursor");

    const mouse = { x: -200, y: -200 };
    const ringPos = { x: -200, y: -200 };
    const dotPos = { x: -200, y: -200 };
    let last = performance.now();
    let raf = 0;
    let visible = false;
    let state = "";
    let light = null;
    let text = "";

    const set = (cls, on) => r.classList.toggle(cls, on);

    // Work out the cursor state from whatever is under the pointer.
    const evaluate = (el) => {
      if (!el || el === document.documentElement) return;
      const lab = el.closest("[data-cursor]");
      const txt = !lab && el.closest(TEXT);
      const link = !lab && !txt && el.closest(LINK);
      const next = lab ? "label" : txt ? "text" : link ? "link" : "";
      if (next !== state) {
        set("is-label", next === "label");
        set("is-text", next === "text");
        set("is-link", next === "link");
        state = next;
      }
      if (lab) {
        const t = lab.getAttribute("data-cursor") || "";
        if (t !== text) {
          label.current.textContent = t;
          text = t;
        }
      }
      const isLight = !!el.closest(LIGHT);
      if (isLight !== light) {
        set("on-light", isLight);
        light = isLight;
      }
    };

    const show = () => {
      if (visible) return;
      visible = true;
      html.classList.add("cursor-on");
      set("is-hidden", false);
    };
    const hide = () => {
      visible = false;
      html.classList.remove("cursor-on");
      set("is-hidden", true);
    };

    const onMove = (e) => {
      if (e.pointerType && e.pointerType !== "mouse") {
        hide();
        return;
      }
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (!visible) {
        // first move: jump into place instead of flying in from a corner
        ringPos.x = dotPos.x = mouse.x;
        ringPos.y = dotPos.y = mouse.y;
        show();
      }
      evaluate(e.target);
    };

    // while scrolling, what's under the pointer changes without a mouse move
    let scrollTick = 0;
    const onScroll = () => {
      if (!visible || scrollTick) return;
      scrollTick = requestAnimationFrame(() => {
        scrollTick = 0;
        evaluate(document.elementFromPoint(mouse.x, mouse.y));
      });
    };

    const onDown = () => set("is-down", true);
    const onUp = () => set("is-down", false);
    const onLeave = (e) => {
      if (!e.relatedTarget) hide();
    };
    const onBlur = () => hide();

    // frame-rate independent smoothing
    const ease = (base, dt) => 1 - Math.pow(1 - base, dt / 16.667);

    const loop = (now) => {
      const dt = Math.min(now - last, 64);
      last = now;

      const kr = ease(0.13, dt); // ring: soft trail
      const kd = ease(0.5, dt); // dot: near instant
      const vx = (mouse.x - ringPos.x) * kr;
      const vy = (mouse.y - ringPos.y) * kr;
      ringPos.x += vx;
      ringPos.y += vy;
      dotPos.x += (mouse.x - dotPos.x) * kd;
      dotPos.y += (mouse.y - dotPos.y) * kd;

      // gentle stretch along the direction of travel
      const speed = Math.min(Math.hypot(vx, vy) / 40, 0.18);
      const angle = Math.atan2(vy, vx) * (180 / Math.PI);
      const stretch = state === "" || state === "link" ? speed : 0;

      ring.current.style.transform =
        `translate3d(${ringPos.x}px, ${ringPos.y}px, 0) rotate(${angle}deg) scale(${1 + stretch}, ${1 - stretch * 0.6})`;
      label.current.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      dot.current.style.transform = `translate3d(${dotPos.x}px, ${dotPos.y}px, 0)`;

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("pointerout", onLeave);
    window.addEventListener("blur", onBlur);
    const lenis = window.__lenis;
    lenis?.on?.("scroll", onScroll);

    // if the device changes (e.g. tablet mode), give the native cursor back
    const onMedia = () => {
      if (!fine.matches) hide();
    };
    fine.addEventListener?.("change", onMedia);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scrollTick);
      html.classList.remove("has-cursor", "cursor-on");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("pointerout", onLeave);
      window.removeEventListener("blur", onBlur);
      lenis?.off?.("scroll", onScroll);
      fine.removeEventListener?.("change", onMedia);
    };
  }, []);

  return (
    <div className="cursor is-hidden" ref={root} aria-hidden="true">
      <div className="c-ring" ref={ring}>
        <span className="c-ring-shape" />
      </div>
      <div className="c-label" ref={label} />
      <div className="c-dot" ref={dot} />
    </div>
  );
}
