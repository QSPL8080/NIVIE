import "@fontsource/cormorant-garamond/300.css";
import "@fontsource/cormorant-garamond/400.css";
import "@fontsource/cormorant-garamond/400-italic.css";
import "@fontsource/cormorant-garamond/500.css";
import "@fontsource/cormorant-garamond/500-italic.css";
import "@fontsource-variable/inter";
import "./globals.css";
import { site } from "@/lib/content";

export const metadata = {
  metadataBase: new URL(site.url),
  title: "Architecture, Interiors & Landscape Design | Nivie Designs",
  description:
    "Transform your space with Nivie Designs. Explore creative architecture, interior and landscape design solutions tailored to your vision.",
  openGraph: {
    title: "Architecture, Interiors & Landscape Design | Nivie Designs",
    description:
      "Transform your space with Nivie Designs. Explore creative architecture, interior and landscape design solutions tailored to your vision.",
    url: site.url,
    siteName: "Nivie Designs",
    images: ["/images/rk-villa.jpg"],
    type: "website",
  },
  icons: { icon: "/images/logo-mark-sm.png" },
};

export const viewport = {
  themeColor: "#350c21",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  name: "Nivie Designs",
  description:
    "Transform your space with Nivie Designs. Explore creative architecture, interior and landscape design solutions tailored to your vision.",
  url: site.url,
  telephone: "+91-" + site.phone,
  email: site.email,
  image: site.url + "images/rk-villa.jpg",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Office No, 2nd Floor, Gurukrupa Building, 2, LMD Chowk, Bavdhan",
    addressLocality: "Pune",
    addressRegion: "Maharashtra",
    postalCode: "411021",
    addressCountry: "IN",
  },
  sameAs: [site.socials.instagram, site.socials.facebook, site.socials.linkedin],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google tag (Google Tag Manager container GTM-NV9XRWJ2) */}
        <script async src="https://www.googletagmanager.com/gtm.js?id=GTM-NV9XRWJ2"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());`,
          }}
        />
      </head>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
