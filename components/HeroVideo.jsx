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
    if (reduce) return;

    // Serve Full HD (hero.mp4) with version hash to bust mobile browser caching.
    // Fall back to compressed 540p only if user explicitly turned on Data Saver or is on 2G.
    const isDataSaver =
      navigator.connection &&
      (navigator.connection.saveData || navigator.connection.effectiveType === "2g");
    setSrc(isDataSaver ? "/video/hero-mobile.mp4?v=2" : "/video/hero.mp4?v=1080");
  }, []);

  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;

    v.defaultMuted = true;
    v.muted = true;

    const onReady = () => setReady(true);
    v.addEventListener("playing", onReady, { once: true });
    v.addEventListener("canplay", onReady, { once: true });
    v.addEventListener("loadeddata", onReady, { once: true });

    const p = v.play();
    if (p && p.catch) p.catch(() => {});

    // pause when the banner is off screen to save battery
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);

    return () => {
      v.removeEventListener("playing", onReady);
      v.removeEventListener("canplay", onReady);
      v.removeEventListener("loadeddata", onReady);
      io.disconnect();
    };
  }, [src]);

  return (
    <>
      <img
        className={`hero-poster ${ready ? "is-hidden" : ""}`}
        src="/images/hero-poster.jpg?v=2"
        alt=""
      />
      {src && (
        <video
          ref={ref}
          className={`hero-video ${ready ? "is-ready" : ""}`}
          src={src}
          poster="/images/hero-poster.jpg?v=2"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onPlaying={() => setReady(true)}
          onLoadedData={() => setReady(true)}
        />
      )}
    </>
  );
}
