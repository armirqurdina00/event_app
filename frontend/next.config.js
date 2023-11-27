const withPWA = require('next-pwa');
const runtimeCaching = require('next-pwa/cache');
const { i18n } = require('./next-i18next.config');

const withMyPWA = withPWA({
  dest: 'public',
  runtimeCaching,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withMyPWA({
  output: 'standalone',
  images: {
    domains: ['res.cloudinary.com'],
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/events',
      },
    ];
  },
  i18n,
});
