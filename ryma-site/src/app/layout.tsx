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
    default: 'Ryma Ouichka — Kinésithérapie & Soins Minceur à Ezzahra',
    template: '%s | Ryma Ouichka',
  },
  description:
    'Cabinet de kinésithérapie et de soins minceur à Ezzahra, Tunisie. Rééducation posturale, post-partum, cavitation, radiofréquence, cryolipolyse. Prise de rendez-vous en ligne.',
  keywords: [
    'kinésithérapie Ezzahra',
    'kiné Tunisie',
    'rééducation post-partum',
    'cavitation Tunisie',
    'minceur Ezzahra',
    'radiofréquence',
    'cryolipolyse',
    'Ryma Ouichka',
  ],
  authors: [{ name: 'Ryma Ouichka' }],
  creator: 'Ryma Ouichka',
  openGraph: {
    type: 'website',
    locale: 'fr_TN',
    siteName: 'Ryma Ouichka — Kinésithérapie & Minceur',
    title: 'Ryma Ouichka — Kinésithérapie & Soins Minceur à Ezzahra',
    description:
      'Cabinet spécialisé à Ezzahra, Tunisie. Kinésithérapie thérapeutique, rééducation post-partum, soins minceur non-invasifs (cavitation, RF, cryolipolyse).',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" dir="ltr" className={`${fraunces.variable} ${inter.variable} ${ibmPlexMono.variable}`}>
      <head>
        {/* Schema.org LocalBusiness */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': ['LocalBusiness', 'MedicalBusiness'],
              name: 'Ryma Ouichka — Kinésithérapie & Minceur',
              description: 'Cabinet de kinésithérapie et soins minceur à Ezzahra, Tunisie.',
              url: 'https://ryma-ouichka.tn',
              telephone: '+21671800123',
              email: 'contact@ryma-ouichka.tn',
              address: {
                '@type': 'PostalAddress',
                streetAddress: 'Av. Habib Bourguiba',
                addressLocality: 'Ezzahra',
                postalCode: '2034',
                addressCountry: 'TN',
              },
              geo: {
                '@type': 'GeoCoordinates',
                latitude: 36.7611,
                longitude: 10.2786,
              },
              openingHoursSpecification: [
                {
                  '@type': 'OpeningHoursSpecification',
                  dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                  opens: '08:30',
                  closes: '18:30',
                },
              ],
              priceRange: '$$',
            }),
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
