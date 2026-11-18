import Nav from "@/components/Nav";
import Experience from "@/components/Experience";
import Services from "@/components/Services";
import Testimonials from "@/components/Testimonials";
import Contact from "@/components/Contact";
import CookieBanner from "@/components/CookieBanner";
import EnquiryPopup from "@/components/EnquiryPopup";
import MetaPixel from "@/components/MetaPixel";
import LegalDrawer from "@/components/LegalDrawer";
import FloatingContact from "@/components/FloatingContact";
import { Cta, Footer, Hero, MobileEnquiry, Instagram, Stories, Studio, Why } from "@/components/Sections";

export default function Home() {
  return (
    <>
      <a href="#studio" className="skip-link">Skip to content</a>
      <div className="progress" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <Nav />

      <main>
        <Hero />
        <MobileEnquiry />
        <Studio />
        <Stories />
        <Services />
        <Why />
        <Testimonials />
        <Cta />
        <Contact />
        <Instagram />
      </main>

      <Footer />
      <LegalDrawer />
      <CookieBanner />
      <EnquiryPopup />
      <FloatingContact />
      <Experience />
      <MetaPixel />
    </>
  );
}
