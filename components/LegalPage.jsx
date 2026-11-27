import Link from "next/link";
import Icon from "./Icon";
import { legalDocs, legalOrder } from "@/lib/legal";
import { site } from "@/lib/content";

// Full-page layout for Privacy Policy, Terms & Conditions and Cookie Policy.
// Each document lives at its own URL, e.g. https://niviedesignsstudio.com/privacy-policy

const slugify = (s) =>
  s
    .replace(/^\d+\.\s*/, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

// "Email: x@y.com" → clickable value, so contact details work on phones too.
function ContactValue({ text }) {
  const m = text.match(/^([^:]+):\s*(.+)$/);
  if (!m || /^https?$/i.test(m[1])) return text;
  const [, label, value] = m;
  let href = null;
  if (/^https?:\/\//.test(value)) href = value;
  else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) href = `mailto:${value}`;
  else if (/^[+\d\s-]{8,}$/.test(value)) href = `tel:+91${value.replace(/\D/g, "").slice(-10)}`;
  return (
    <>
      <span className="legal-label">{label}</span>
      {href ? (
        <a href={href} {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {value.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
        </a>
      ) : (
        <span>{value}</span>
      )}
    </>
  );
}

function Block({ b }) {
  if (typeof b === "string") return <p>{b}</p>;
  if (b.plain) {
    return (
      <address className="legal-contact">
        {b.list.map((li, i) => (
          <div key={li} className={i === 0 ? "legal-contact-name" : undefined}>
            <ContactValue text={li} />
          </div>
        ))}
      </address>
    );
  }
  return (
    <ul>
      {b.list.map((li) => {
        // "Essential Cookies: Help our website…" → bold term before the colon
        const m = li.match(/^([A-Z][\w\s-]{2,40}):\s(.+)$/);
        return <li key={li}>{m ? <><strong>{m[1]}:</strong> {m[2]}</> : li}</li>;
      })}
    </ul>
  );
}

export default function LegalPage({ slug }) {
  const doc = legalDocs[slug];
  const year = new Date().getFullYear();
  const sections = doc.sections.map((s) => ({ ...s, id: slugify(s.h) }));

  const toc = (
    <ol>
      {sections.map((s) => (
        <li key={s.id}>
          <a href={`#${s.id}`}>{s.h.replace(/^\d+\.\s*/, "")}</a>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="legal-page" id="top">
      <header className="legal-top">
        <div className="legal-wrap legal-top-bar">
          <Link href="/" className="legal-logo" aria-label="Nivie Designs — Home">
            <img className="mark" src="/images/logo-mark-sm.png" alt="" width="240" height="213" />
            <img className="word" src="/images/wordmark-ivory.png" alt="" width="700" height="369" />
          </Link>
          <Link href="/" className="legal-back">
            <Icon name="arrowLeft" />
            <span>Back to website</span>
          </Link>
        </div>
      </header>

      <section className="legal-hero">
        <div className="legal-wrap">
          <nav className="legal-crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">/</span>
            <span>Legal</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{doc.title}</span>
          </nav>
          <h1>{doc.title}</h1>
          {doc.updated && <p className="legal-updated">{doc.updated}</p>}
          <nav className="legal-switch" aria-label="Legal documents">
            {legalOrder.map((k) => (
              <Link key={k} href={`/${legalDocs[k].slug}`} aria-current={k === slug ? "page" : undefined} aria-label={legalDocs[k].title}>
                <span className="full">{legalDocs[k].title}</span>
                <span className="short">{legalDocs[k].short}</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      <main className="legal-wrap legal-main">
        <aside className="legal-toc" aria-label="On this page">
          <p className="legal-toc-title">On this page</p>
          {toc}
        </aside>

        <article className="legal-article">
          <details className="legal-toc-m">
            <summary>On this page</summary>
            {toc}
          </details>

          <p className="legal-intro">{doc.intro}</p>

          {sections.map((s) => (
            <section key={s.id} id={s.id}>
              <h2>{s.h}</h2>
              {s.body.map((b, i) => (
                <Block b={b} key={i} />
              ))}
            </section>
          ))}

          <div className="legal-help">
            <div>
              <h2>Have a question?</h2>
              <p>Our team is happy to help with anything related to this policy.</p>
            </div>
            <div className="legal-help-actions">
              <a href={`mailto:${site.email}`} className="legal-btn">
                <Icon name="mail" />
                <span>Email us</span>
              </a>
              <a href={`tel:+91${site.phone}`} className="legal-btn ghost">
                <Icon name="phone" />
                <span>Call {site.phoneDisplay}</span>
              </a>
            </div>
          </div>
        </article>
      </main>

      <footer className="legal-foot">
        <div className="legal-wrap legal-foot-bar">
          <span className="foot-credit">
            © {year} Nivie Designs. All rights reserved.
            <span className="credit-sep" aria-hidden="true">·</span>
            Developed By -{" "}
            <a href="https://quickuppsoftech.com/" target="_blank" rel="noopener noreferrer">Quickupp Softech Team</a>
          </span>
          <nav aria-label="Legal">
            {legalOrder.map((k) => (
              <Link key={k} href={`/${legalDocs[k].slug}`} aria-current={k === slug ? "page" : undefined}>
                {legalDocs[k].title}
              </Link>
            ))}
          </nav>
          <a href="#top" className="legal-to-top" aria-label="Back to top">
            <Icon name="arrow" />
          </a>
        </div>
      </footer>
    </div>
  );
}
