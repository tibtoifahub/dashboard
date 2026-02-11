/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Standalone режим для деплоя на VPS - создаёт минимальный .next/standalone
  output: "standalone"
};

export default nextConfig;