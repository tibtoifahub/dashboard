/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Уменьшает размер деплоя на хостинг: создаётся .next/standalone с server.js
  output: "standalone",
  // Настройки для работы за HTTPS прокси
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  }
};

export default nextConfig;