/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
  // Let `npm run dev` work when opened from another device on the same Wi-Fi
  // (e.g. http://192.168.1.5:3000). Without this, Next.js blocks its own dev
  // scripts for network addresses and the page never becomes interactive.
  allowedDevOrigins: ["192.*.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  devIndicators: false,
  // Short / old addresses for the legal pages all land on the proper page.
  // (Matching ignores letter case; capitalised URLs are lower-cased in proxy.js.)
  async redirects() {
    const to = {
      "/privacy-policy": ["/privacy", "/privacy-policy.php", "/privacypolicy"],
      "/terms-and-conditions": ["/terms", "/terms-conditions", "/terms-and-conditions.php", "/terms.php"],
      "/cookie-policy": ["/cookies", "/cookie-policy.php"],
    };
    return Object.entries(to).flatMap(([destination, sources]) =>
      sources.map((source) => ({ source, destination, permanent: true }))
    );
  },
};

export default nextConfig;
