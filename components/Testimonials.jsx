"use client";

/*
  Testimonials — scroll-driven.
  When the quote + photo block reaches the middle of the screen it stays in
  place, and scrolling moves through the testimonials one by one. The progress
  bars fill with the scroll. Arrows / bars jump (scroll) to a testimonial.
*/

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Icon from "./Icon";
import { testimonials } from "@/lib/content";

const STEP = 0.75; // scroll distance per testimonial, in screen heights

export default function Testimonials() {
  const [i, setI] = useState(0);
  const quoteRef = useRef(null);
  const gridRef = useRef(null);
  const barsRef = useRef(null);
  const stRef = useRef(null);
  const started = useRef(false);
  const n = testimonials.length;

  /* pin the block and map scroll progress to the active testimonial */
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const grid = gridRef.current;
    const st = ScrollTrigger.create({
      trigger: grid,
      start: "center center",
      end: () => "+=" + Math.round(window.innerHeight * STEP * n),
      pin: true,
      pinSpacing: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      refreshPriority: -1, // calculate after the pinned gallery above it
      onUpdate: (self) => {
        const p = self.progress * n;
        barsRef.current?.style.setProperty("--p", p.toFixed(3));
        const idx = Math.min(n - 1, Math.floor(p));
        setI((prev) => (prev === idx ? prev : idx));
      },
    });
    stRef.current = st;
    // make sure positions include everything above once the page has settled
    const t = setTimeout(() => ScrollTrigger.refresh(), 400);
    return () => {
      clearTimeout(t);
      st.kill();
    };
  }, [n]);

  /* word-by-word entrance for every new quote */
  useEffect(() => {
    if (!started.current) {
      started.current = true;
      return;
    }
    const words = quoteRef.current?.querySelectorAll(".qw");
    if (!words?.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.fromTo(
      words,
      { opacity: 0, y: 18, filter: "blur(8px)" },
      { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.7, stagger: 0.025, ease: "power3.out", overwrite: true }
    );
  }, [i]);

  /* arrows / bars: scroll to the middle of that testimonial's range */
  const go = (k) => {
    const st = stRef.current;
    const next = Math.max(0, Math.min(n - 1, k));
    if (!st) return setI(next);
    const y = st.start + ((next + 0.5) / n) * (st.end - st.start);
    if (window.__lenis) window.__lenis.scrollTo(y, { duration: 1.1 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const t = testimonials[i];

  return (
    <section className="voices" id="voices" aria-labelledby="voices-title">
      <div className="wrap">
        <div className="voices-head">
          <div>
            <span className="eyebrow">Testimonials</span>
            <h2 id="voices-title" className="display" data-lines>
              <span className="line"><span>Real Stories.</span></span>
              <span className="line"><span><em>Beautiful</em> Experiences.</span></span>
            </h2>
          </div>
        </div>

        <div className="voices-grid" ref={gridRef}>
          <div className="quote">
            <div className="quote-glyph" aria-hidden="true">
              <svg viewBox="0 0 64 48" fill="currentColor">
                <path d="M0 48V29.5C0 13.2 8.4 3.4 25.2 0l2.6 5.6C19.4 8.2 15 13.4 14.4 21H26v27H0Zm37.6 0V29.5C37.6 13.2 46 3.4 62.8 0l2.6 5.6C57 8.2 52.6 13.4 52 21h11.6v27h-26Z" />
              </svg>
            </div>
            <blockquote ref={quoteRef} aria-live="polite">
              {t.quote.split(" ").map((w, k) => (
                <span className="qw" key={`${i}-${k}`}>{w + " "}</span>
              ))}
            </blockquote>
            <div className="quote-who">
              <span className="dash" />
              <div>
                <b>{t.name}</b>
                <span>{t.project}</span>
              </div>
            </div>
            <div className="quote-ctrl">
              <button type="button" className="arrow" onClick={() => go(i - 1)} aria-label="Previous testimonial" disabled={i === 0}>
                <Icon name="arrowLeft" />
              </button>
              <button type="button" className="arrow" onClick={() => go(i + 1)} aria-label="Next testimonial" disabled={i === n - 1}>
                <Icon name="arrow" />
              </button>
              <div className="quote-bars" ref={barsRef} style={{ "--p": 0 }}>
                {testimonials.map((q, k) => (
                  <button
                    key={q.name}
                    type="button"
                    style={{ "--k": k }}
                    onClick={() => go(k)}
                    aria-label={`Show testimonial from ${q.name}`}
                    aria-current={k === i}
                  >
                    <i />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="stack" aria-hidden="true">
            {testimonials.map((q, k) => {
              const off = (k - i + n) % n; // 0 = front
              const style = {
                zIndex: n - off,
                transform: `translate(${off * 16}px, ${off * -16}px) scale(${1 - off * 0.04})`,
                opacity: off > 2 ? 0 : 1 - off * 0.18,
                filter: off === 0 ? "none" : "saturate(.6) brightness(.9)",
              };
              return (
                <figure key={q.name} style={style}>
                  <img src={q.img} alt="" loading="lazy" />
                </figure>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
