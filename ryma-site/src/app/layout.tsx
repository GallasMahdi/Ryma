import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Plus_Jakarta_Sans, Fraunces } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { SplashScreen } from '@/components/ui/SplashScreen';
import { WhatsAppBubble } from '@/components/ui/WhatsAppBubble';

export const viewport: Viewport = {
  themeColor: '#0F172A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-cormorant',
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  weight: ['400', '600', '700'],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  'https://digitalclinica.pt';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'Digital Clínica — Fisioterapia & Estética Avançada em Lisboa',
    template: '%s | Digital Clínica',
  },
  description:
    'Clínica de fisioterapia e tratamentos estéticos avançados em Lisboa, Portugal. Reeducação postural (RPG), recuperação pós-parto, drenagem linfática, cavitação, radiofrequência e criolipólise. Marcação online de consultas.',
  keywords: [
    'fisioterapia Lisboa',
    'fisioterapeuta Lisboa',
    'reabilitação pós-parto Lisboa',
    'drenagem linfática manual Lisboa',
    'cavitação Lisboa',
    'radiofrequência Lisboa',
    'criolipólise Lisboa',
    'Digital Clínica',
    'clínica fisioterapia Portugal',
  ],
  authors: [{ name: 'Digital Clínica' }],
  creator: 'Digital Clínica',
  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    url: siteUrl,
    siteName: 'Digital Clínica — Fisioterapia & Estética Avançada',
    title: 'Digital Clínica — Fisioterapia & Estética Avançada em Lisboa',
    description:
      'Clínica especializada em Lisboa, Portugal. Fisioterapia médica, reabilitação do pavimento pélvico, tratamentos corporais não invasivos.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        secureUrl: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Digital Clínica — Fisioterapia & Estética Avançada em Lisboa',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Digital Clínica — Fisioterapia & Estética Avançada em Lisboa',
    description:
      'Clínica especializada em Lisboa, Portugal. Fisioterapia médica, reabilitação do pavimento pélvico, tratamentos corporais não invasivos.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        alt: 'Digital Clínica — Fisioterapia & Estética Avançada em Lisboa',
        width: 1200,
        height: 630,
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="pt-PT"
      dir="ltr"
      translate="no"
      className={`notranslate ${cormorant.variable} ${plusJakartaSans.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="google" content="notranslate" />
        {/* Schema.org LocalBusiness / MedicalBusiness */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': ['LocalBusiness', 'MedicalBusiness', 'PhysicalTherapy'],
              name: 'Digital Clínica — Fisioterapia & Estética Avançada',
              description: 'Clínica de fisioterapia e estética médica avançada em Lisboa, Portugal.',
              url: 'https://digitalclinica.pt',
              telephone: '+351912345678',
              email: 'contacto@digitalclinica.pt',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Avenida da Liberdade 120',
                addressLocality: 'Lisboa',
                postalCode: '1250-146',
                addressCountry: 'PT',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 38.7196,
                longitude: -9.1449,
              },
              openingHoursSpecification: [
                {
                  '@type': 'OpeningHoursSpecification',
                  dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                  opens: '08:30',
                  closes: '19:00',
                },
              ],
              priceRange: '€€',
            }),
          }}
        />
        {/* Instant synchronous check: skip splash for bots, reduced motion, or returning users without flashing */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var isBot = /Lighthouse|PageSpeed|Googlebot|HeadlessChrome|Chrome-Lighthouse|Mediapartners-Google/i.test(navigator.userAgent) || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
                  var hasSeen = sessionStorage.getItem('ryma_splash_v6') === 'true';
                  var isAdmin = window.location.pathname.indexOf('/admin') === 0;
                  if (isBot || hasSeen || isAdmin) {
                    document.documentElement.classList.add('skip-splash');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        {/* Google Analytics placeholder */}
        {/* TODO: Add your GA4 script here: G-XXXXXXXXXX */}
      </head>
      <body
        suppressHydrationWarning
        className="bg-[#FAFAF8] text-[#1A1412] antialiased"
        style={{
          fontFamily: 'var(--font-sans)',
        }}
      >
        <LanguageProvider>
          <SplashScreen />
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <Footer />
          <WhatsAppBubble />
        </LanguageProvider>
      </body>
    </html>
  );
}
