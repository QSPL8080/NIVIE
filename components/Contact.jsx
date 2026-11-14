import Icon from "./Icon";
import { site } from "@/lib/content";


export default function Contact() {
  return (
    <section className="contact" id="contact" aria-labelledby="contact-title">
      <div className="wrap">
        <div className="contact-top">
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
            <a href="#enquire" className="btn btn-plum contact-cta" data-magnetic data-reveal>
              Enquire now
              <span className="btn-ico"><Icon name="arrow" /></span>
            </a>
          </div>

          <ul className="contact-cards" data-reveal>
            <li>
              <a href={`tel:+91${site.phone}`}>
                <span className="ico"><Icon name="phone" /></span>
                <span className="txt"><small>Call us</small><strong>+91 {site.phone}</strong></span>
                <Icon name="arrowUpRight" className="go" />
              </a>
            </li>
            <li>
              <a href={`mailto:${site.email}`}>
                <span className="ico"><Icon name="mail" /></span>
                <span className="txt"><small>Email us</small><strong>{site.email}</strong></span>
                <Icon name="arrowUpRight" className="go" />
              </a>
            </li>
            <li>
              <a href="https://maps.app.goo.gl/89soFP6NumYr7qXz9" target="_blank" rel="noopener noreferrer">
                <span className="ico"><Icon name="pin" /></span>
                <span className="txt">
                  <small>Visit our studio</small>
                  <strong>2nd Floor, Gurukrupa Building, 2, LMD Chowk, Bavdhan, Pune, Maharashtra 411021</strong>
                </span>
                <Icon name="arrowUpRight" className="go" />
              </a>
            </li>
          </ul>
        </div>

      </div>
    </section>
  );
}
