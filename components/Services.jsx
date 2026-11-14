"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { services } from "@/lib/content";

export default function Services() {
  const [active, setActive] = useState(0);
  const rows = useRef([]);
  const lock = useRef(0);

  // As each service row crosses the middle of the screen, make it active.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        if (Date.now() < lock.current) return;
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(Number(e.target.dataset.i));
        });
      },
      { rootMargin: "-46% 0px -46% 0px" }
    );
    rows.current.forEach((r) => r && io.observe(r));
    return () => io.disconnect();
  }, []);

  const pick = (i) => {
    lock.current = Date.now() + 900;
    setActive(i);
  };

  return (
    <section className="services" id="services" aria-labelledby="services-title">
      <div className="wrap">
        <div className="services-head">
          <div>
            <span className="eyebrow">What We Offer</span>
            <h2 id="services-title" className="display" data-lines>
              <span className="line"><span>Spaces.</span></span>
              <span className="line"><span>Structures.</span></span>
              <span className="line"><span>Experiences.</span></span>
            </h2>
          </div>
          <p data-reveal>
            From beautiful buildings to stylish interiors and refreshing
            landscapes, we turn your ideas into spaces you&apos;ll love.
          </p>
        </div>

        <div className="services-body">
          <div className="svc-list">
            {services.map((s, i) => (
              <div
                key={s.no}
                className={`svc-row ${active === i ? "is-active" : ""}`}
                ref={(el) => (rows.current[i] = el)}
                data-i={i}
                data-reveal
              >
                <h3 style={{ margin: 0 }}>
                  <button
                    type="button"
                    className="svc-trigger"
                    aria-expanded={active === i}
                    aria-controls={`svc-panel-${i}`}
                    onClick={() => pick(i)}
                    onMouseEnter={() => pick(i)}
                    onFocus={() => pick(i)}
                  >
                    <span className="svc-title">{s.title}</span>
                    <span className="svc-arrow"><Icon name="arrow" /></span>
                  </button>
                </h3>
                <div className="svc-panel" id={`svc-panel-${i}`} role="region" aria-label={s.title}>
                  <div>
                    <div className="svc-panel-inner">
                      <div className="svc-row-img">
                        <img src={s.img} alt={s.alt} loading="lazy" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="svc-frame-wrap" aria-hidden="true">
            <div className="svc-frame">
              {services.map((s, i) => (
                <img
                  key={s.no}
                  src={s.img}
                  alt=""
                  className={active === i ? "is-active" : ""}
                  style={{ zIndex: active === i ? 2 : 1 }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
