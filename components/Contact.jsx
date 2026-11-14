import Icon from "./Icon";
import EnquiryForm from "./EnquiryForm";
import { site } from "@/lib/content";

export default function Contact() {
  return (
    <section className="contact" id="contact" aria-labelledby="contact-title">
      <div className="wrap contact-layout">
        <div className="contact-intro">
          <span className="eyebrow">Contact</span>
          <h2 id="contact-title" className="display" data-lines>
            <span className="line"><span>Let&apos;s talk about</span></span>
            <span className="line"><span>your <em>space.</em></span></span>
          </h2>
          <p className="contact-lead" data-reveal>
            Planning a new home, a workspace or an outdoor retreat? Share a few
            details and our team will get back to you to discuss your project.
          </p>

          <ul className="contact-list" data-reveal>
            <li>
              <a href={`tel:+91${site.phone}`}>
                <span className="ico"><Icon name="phone" /></span>
                <span className="txt"><small>Call us</small><strong>+91 {site.phone}</strong></span>
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`}>
                <span className="ico"><Icon name="mail" /></span>
                <span className="txt"><small>Email us</small><strong>{site.email}</strong></span>
              </a>
            </li>
            <li>
              <a href="https://maps.app.goo.gl/89soFP6NumYr7qXz9" target="_blank" rel="noopener noreferrer">
                <span className="ico"><Icon name="pin" /></span>
                <span className="txt">
                  <small>Visit our studio</small>
                  <strong>2nd Floor, Gurukrupa Building, 2, LMD Chowk, Bavdhan, Pune, Maharashtra 411021</strong>
                </span>
              </a>
            </li>
          </ul>
        </div>

        <div className="contact-form" id="contact-form" data-reveal>
          <span className="contact-form-frame" aria-hidden="true" />
          <EnquiryForm idPrefix="contact" />
        </div>
      </div>
    </section>
  );
}
