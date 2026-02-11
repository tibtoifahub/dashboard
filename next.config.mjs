/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Уменьшает размер деплоя на хостинг: создаётся .next/standalone с server.js
  output: "standalone"
};

export default nextConfig;