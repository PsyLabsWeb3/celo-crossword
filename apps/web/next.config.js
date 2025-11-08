/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  // Explicitly enable Turbopack config to avoid the error
  turbopack: {},
};

module.exports = nextConfig;
