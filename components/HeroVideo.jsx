"use client";

/*
  Background video for the top banner.
  - Muted, looping, inline (required for autoplay on phones).
  - Smaller file on phones, full HD on larger screens.
  - Shows a still frame (poster) until the video can play, and keeps the
    poster for visitors who prefer reduced motion or are on data saver.
*/
import { useEffect, useRef, useState } from "react";

export default function HeroVideo() {
  const ref = useRef(null);
  const [src, setSrc] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = navigator.connection && navigator.connection.saveData;
    if (reduce || saveData) return;
    setSrc(window.matchMedia("(max-width: 900px)").matches ? "/video/hero-mobile.mp4" : "/video/hero.mp4");
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    v.muted = true;
    const p = v.play();
    if (p && p.catch) p.catch(() => {});
    // pause when the banner is off screen to save battery
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, [src]);

  return (
    <>
      <img className={`hero-poster ${ready ? "is-hidden" : ""}`} src="/images/hero-poster.jpg" alt="" />
      {src && (
        <video
          ref={ref}
          className={`hero-video ${ready ? "is-ready" : ""}`}
          src={src}
          poster="/images/hero-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onPlaying={() => setReady(true)}
        />
      )}
    </>
  );
}
