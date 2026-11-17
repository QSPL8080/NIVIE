"use client";

/*
  Top banner media:
  - Desktop, PC & Laptop (width > 1024px): Full HD video (/video/hero.mp4) with poster fallback.
  - Mobile & Tablet (width <= 1024px): 5 high-resolution portfolio images sliding every 3 seconds
    with hardware-accelerated transitions, Ken Burns subtle zoom, touch swipe, and indicator dots.
*/
import { useEffect, useRef, useState, useCallback } from "react";

const SLIDES = [
  {
    src: "/images/why-bg.jpg",
    alt: "Nivie Designs - Luxury Living & Dining Interior",
  },
  {
    src: "/images/studio-bedroom.jpg",
    alt: "Nivie Designs - Bespoke Master Suite Interior",
  },
  {
    src: "/images/service-interior.jpg",
    alt: "Nivie Designs - Contemporary Living & Architectural Shelving",
  },
  {
    src: "/images/testimonial-2.jpg",
    alt: "Nivie Designs - Modern Elegant Interior Architecture",
  },
  {
    src: "/images/service-architecture.jpg",
    alt: "Nivie Designs - Luxury Architectural Villa & Pool",
  },
];

const SLIDES_COUNT = SLIDES.length;
// Infinite loop track with clones at start and end
const CLONED_SLIDES = [
  SLIDES[SLIDES_COUNT - 1], // Clone of last slide
  ...SLIDES,
  SLIDES[0],                // Clone of first slide
];
const TOTAL_CLONED = CLONED_SLIDES.length;

export default function HeroVideo() {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  // Desktop video state
  const videoRef = useRef(null);
  const [videoSrc, setVideoSrc] = useState(null);
  const [videoReady, setVideoReady] = useState(false);

  // Mobile slider state
  const [trackIndex, setTrackIndex] = useState(1); // 1 = real first slide
  const [withTransition, setWithTransition] = useState(true);
  const timerRef = useRef(null);

  // Touch tracking for swipe gestures
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Detect viewport & preload images
  useEffect(() => {
    const checkViewport = () => {
      const isMob = window.matchMedia("(max-width: 1024px)").matches;
      setIsMobileOrTablet(isMob);
    };

    checkViewport();
    window.addEventListener("resize", checkViewport);

    // Preload all 5 slide images into memory for zero stutter
    SLIDES.forEach((slide) => {
      const img = new Image();
      img.src = slide.src;
    });

    return () => window.removeEventListener("resize", checkViewport);
  }, []);

  // Initialize desktop video only when not on mobile/tablet
  useEffect(() => {
    if (isMobileOrTablet) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const isDataSaver =
      navigator.connection &&
      (navigator.connection.saveData || navigator.connection.effectiveType === "2g");

    setVideoSrc(isDataSaver ? "/video/hero-mobile.mp4?v=2" : "/video/hero.mp4?v=1080");
  }, [isMobileOrTablet]);

  // Video autoplay & visibility observer (desktop only)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoSrc || isMobileOrTablet) return;

    v.defaultMuted = true;
    v.muted = true;

    const onReady = () => setVideoReady(true);
    v.addEventListener("playing", onReady, { once: true });
    v.addEventListener("canplay", onReady, { once: true });
    v.addEventListener("loadeddata", onReady, { once: true });

    const p = v.play();
    if (p && p.catch) p.catch(() => {});

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
  }, [videoSrc, isMobileOrTablet]);

  // Slide navigation
  const nextSlide = useCallback(() => {
    setWithTransition(true);
    setTrackIndex((prev) => prev + 1);
  }, []);

  const prevSlide = useCallback(() => {
    setWithTransition(true);
    setTrackIndex((prev) => prev - 1);
  }, []);

  const goToSlide = useCallback((index) => {
    setWithTransition(true);
    setTrackIndex(index + 1);
  }, []);

  // Infinite seamless wrap-around at track bounds
  const handleTransitionEnd = (e) => {
    if (e.target !== e.currentTarget || e.propertyName !== "transform") return;

    if (trackIndex === TOTAL_CLONED - 1) {
      // Reached clone of first slide at end -> silently snap to real first slide
      setWithTransition(false);
      setTrackIndex(1);
    } else if (trackIndex === 0) {
      // Reached clone of last slide at start -> silently snap to real last slide
      setWithTransition(false);
      setTrackIndex(SLIDES_COUNT);
    }
  };

  // Re-enable CSS transition after silent track snap
  useEffect(() => {
    if (!withTransition) {
      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => {
          setWithTransition(true);
        });
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
    }
  }, [withTransition]);

  // Auto-slide every 3 seconds on mobile & tablet
  useEffect(() => {
    if (!isMobileOrTablet) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      nextSlide();
    }, 3000);

    const handleVisibility = () => {
      if (document.hidden) {
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          nextSlide();
        }, 3000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [isMobileOrTablet, nextSlide, trackIndex]);

  // Touch swipe support
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    const deltaX = touchStartX.current - e.changedTouches[0].clientX;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;

    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
      if (deltaX > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  const activeDot = (trackIndex - 1 + SLIDES_COUNT) % SLIDES_COUNT;

  return (
    <>
      {/* ---------------- Desktop / Laptop / PC: Full HD Video ---------------- */}
      <div className="hero-desktop-media" aria-hidden="true">
        <img
          className={`hero-poster ${videoReady ? "is-hidden" : ""}`}
          src="/images/hero-poster.jpg?v=2"
          alt=""
        />
        {videoSrc && (
          <video
            ref={videoRef}
            className={`hero-video ${videoReady ? "is-ready" : ""}`}
            src={videoSrc}
            poster="/images/hero-poster.jpg?v=2"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            aria-hidden="true"
            onPlaying={() => setVideoReady(true)}
            onLoadedData={() => setVideoReady(true)}
          />
        )}
      </div>

      {/* ---------------- Mobile & Tablet: 5-Image 3s Slider ---------------- */}
      <div
        className="hero-mobile-slider"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        aria-label="Luxury Interior Portfolio"
      >
        <div
          className="hero-slider-track"
          style={{
            transform: `translate3d(-${(trackIndex * 100) / TOTAL_CLONED}%, 0, 0)`,
            transition: withTransition
              ? "transform 0.85s cubic-bezier(0.65, 0, 0.35, 1)"
              : "none",
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {CLONED_SLIDES.map((slide, idx) => {
            const isCurrent =
              idx === trackIndex ||
              (trackIndex === TOTAL_CLONED - 1 && idx === 1) ||
              (trackIndex === 0 && idx === SLIDES_COUNT);

            return (
              <div
                key={idx}
                className={`hero-slider-slide ${isCurrent ? "is-active" : ""}`}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className="hero-slide-img"
                  loading={idx <= 2 ? "eager" : "lazy"}
                />
              </div>
            );
          })}
        </div>

        {/* 5 Sleek Indicator Dots */}
        <div className="hero-slider-indicators">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`hero-slider-dot ${activeDot === i ? "is-active" : ""}`}
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1} of ${SLIDES_COUNT}`}
            />
          ))}
        </div>
      </div>
    </>
  );
}
