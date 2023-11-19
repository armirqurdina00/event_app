import Head from 'next/head';

const Meta = () => (
  <Head>
    <title key="title">
      SaBaKi - Salsa, Bachata und Kizomba Events und Gruppen in deiner Stadt
    </title>
    <meta charSet="utf-8" key="charset" />
    <meta
      name="mobile-web-app-capable"
      content="yes"
      key="mobile-web-app-capable"
    />
    <meta
      name="apple-mobile-web-app-capable"
      content="yes"
      key="apple-mobile-web-app-capable"
    />
    <meta
      name="apple-mobile-web-app-status-bar-style"
      content="black-translucent"
      key="apple-mobile-web-app-status-bar-style"
    />
    <meta
      name="apple-mobile-web-app-title"
      content="SaBaKi"
      key="apple-mobile-web-app-title"
    />
    <meta name="application-name" content="SaBaKi" key="application-name" />
    <meta
      name="description"
      content="Salsa, Bachata und Kizomba Events und Gruppen in deiner Stadt."
      key="description"
    />
    <meta
      name="theme-color"
      content="#f4f4f5"
      media="(prefers-color-scheme: light)"
      key="theme-color-light"
    />
    <meta
      name="theme-color"
      content="#18181b"
      media="(prefers-color-scheme: dark)"
      key="theme-color-dark"
    />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, user-scalable=0, viewport-fit=cover"
      key="viewport"
    />
    <link
      rel="apple-touch-icon"
      href="/images/icon-maskable-512.png"
      key="apple-touch-icon"
    />
    <link rel="icon" type="image/png" href="/images/favicon.png" key="icon" />
    <link rel="manifest" href="/manifest.json" key="manifest" />
  </Head>
);

export default Meta;
