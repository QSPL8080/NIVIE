"use client";

/*
  Experience — every page-level motion in one place:
  smooth scroll (Lenis), hero intro, custom cursor, magnetic buttons,
  scroll reveals, word-fill, parallax, marquee velocity, pinned horizontal
  project gallery, the drawn gold ribbon in "Why Nivie", nav behaviour.
*/

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

const q = (s, r = document) => r.querySelector(s);
const qa = (s, r = document) => Array.from(r.querySelectorAll(s));

/* Wrap every word of an element's text nodes in <span class="w"> (keeps <em> etc.) */
function splitWords(el) {
  const walk = (node) => {
    Array.from(node.childNodes).forEach((child) => {
      if (child.nodeType === 3) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
          else {
            const s = document.createElement("span");
            s.className = "w";
            s.textContent = p;
            frag.appendChild(s);
          }
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) walk(child);
    });
  };
  walk(el);
  return qa(".w", el);
}

export default function Experience() {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const html = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const cleanups = [];

    /* ---------------- Smooth scroll ---------------- */
    let lenis = null;
    if (!reduce) {
      lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1 });
      window.__lenis = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      const raf = (t) => lenis.raf(t * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);
      cleanups.push(() => {
        gsap.ticker.remove(raf);
        lenis.destroy();
        window.__lenis = null;
      });
    }

    /* Anchor links -> smooth scroll */
    const onClick = (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute("href");
      if (!id || id.length < 2) return;
      const target = q(id);
      if (!target) return;
      e.preventDefault();
      window.dispatchEvent(new Event("nivie:closemenu"));
      if (lenis) {
        lenis.start();
        lenis.scrollTo(target, { duration: 1.6, easing: (t) => 1 - Math.pow(1 - t, 4) });
      } else target.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    };
    document.addEventListener("click", onClick);
    cleanups.push(() => document.removeEventListener("click", onClick));

    /* ---------------- Magnetic buttons + image tilt (cursor lives in Cursor.jsx) ---------------- */
    if (finePointer && !reduce) {
      /* Magnetic elements */
      qa("[data-magnetic]").forEach((el) => {
        const mx = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3" });
        const my = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3" });
        const m = (e) => {
          const r = el.getBoundingClientRect();
          mx((e.clientX - (r.left + r.width / 2)) * 0.32);
          my((e.clientY - (r.top + r.height / 2)) * 0.32);
        };
        const l = () => gsap.to(el, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.35)" });
        el.addEventListener("pointermove", m);
        el.addEventListener("pointerleave", l);
        cleanups.push(() => {
          el.removeEventListener("pointermove", m);
          el.removeEventListener("pointerleave", l);
        });
      });

      /* Tilt on project images */
      qa("[data-tilt]").forEach((el) => {
        const m = (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width - 0.5;
          const py = (e.clientY - r.top) / r.height - 0.5;
          el.style.setProperty("--ry", `${px * 8}deg`);
          el.style.setProperty("--rx", `${py * -8}deg`);
        };
        const l = () => {
          el.style.setProperty("--ry", "0deg");
          el.style.setProperty("--rx", "0deg");
        };
        el.addEventListener("pointermove", m);
        el.addEventListener("pointerleave", l);
        cleanups.push(() => {
          el.removeEventListener("pointermove", m);
          el.removeEventListener("pointerleave", l);
        });
      });
    }

    const ctx = gsap.context(() => {
      /* ---------------- Hero intro ---------------- */
      const heroIntro = () => {
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.from("[data-nav]", { yPercent: -150, duration: 1.2 }, 0.2)
          .from("[data-hero-title] .line > span", { yPercent: 118, rotate: 4, duration: 1.4, stagger: 0.1 }, 0)
          .from(".hero-rule-line", { scaleX: 0, transformOrigin: "left", duration: 1.6, ease: "expo.inOut" }, 0.4)
          .from(".hero-scroll", { opacity: 0, y: 20, duration: 1 }, 0.9)
          .from("[data-hero-form]", { opacity: 0, y: 50, duration: 1.3 }, 0.5)
          .from(".hero-bg", { scale: 1.2, duration: 2.6, ease: "power3.out" }, 0);
        return tl;
      };

      /* ---------------- Page opens straight away (no preloader) ---------------- */
      lenis?.start();
      if (!reduce) heroIntro();

      if (reduce) return;

      /* ---------------- Hero scroll + pointer parallax ---------------- */
      gsap.to("[data-hero-title]", {
        yPercent: -18, opacity: 0.25, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(".hero-bg", {
        yPercent: 14, ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true },
      });
      if (finePointer) {
        const img = q("[data-hero-bg]");
        const ix = gsap.quickTo(img, "x", { duration: 1.2, ease: "power3" });
        const iy = gsap.quickTo(img, "y", { duration: 1.2, ease: "power3" });
        const hero = q(".hero");
        const pm = (e) => {
          const r = hero.getBoundingClientRect();
          ix(((e.clientX - r.left) / r.width - 0.5) * -14);
          iy(((e.clientY - r.top) / r.height - 0.5) * -14);
        };
        hero.addEventListener("pointermove", pm);
        cleanups.push(() => hero.removeEventListener("pointermove", pm));
      }

      /* ---------------- Progress bar ---------------- */
      gsap.to(".progress", {
        scaleX: 1, ease: "none",
        scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
      });

      /* ---------------- Nav: hide on scroll down, glass after hero ---------------- */
      const navEl = q("[data-nav]");
      ScrollTrigger.create({
        start: 0,
        end: "max",
        onUpdate: (self) => {
          const y = self.scroll();
          navEl.classList.toggle("is-scrolled", y > 40);
          navEl.classList.toggle("is-hidden", self.direction === 1 && y > 500);
        },
      });

      /* ---------------- Headline line reveals ---------------- */
      qa("[data-lines]").forEach((el) => {
        gsap.from(qa(".line > span", el), {
          yPercent: 115, rotate: 3, duration: 1.3, stagger: 0.1, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 86%" },
        });
      });

      /* ---------------- Generic fade-up ---------------- */
      qa("[data-reveal]").forEach((el) => {
        gsap.from(el, {
          y: 50, opacity: 0, duration: 1.2, ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 90%" },
        });
      });

      /* ---------------- Image clip reveals ---------------- */
      qa("[data-clip]").forEach((el) => {
        gsap.from(el, {
          clipPath: "inset(100% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut",
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });

      /* ---------------- Parallax ---------------- */
      qa("[data-speed]").forEach((el) => {
        const s = parseFloat(el.dataset.speed) || 0.1;
        gsap.fromTo(el, { y: () => -s * 220 }, {
          y: () => s * 220, ease: "none",
          scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
        });
      });


      /* ---------------- Studio: arch unfolds, image drifts, badge rolls in ---------------- */
      if (q("[data-studio]")) {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: "[data-studio]", start: "top 72%" },
          defaults: { ease: "expo.out" },
        });
        tl.fromTo("[data-studio-frame]",
            { clipPath: "inset(100% 0% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" }, 0)
          .from("[data-studio-img]", { scale: 1.35, duration: 2.2 }, 0)
          .from("[data-studio-outline]", { opacity: 0, x: -22, y: -22, duration: 1.6 }, 0.6)
          .fromTo("[data-studio-inset-clip]",
            { clipPath: "inset(0% 0% 0% 100%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut" }, 0.55)
          .from("[data-studio-inset-clip] img", { scale: 1.3, duration: 2 }, 0.55)
          .from("[data-studio-rule]", { scaleX: 0, duration: 1.2 }, 0.7)
          .from("[data-studio-p]", { y: 40, opacity: 0, duration: 1.2, stagger: 0.15 }, 0.85);
        gsap.fromTo("[data-studio-inset]", { y: 50 }, {
          y: -50, ease: "none",
          scrollTrigger: { trigger: "[data-studio]", start: "top bottom", end: "bottom top", scrub: true },
        });
        gsap.fromTo("[data-studio-img]", { yPercent: -6 }, {
          yPercent: 6, ease: "none",
          scrollTrigger: { trigger: "[data-studio]", start: "top bottom", end: "bottom top", scrub: true },
        });
      }

      /* ---------------- Word fill (Studio headline) ---------------- */
      qa("[data-fill]").forEach((el) => {
        const words = splitWords(el);
        gsap.fromTo(words, { opacity: 0.14 }, {
          opacity: 1, stagger: 0.1, ease: "none",
          scrollTrigger: { trigger: el, start: "top 82%", end: "bottom 45%", scrub: true },
        });
      });

      /* ---------------- Stories: pinned horizontal gallery ---------------- */
      const mm = gsap.matchMedia();
      mm.add("(min-width: 901px)", () => {
        const pin = q("[data-stories-pin]");
        const track = q("[data-stories-track]");
        const bar = q("[data-stories-bar]");
        const cards = qa("[data-story]");
        const total = cards.length;
        const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
        const tween = gsap.to(track, {
          x: () => -dist(),
          ease: "none",
          scrollTrigger: {
            trigger: pin,
            start: "top top",
            end: () => "+=" + dist(),
            pin: true,
            scrub: 0.8,
            invalidateOnRefresh: true,
            anticipatePin: 1,
            onUpdate: (self) => {
              gsap.set(bar, { scaleX: self.progress });
            },
          },
        });
        gsap.from(cards.slice(0, 4), {
          y: 80, opacity: 0, duration: 1.4, stagger: 0.12, ease: "expo.out",
          scrollTrigger: { trigger: pin, start: "top 75%" },
        });
        cards.forEach((card) => {
          const img = q("[data-story-img]", card);
          gsap.fromTo(img, { xPercent: -2.5 }, {
            xPercent: 2.5, ease: "none",
            scrollTrigger: { trigger: card, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
          });
        });
      });

      /* Mobile: update counter from the native horizontal scroller */
      mm.add("(max-width: 900px)", () => {
        const track = q("[data-stories-track]");
        const bar = q("[data-stories-bar]");
        const onS = () => {
          const p = track.scrollLeft / Math.max(1, track.scrollWidth - track.clientWidth);
          gsap.set(bar, { scaleX: p });
        };
        track.addEventListener("scroll", onS, { passive: true });
        return () => track.removeEventListener("scroll", onS);
      });

      /* ---------------- Why Nivie: gold ribbon drawn on scroll ---------------- */
      const list = q("[data-why]");
      if (list) {
        const svg = q("[data-why-svg]", list);
        const path = q("[data-why-path]", list);
        const ghost = q("[data-why-ghost]", list);
        const build = () => {
          const box = list.getBoundingClientRect();
          const w = box.width;
          const h = box.height;
          const nodes = qa("[data-why-node]", list).map((n) => {
            const r = n.getBoundingClientRect();
            return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
          });
          if (!nodes.length) return;
          const mobile = window.innerWidth <= 900;
          const amp = mobile ? 16 : Math.min(w * 0.22, 240);
          let d = `M ${nodes[0].x} 0 L ${nodes[0].x} ${nodes[0].y}`;
          for (let i = 1; i < nodes.length; i++) {
            const a = nodes[i - 1];
            const b = nodes[i];
            const dy = b.y - a.y;
            const sw = (i % 2 ? 1 : -1) * amp;
            d += ` C ${a.x + sw} ${a.y + dy * 0.4}, ${b.x + sw} ${b.y - dy * 0.4}, ${b.x} ${b.y}`;
          }
          d += ` L ${nodes[nodes.length - 1].x} ${h}`;
          svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
          path.setAttribute("d", d);
          ghost.setAttribute("d", d);
          const len = path.getTotalLength();
          path.style.strokeDasharray = `${len}`;
          return len;
        };
        let len = build();
        ScrollTrigger.addEventListener("refreshInit", () => {
          len = build();
        });
        gsap.fromTo(path, { strokeDashoffset: () => len }, {
          strokeDashoffset: 0, ease: "none",
          scrollTrigger: { trigger: list, start: "top 72%", end: "bottom 62%", scrub: 0.6, invalidateOnRefresh: true },
        });
        qa("[data-why-item]", list).forEach((item) => {
          ScrollTrigger.create({
            trigger: item,
            start: "top 66%",
            onEnter: () => item.classList.add("is-in"),
            onLeaveBack: () => item.classList.remove("is-in"),
          });
          gsap.from(q(".why-card", item), {
            x: item.classList.contains("is-left") ? -60 : 60, opacity: 0, duration: 1.2, ease: "expo.out",
            scrollTrigger: { trigger: item, start: "top 80%" },
          });
        });
      }

      gsap.from("[data-footmark] img", {
        yPercent: 60, opacity: 0, duration: 1.6, ease: "expo.out",
        scrollTrigger: { trigger: "[data-footmark]", start: "top 98%" },
      });
    });

    // refresh after fonts and images settle
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready?.then(refresh);
    window.addEventListener("load", refresh);

    return () => {
      window.removeEventListener("load", refresh);
      ctx.revert();
      cleanups.forEach((fn) => fn());
    };
  }, []);

  return null;
}
