import Link from "next/link";

// Links to the full legal pages (each one has its own URL).
const paths = {
  privacy: "/privacy-policy",
  terms: "/terms-and-conditions",
  cookies: "/cookie-policy",
};

export const legalHref = (doc) => paths[doc] || paths.privacy;

export default function LegalLink({ doc, children, className }) {
  return (
    <Link href={legalHref(doc)} className={className}>
      {children}
    </Link>
  );
}
