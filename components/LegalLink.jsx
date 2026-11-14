"use client";

// Opens the Terms / Cookie Policy drawer from anywhere on the page.
export function openLegal(doc) {
  window.dispatchEvent(new CustomEvent("nivie:legal", { detail: doc }));
}

export default function LegalLink({ doc, children, className }) {
  return (
    <button type="button" className={className} onClick={() => openLegal(doc)}>
      {children}
    </button>
  );
}
