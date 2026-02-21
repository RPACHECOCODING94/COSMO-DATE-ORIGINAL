import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, maximum-scale=1, user-scalable=no" />
        
        {/* PWA Meta Tags */}
        <meta name="theme-color" content="#0A0A1A" />
        <meta name="background-color" content="#0A0A1A" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Cosmo Date" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Cosmo Date" />
        <meta name="msapplication-TileColor" content="#0A0A1A" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* SEO */}
        <meta name="description" content="Cosmo Date - Encuentra tu conexión celestial basada en compatibilidad zodiacal. Exclusivo para Hermosillo, Sonora." />
        <meta name="keywords" content="dating, zodiac, citas, hermosillo, sonora, compatibilidad, horoscopo" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        
        {/* Icons */}
        <link rel="icon" type="image/png" href="/assets/images/favicon.png" />
        <link rel="apple-touch-icon" href="/assets/images/icon.png" />
        
        <title>Cosmo Date - Encuentra tu conexión celestial</title>
        
        <ScrollViewStyleReset />
        
        <style dangerouslySetInnerHTML={{ __html: `
          html, body {
            margin: 0;
            padding: 0;
            height: 100%;
            width: 100%;
            background-color: #0A0A1A;
            overflow: hidden;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          #root {
            display: flex;
            flex-direction: column;
            height: 100%;
            width: 100%;
          }
          * {
            box-sizing: border-box;
            -webkit-tap-highlight-color: transparent;
          }
          input, textarea, button {
            font-family: inherit;
          }
        `}} />
      </head>
      <body>{children}</body>
    </html>
  );
}
