import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter, IBM_Plex_Mono } from 'next/font/google';
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

const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  weight: ['400', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ibm-plex-mono',
  weight: ['400', '600'],
});

export const metadata: Metadata = {
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
    siteName: 'Digital Clínica — Fisioterapia & Estética Avançada',
    title: 'Digital Clínica — Fisioterapia & Estética Avançada em Lisboa',
    description:
      'Clínica especializada em Lisboa, Portugal. Fisioterapia médica, reabilitação do pavimento pélvico, tratamentos corporais não invasivos.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
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
    <html lang="pt-PT" dir="ltr" className={`${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable}`}>
      <head>
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
                  var hasSeen = sessionStorage.getItem('ryma_splash_v2') === 'true';
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
        className="bg-[#FAFAF8] text-[#1A1412] antialiased"
        style={{
          fontFamily: 'var(--font-inter), system-ui, sans-serif',
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
