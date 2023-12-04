const withPWA = require('next-pwa');
const runtimeCaching = require('next-pwa/cache');

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
});
