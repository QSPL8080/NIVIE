import Icon from "./Icon";
import LegalLink from "./LegalLink";
import HeroVideo from "./HeroVideo";
import EnquiryForm from "./EnquiryForm";
import { projects, reasons, reels, services, site } from "@/lib/content";

/* ------------------------------------------------------------------ */
export function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero-bg" data-hero-bg>
        <HeroVideo />
      </div>
      <div className="hero-tint" />

      <div className="wrap hero-layout">
        <div className="hero-copy">
          <h1 id="hero-title" className="display" data-hero-title>
            <span className="line"><span>Top Commercial &amp;</span></span>
            <span className="line"><span>Residential</span></span>
            <span className="line"><span>Interior <em className="gold-text">Designer</em></span></span>
          </h1>
          <div className="hero-rule" aria-hidden="true">
            <span className="hero-rule-line" />
            <a href="#studio" className="hero-scroll hero-scroll-desktop desktop-only" aria-label="Scroll down">
              <Icon name="arrow" />
            </a>
            <a href="#enquire-mobile" className="hero-scroll hero-scroll-mobile mobile-only" aria-label="Scroll to enquiry form">
              <Icon name="arrow" />
            </a>
          </div>
        </div>
        <div className="hero-form desktop-only" id="enquire" data-hero-form>
          <EnquiryForm idPrefix="hero" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Dedicated mobile and tablet enquiry section directly below hero    */
