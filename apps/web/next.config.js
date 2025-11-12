/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  },
  // Disable Turbopack and use Webpack instead
  experimental: {
    turbo: {
      enabled: false
    }
  }
};

module.exports = nextConfig;
