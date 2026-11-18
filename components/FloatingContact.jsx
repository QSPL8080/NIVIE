"use client";

import { site } from "@/lib/content";
import Icon from "./Icon";

export default function FloatingContact() {
  const whatsappUrl = `https://wa.me/91${site.phone}?text=${encodeURIComponent(
    "Hi Nivie Designs, I would like to enquire about your interior design services."
  )}`;
  const phoneUrl = `tel:+91${site.phone}`;

  return (
    <aside className="floating-contact" aria-label="Quick Contact Options">
      {/* Call Button */}
      <a
        href={phoneUrl}
        className="floating-btn floating-call"
        aria-label={`Call Nivie Designs at ${site.phoneDisplay}`}
      >
        <span className="floating-tooltip">Call: {site.phoneDisplay}</span>
        <span className="floating-icon">
          <Icon name="phone" />
        </span>
      </a>

      {/* WhatsApp Button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="floating-btn floating-wa"
        aria-label="Chat with Nivie Designs on WhatsApp"
      >
        <span className="floating-status" aria-hidden="true" title="Online" />
        <span className="floating-tooltip">Chat on WhatsApp</span>
        <span className="floating-icon">
          <Icon name="whatsapp" />
        </span>
      </a>
    </aside>
  );
}