/* ------------------------------------------------------------------ */
export function MobileEnquiry() {
  return (
    <section className="mobile-enquiry-section" id="enquire-mobile" aria-label="Book Design Consultation">
      <div className="wrap mobile-enquiry-wrap">
        <div className="hero-form mobile-enquiry-box">
          <EnquiryForm idPrefix="mobile" />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function Studio() {
  return (
    <section className="studio" id="studio" aria-labelledby="studio-title" data-studio>
      <div className="wrap studio-grid">
        <figure className="studio-media" aria-hidden="true">
          <div className="studio-outline" data-studio-outline />
          <div className="studio-frame" data-studio-frame>
            <img src="/images/studio-bedroom.jpg" alt="" data-studio-img />
          </div>
          <div className="studio-inset" data-studio-inset>
            <div className="studio-inset-clip" data-studio-inset-clip>
              <img src="/images/studio-detail.jpg" alt="" loading="lazy" />
            </div>
          </div>
        </figure>

        <div className="studio-text">
          <h2 id="studio-title" className="display" data-fill>
            Transforming Spaces Into <em>Timeless</em> Experiences.
          </h2>
          <span className="studio-rule" data-studio-rule aria-hidden="true" />
          <div className="studio-copy">
            <p data-studio-p>
              From architectural concepts to stunning interiors and thoughtfully
              designed landscapes, we create spaces that bring together
              functionality, aesthetics, and your unique vision.
            </p>
            <p data-studio-p>
              Whether it&apos;s your dream home, a commercial space, or an
              outdoor environment, we turn ideas into meaningful design
              experiences.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function Stories() {
  return (
    <section className="stories" id="projects" aria-labelledby="stories-title">
      <div className="wrap stories-head">
        <div>
          <h2 id="stories-title" className="display" data-lines>
            <span className="line"><span>Our Design</span></span>
            <span className="line"><span><em className="gold-text">Stories</em></span></span>
          </h2>
        </div>
      </div>

      <div className="stories-pin" data-stories-pin>
        <div className="stories-track" data-stories-track>
          {projects.map((p) => (
            <article className={`story story--${p.shape}`} key={p.name} data-story>
              <a href={p.href} target="_blank" rel="noopener noreferrer" data-cursor="↗">
                <div className="story-media" data-tilt>
                  <img src={p.img} alt={p.name} loading="lazy" data-story-img />
                </div>
                <div className="story-info">
                  <div className="story-tags">
                    {p.tags.map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                  <h3>
                    {p.name} <Icon name="arrowUpRight" />
                  </h3>
                </div>
              </a>
            </article>
          ))}
        </div>

        <div className="stories-progress" aria-hidden="true">
          <span className="bar"><i data-stories-bar /></span>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function Why() {
  return (
    <section className="why why--photo" id="why" aria-labelledby="why-title">
      <div className="why-photo" aria-hidden="true">
        <img src="/images/why-bg.jpg" alt="" loading="lazy" data-speed="0.22" />
      </div>
      <div className="wrap">
        <div className="why-head">
          <div>
            <h2 id="why-title" className="display" data-lines>
              <span className="line"><span>Why <em className="gold-text">Nivie</em></span></span>
              <span className="line"><span>Designs?</span></span>
            </h2>
          </div>
          <p className="why-lead" data-reveal>
            We don&apos;t just design spaces; we create experiences. Blending
            creativity, innovation, and functionality to bring extraordinary
            spaces to life.
          </p>
        </div>

        <div className="why-list" data-why>
          <svg className="why-svg" aria-hidden="true" data-why-svg>
            <defs>
              <linearGradient id="ribbonGold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f3e3c3" />
                <stop offset="0.5" stopColor="#dcc293" />
                <stop offset="1" stopColor="#a8824f" />
              </linearGradient>
            </defs>
            <path className="ghost" data-why-ghost />
            <path className="draw" data-why-path />
          </svg>

          {reasons.map((r, i) => (
            <div className={`why-item ${i % 2 === 0 ? "is-left" : "is-right"}`} key={r.title} data-why-item>
              <span className="why-node" data-why-node aria-hidden="true" />
              <div className="why-card">
                <span className="why-ico"><Icon name={r.icon} /></span>
                <h3>{r.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function Cta() {
  return (
    <section className="cta" aria-labelledby="cta-title">
      <div className="cta-float f1" data-speed="-0.25" data-float><img src="/images/moment-1.jpg" alt="" loading="lazy" /></div>
      <div className="cta-float f2" data-speed="0.3" data-float><img src="/images/moment-2.jpg" alt="" loading="lazy" /></div>
      <div className="cta-float f3" data-speed="0.2" data-float><img src="/images/moment-3.jpg" alt="" loading="lazy" /></div>
      <div className="cta-float f4" data-speed="-0.3" data-float><img src="/images/moment-4.jpg" alt="" loading="lazy" /></div>

      <div className="wrap">
        <h2 id="cta-title" className="display" data-lines>
          <span className="line"><span>Let&apos;s Create</span></span>
          <span className="line"><span>Something <em className="gold-text">Beautiful</em></span></span>
          <span className="line"><span>Together.</span></span>
        </h2>
        <div className="cta-btn-wrap" data-reveal>
          <a href="#enquire" className="round-btn" data-magnetic aria-label="Enquiry form">
            <svg className="ring" viewBox="0 0 166 166" aria-hidden="true">
              <circle cx="83" cy="83" r="72" fill="none" stroke="rgba(255,255,255,.45)" strokeDasharray="2 8" />
            </svg>
            <span className="core"><Icon name="arrow" /></span>
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function Instagram() {
  const list = [...reels, ...reels];
  return (
    <section className="insta" id="instagram" aria-labelledby="insta-title">
      <div className="wrap insta-head">
        <div>
          <h2 id="insta-title" className="display" data-lines>
            <span className="line"><span>From Our</span></span>
            <span className="line"><span><em className="gold-text">Instagram</em></span></span>
          </h2>
        </div>
        <div className="insta-side" data-reveal>
          <p>Behind-the-scenes moments and finished spaces, straight from our reels.</p>
          <a href={site.socials.instagram} target="_blank" rel="noopener noreferrer" className="insta-follow" data-magnetic>
            <span className="ig-badge"><Icon name="instagram" /></span>
            <span className="t">Follow us on Instagram</span>
            <span className="btn-ico"><Icon name="arrowUpRight" /></span>
          </a>
        </div>
      </div>

      <div className="reel-strip" data-reveal>
        <div className="reel-track">
          {list.map((r, i) => (
            <a
              key={i}
              className="reel"
              href={site.socials.instagram}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="▶"
              aria-hidden={i >= reels.length ? "true" : undefined}
              tabIndex={i >= reels.length ? -1 : undefined}
              aria-label={i < reels.length ? "Instagram" : undefined}
            >
              <img src={r} alt="" loading="lazy" />
              <Icon name="instagram" className="ig" />
              <span className="play"><Icon name="play" /></span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="footer">
      <div className="foot-glow" aria-hidden="true" />
      <div className="wrap">
        <div className="foot-cols">
          <div className="foot-brand">
            <a href="#top" className="foot-logo" aria-label="Nivie Designs — Home">
              <img className="mark" src="/images/logo-mark-sm.png" alt="" />
            </a>
            <div className="foot-social">
              <a href={site.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Icon name="instagram" /></a>
              <a href={site.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><Icon name="facebook" /></a>
              <a href={site.socials.linkedin} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><Icon name="linkedin" /></a>
            </div>
          </div>

          <div className="foot-col">
            <h4>What We Offer</h4>
            <ul className="foot-links">
              {services.map((s) => (
                <li key={s.no}><a href="#services">{s.title}</a></li>
              ))}
            </ul>
          </div>

          <div className="foot-col">
            <h4>Contact</h4>
            <ul className="foot-contact">
              <li>
                <Icon name="phone" />
                <a href={`tel:+91${site.phone}`}>{site.phone}</a>
              </li>
              <li>
                <Icon name="mail" />
                <a href={`mailto:${site.email}`}>{site.email}</a>
              </li>
              <li>
                <Icon name="pin" />
                <a href="https://maps.app.goo.gl/89soFP6NumYr7qXz9" target="_blank" rel="noopener noreferrer">{site.address}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="foot-mark" aria-hidden="true" data-footmark>
          <img src="/images/wordmark-nivie-plum.png" alt="" />
        </div>

        <div className="foot-bottom">
          <span>© {year} Nivie Designs</span>
          <nav aria-label="Legal">
            <LegalLink doc="privacy">Privacy Policy</LegalLink>
            <LegalLink doc="terms">Terms &amp; Conditions</LegalLink>
            <LegalLink doc="cookies">Cookie Policy</LegalLink>
          </nav>
          <a href="#top" className="to-top" aria-label="Home" data-magnetic>
            <Icon name="arrow" />
          </a>
        </div>
      </div>
    </footer>
  );
}
