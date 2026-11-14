/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
  // Let `npm run dev` work when opened from another device on the same Wi-Fi
  // (e.g. http://192.168.1.5:3000). Without this, Next.js blocks its own dev
  // scripts for network addresses and the page never becomes interactive.
  allowedDevOrigins: ["192.*.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  devIndicators: false,
};

export default nextConfig;
