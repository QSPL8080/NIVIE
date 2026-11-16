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
  title: "Best Luxury Interior Designers in Pune & PCMC | Nivie Designs",
  description:
    "Looking for 2, 3 or 4 BHK interior designers in Pune & PCMC? Nivie Designs offers premium luxury home interiors, modern designs and quality craftsmanship. Get your quotation today!",
  keywords: [
    "2 BHK interior designers Pune",
    "3 BHK interior designers Pune",
    "4 BHK interior designers Pune",
    "2 BHK interior designers PCMC",
    "3 BHK interior designers PCMC",
    "4 BHK interior designers PCMC",
    "luxury interior designers Pune",
    "luxury interior designers PCMC",
    "premium home interiors Pune",
    "premium home interiors PCMC",
    "luxury home interior design",
    "modern luxury home interiors",
    "luxury villa interior design Pune",
    "bungalow interior designers Pune",
    "high-end interior designers Pune",
    "home interior designers Pune and PCMC",
    "Nivie Designs",
  ],
  openGraph: {
    title: "Best Luxury Interior Designers in Pune & PCMC | Nivie Designs",
    description:
      "Looking for 2, 3 or 4 BHK interior designers in Pune & PCMC? Nivie Designs offers premium luxury home interiors, modern designs and quality craftsmanship. Get your quotation today!",
    url: site.url,
    siteName: "Nivie Designs",
    images: ["/images/rk-villa.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Luxury Interior Designers in Pune & PCMC | Nivie Designs",
    description:
      "Looking for 2, 3 or 4 BHK interior designers in Pune & PCMC? Nivie Designs offers premium luxury home interiors, modern designs and quality craftsmanship. Get your quotation today!",
    images: ["/images/rk-villa.jpg"],
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
    "Looking for 2, 3 or 4 BHK interior designers in Pune & PCMC? Nivie Designs offers premium luxury home interiors, modern designs and quality craftsmanship. Get your quotation today!",
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
