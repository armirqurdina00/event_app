if (!self.define) {
  let e,
    i = {};
  const t = (t, o) => (
    (t = new URL(t + '.js', o).href),
    i[t] ||
      new Promise((i) => {
        if ('document' in self) {
          const e = document.createElement('script');
          (e.src = t), (e.onload = i), document.head.appendChild(e);
        } else (e = t), importScripts(t), i();
      }).then(() => {
        let e = i[t];
        if (!e) throw new Error(`Module ${t} didn’t register its module`);
        return e;
      })
  );
  self.define = (o, a) => {
    const n =
      e ||
      ('document' in self ? document.currentScript.src : '') ||
      location.href;
    if (i[n]) return;
    let s = {};
    const r = (e) => t(e, n),
      c = { module: { uri: n }, exports: s, require: r };
    i[n] = Promise.all(o.map((e) => c[e] || r(e))).then((e) => (a(...e), s));
  };
}
define(['./workbox-7c2a5a06'], function (e) {
  'use strict';
  importScripts(),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/_next/static/OExvpQ69_vzvYGrBZhyiW/_buildManifest.js',
          revision: 'a96b8e0488919b207afbe536ec6666c9',
        },
        {
          url: '/_next/static/OExvpQ69_vzvYGrBZhyiW/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        {
          url: '/_next/static/chunks/154-d2d8b40d3c2fe431.js',
          revision: 'd2d8b40d3c2fe431',
        },
        {
          url: '/_next/static/chunks/2bd5012a-c3ff600b87a2c9e0.js',
          revision: 'c3ff600b87a2c9e0',
        },
        {
          url: '/_next/static/chunks/417-be9955b0056ef559.js',
          revision: 'be9955b0056ef559',
        },
        {
          url: '/_next/static/chunks/513-0235f8b0d469052e.js',
          revision: '0235f8b0d469052e',
        },
        {
          url: '/_next/static/chunks/536-fd986417111973b2.js',
          revision: 'fd986417111973b2',
        },
        {
          url: '/_next/static/chunks/664-0356555cfd50fb3d.js',
          revision: '0356555cfd50fb3d',
        },
        {
          url: '/_next/static/chunks/75fc9c18-165f0fc0c463a090.js',
          revision: '165f0fc0c463a090',
        },
        {
          url: '/_next/static/chunks/848-a085bf395427e4a5.js',
          revision: 'a085bf395427e4a5',
        },
        {
          url: '/_next/static/chunks/903-72a809ba74f51895.js',
          revision: '72a809ba74f51895',
        },
        {
          url: '/_next/static/chunks/914-a424dcff83600f6e.js',
          revision: 'a424dcff83600f6e',
        },
        {
          url: '/_next/static/chunks/994-1b32aa9ec6f04c28.js',
          revision: '1b32aa9ec6f04c28',
        },
        {
          url: '/_next/static/chunks/framework-0c7baedefba6b077.js',
          revision: '0c7baedefba6b077',
        },
        {
          url: '/_next/static/chunks/main-6c45502c5e10e86f.js',
          revision: '6c45502c5e10e86f',
        },
        {
          url: '/_next/static/chunks/pages/_app-935725bfc6ac1fb8.js',
          revision: '935725bfc6ac1fb8',
        },
        {
          url: '/_next/static/chunks/pages/_error-ee5b5fb91d29d86f.js',
          revision: 'ee5b5fb91d29d86f',
        },
        {
          url: '/_next/static/chunks/pages/events-e3c22e23b6562843.js',
          revision: 'e3c22e23b6562843',
        },
        {
          url: '/_next/static/chunks/pages/events/%5Bevent_id%5D-18d290b30d39bec1.js',
          revision: '18d290b30d39bec1',
        },
        {
          url: '/_next/static/chunks/pages/events/location-f66c88232b6fc56a.js',
          revision: 'f66c88232b6fc56a',
        },
        {
          url: '/_next/static/chunks/pages/events/new-9c827833a747e19d.js',
          revision: '9c827833a747e19d',
        },
        {
          url: '/_next/static/chunks/pages/groups-01c5fdb003230e6f.js',
          revision: '01c5fdb003230e6f',
        },
        {
          url: '/_next/static/chunks/pages/groups/%5Bgroup_id%5D-3c905db8429478ab.js',
          revision: '3c905db8429478ab',
        },
        {
          url: '/_next/static/chunks/pages/groups/location-06eb950138cbdc55.js',
          revision: '06eb950138cbdc55',
        },
        {
          url: '/_next/static/chunks/pages/groups/new-3807dd981810d4a3.js',
          revision: '3807dd981810d4a3',
        },
        {
          url: '/_next/static/chunks/pages/imprint-41d53cdac40b009e.js',
          revision: '41d53cdac40b009e',
        },
        {
          url: '/_next/static/chunks/polyfills-c67a75d1b6f99dc8.js',
          revision: '837c0df77fd5009c9e46d446188ecfd0',
        },
        {
          url: '/_next/static/chunks/webpack-c21fd345984bfc83.js',
          revision: 'c21fd345984bfc83',
        },
        {
          url: '/_next/static/css/cc364cd7f44feb0c.css',
          revision: 'cc364cd7f44feb0c',
        },
        {
          url: '/_next/static/css/dbd0971ccba6eb8f.css',
          revision: 'dbd0971ccba6eb8f',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-300-normal.17dc3449.woff',
          revision: '17dc3449',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-300-normal.88798412.woff2',
          revision: '88798412',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-400-normal.19f93502.woff',
          revision: '19f93502',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-400-normal.2d9c9d60.woff2',
          revision: '2d9c9d60',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-500-normal.6e4060e5.woff',
          revision: '6e4060e5',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-500-normal.aa68ea54.woff2',
          revision: 'aa68ea54',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-700-normal.1ea775f3.woff',
          revision: '1ea775f3',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-700-normal.258a358e.woff2',
          revision: '258a358e',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-ext-300-normal.cd7c5715.woff2',
          revision: 'cd7c5715',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-ext-300-normal.de365ce5.woff',
          revision: 'de365ce5',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-ext-400-normal.02e18372.woff',
          revision: '02e18372',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-ext-400-normal.d7827ae3.woff2',
          revision: 'd7827ae3',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-ext-500-normal.a05054d8.woff',
          revision: 'a05054d8',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-ext-500-normal.a1b5c90d.woff2',
          revision: 'a1b5c90d',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-ext-700-normal.46ca43b3.woff',
          revision: '46ca43b3',
        },
        {
          url: '/_next/static/media/roboto-cyrillic-ext-700-normal.dd3651fb.woff2',
          revision: 'dd3651fb',
        },
        {
          url: '/_next/static/media/roboto-greek-300-normal.122e04f2.woff',
          revision: '122e04f2',
        },
        {
          url: '/_next/static/media/roboto-greek-300-normal.25dc89b0.woff2',
          revision: '25dc89b0',
        },
        {
          url: '/_next/static/media/roboto-greek-400-normal.63e6dc18.woff2',
          revision: '63e6dc18',
        },
        {
          url: '/_next/static/media/roboto-greek-400-normal.e3b5876b.woff',
          revision: 'e3b5876b',
        },
        {
          url: '/_next/static/media/roboto-greek-500-normal.533b03d2.woff2',
          revision: '533b03d2',
        },
        {
          url: '/_next/static/media/roboto-greek-500-normal.55bbf615.woff',
          revision: '55bbf615',
        },
        {
          url: '/_next/static/media/roboto-greek-700-normal.432b858b.woff2',
          revision: '432b858b',
        },
        {
          url: '/_next/static/media/roboto-greek-700-normal.b3d9786c.woff',
          revision: 'b3d9786c',
        },
        {
          url: '/_next/static/media/roboto-greek-ext-300-normal.69dd9b06.woff',
          revision: '69dd9b06',
        },
        {
          url: '/_next/static/media/roboto-greek-ext-300-normal.bc5ce703.woff2',
          revision: 'bc5ce703',
        },
        {
          url: '/_next/static/media/roboto-greek-ext-400-normal.2b547ded.woff2',
          revision: '2b547ded',
        },
        {
          url: '/_next/static/media/roboto-greek-ext-400-normal.d17f5f2b.woff',
          revision: 'd17f5f2b',
        },
        {
          url: '/_next/static/media/roboto-greek-ext-500-normal.7ea6cffa.woff2',
          revision: '7ea6cffa',
        },
        {
          url: '/_next/static/media/roboto-greek-ext-500-normal.fcc37f63.woff',
          revision: 'fcc37f63',
        },
        {
          url: '/_next/static/media/roboto-greek-ext-700-normal.950178dd.woff',
          revision: '950178dd',
        },
        {
          url: '/_next/static/media/roboto-greek-ext-700-normal.a8d16efd.woff2',
          revision: 'a8d16efd',
        },
        {
          url: '/_next/static/media/roboto-latin-300-normal.73b81266.woff',
          revision: '73b81266',
        },
        {
          url: '/_next/static/media/roboto-latin-300-normal.a4eae32d.woff2',
          revision: 'a4eae32d',
        },
        {
          url: '/_next/static/media/roboto-latin-400-normal.d6d4cf7b.woff',
          revision: 'd6d4cf7b',
        },
        {
          url: '/_next/static/media/roboto-latin-400-normal.f2894edc.woff2',
          revision: 'f2894edc',
        },
        {
          url: '/_next/static/media/roboto-latin-500-normal.3170fd9a.woff2',
          revision: '3170fd9a',
        },
        {
          url: '/_next/static/media/roboto-latin-500-normal.cdad2023.woff',
          revision: 'cdad2023',
        },
        {
          url: '/_next/static/media/roboto-latin-700-normal.71b2beb8.woff2',
          revision: '71b2beb8',
        },
        {
          url: '/_next/static/media/roboto-latin-700-normal.f3ddaf9d.woff',
          revision: 'f3ddaf9d',
        },
        {
          url: '/_next/static/media/roboto-latin-ext-300-normal.37d4965d.woff2',
          revision: '37d4965d',
        },
        {
          url: '/_next/static/media/roboto-latin-ext-300-normal.b9b4688a.woff',
          revision: 'b9b4688a',
        },
        {
          url: '/_next/static/media/roboto-latin-ext-400-normal.21abc8c8.woff2',
          revision: '21abc8c8',
        },
        {
          url: '/_next/static/media/roboto-latin-ext-400-normal.9600b4a6.woff',
          revision: '9600b4a6',
        },
        {
          url: '/_next/static/media/roboto-latin-ext-500-normal.41845160.woff',
          revision: '41845160',
        },
        {
          url: '/_next/static/media/roboto-latin-ext-500-normal.85ebfb55.woff2',
          revision: '85ebfb55',
        },
        {
          url: '/_next/static/media/roboto-latin-ext-700-normal.6af98c24.woff2',
          revision: '6af98c24',
        },
        {
          url: '/_next/static/media/roboto-latin-ext-700-normal.b6be88e2.woff',
          revision: 'b6be88e2',
        },
        {
          url: '/_next/static/media/roboto-vietnamese-300-normal.44e9a722.woff',
          revision: '44e9a722',
        },
        {
          url: '/_next/static/media/roboto-vietnamese-300-normal.b3d3e960.woff2',
          revision: 'b3d3e960',
        },
        {
          url: '/_next/static/media/roboto-vietnamese-400-normal.b339d926.woff',
          revision: 'b339d926',
        },
        {
          url: '/_next/static/media/roboto-vietnamese-400-normal.c95fc061.woff2',
          revision: 'c95fc061',
        },
        {
          url: '/_next/static/media/roboto-vietnamese-500-normal.65b57a7f.woff',
          revision: '65b57a7f',
        },
        {
          url: '/_next/static/media/roboto-vietnamese-500-normal.7f8c0554.woff2',
          revision: '7f8c0554',
        },
        {
          url: '/_next/static/media/roboto-vietnamese-700-normal.72bf832f.woff2',
          revision: '72bf832f',
        },
        {
          url: '/_next/static/media/roboto-vietnamese-700-normal.82ca662a.woff',
          revision: '82ca662a',
        },
        {
          url: '/images/favicon.png',
          revision: 'a638609052e814c7de237cea24ca9a96',
        },
        {
          url: '/images/icon-192.png',
          revision: 'a638609052e814c7de237cea24ca9a96',
        },
        {
          url: '/images/icon-512.png',
          revision: '5b5b6dc289f091307b719e1aec87632b',
        },
        {
          url: '/images/maskable-icon-192.png',
          revision: '5fe1ee9c55e4900e609024363fb6cf7f',
        },
        { url: '/manifest.json', revision: '8e0dd658be680d426d7cac222139af0c' },
      ],
      { ignoreURLParametersMatching: [] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({
              request: e,
              response: i,
              event: t,
              state: o,
            }) =>
              i && 'opaqueredirect' === i.type
                ? new Response(i.body, {
                    status: 200,
                    statusText: 'OK',
                    headers: i.headers,
                  })
                : i,
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp4)$/i,
      new e.CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: 'static-data-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        const i = e.pathname;
        return !i.startsWith('/api/auth/') && !!i.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: e }) => {
        if (!(self.origin === e.origin)) return !1;
        return !e.pathname.startsWith('/api/');
      },
      new e.NetworkFirst({
        cacheName: 'others',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: e }) => !(self.origin === e.origin),
      new e.NetworkFirst({
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
        ],
      }),
      'GET'
    );
});
