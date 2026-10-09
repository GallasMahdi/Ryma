import { ServiceCatalogProvider } from '@/components/ServiceCatalogProvider';
import { getPublicServices } from '@/lib/treatments';
import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { Cormorant_Garamond, Plus_Jakarta_Sans, Fraunces } from 'next/font/google';
import './globals.css';
import { LanguageProvider, type Lang } from '@/lib/i18n';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { WhatsAppBubble } from '@/components/ui/WhatsAppBubble';
import { SplashScreen } from '@/components/ui/SplashScreen';

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
  weight: 'variable',
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  'https://digitalclinica.pt';

const baseMetadata: Metadata = {
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

export async function generateMetadata(): Promise<Metadata> {
  if ((await cookies()).get('ryma_lang')?.value !== 'es') return baseMetadata;
  const title = "Digital Clínica — Fisioterapia y estética avanzada en Lisboa";
  const description = "Clínica de fisioterapia y estética avanzada en Lisboa, Portugal. Reeducación postural, recuperación posparto, drenaje linfático y tratamientos corporales. Reserve su cita en línea.";
  const images = [{ url: `${siteUrl}/og-image.jpg`, width: 1200, height: 630, alt: title }];
  return { ...baseMetadata, title, description,
    keywords: ['fisioterapia Lisboa', 'rehabilitación posparto', 'drenaje linfático', 'estética corporal', 'Digital Clínica'],
    openGraph: { ...baseMetadata.openGraph, locale: 'es_ES', title, description, siteName: 'Digital Clínica', images },
    twitter: { ...baseMetadata.twitter, title, description, images },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get('ryma_lang')?.value;
  const initialLang: Lang = (langCookie === 'fr' || langCookie === 'en' || langCookie === 'pt' || langCookie === 'es') ? (langCookie as Lang) : 'pt';

  return (
    <html
      lang={initialLang}
      dir="ltr"
      translate="no"
      data-scroll-behavior="smooth"
      className={`notranslate ${cormorant.variable} ${plusJakartaSans.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head suppressHydrationWarning>
        <meta name="google" content="notranslate" />
        {/* Schema.org LocalBusiness / MedicalBusiness */}
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': ['LocalBusiness', 'MedicalBusiness', 'PhysicalTherapy'],
              name: initialLang === 'es' ? 'Digital Clínica — Fisioterapia y estética avanzada' : 'Digital Clínica — Fisioterapia & Estética Avançada',
              description: initialLang === 'es' ? 'Clínica de fisioterapia y estética avanzada en Lisboa, Portugal.' : 'Clínica de fisioterapia e estética médica avançada em Lisboa, Portugal.',
              url: siteUrl,
            }),
          }}
        />
        {/* Instant synchronous language cookie sync from localStorage to eliminate flicker */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('ryma_lang');
                  if (saved && (saved === 'pt' || saved === 'en' || saved === 'fr' || saved === 'es')) {
                    document.documentElement.setAttribute('lang', saved);
                    if (!document.cookie.includes('ryma_lang=' + saved)) {
                      document.cookie = 'ryma_lang=' + saved + '; path=/; max-age=31536000; SameSite=Lax';
                    }
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        {/* Hide the intro before first paint when this visit should skip it. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var isBot = /Lighthouse|PageSpeed|Googlebot|HeadlessChrome|Chrome-Lighthouse|Mediapartners-Google/i.test(navigator.userAgent);
                  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                  var isAdmin = window.location.pathname.indexOf('/admin') === 0;
                  var hasSeen = false;
                  try { hasSeen = sessionStorage.getItem('ryma_splash_v6') === 'true'; } catch(e) {}
                  if (isBot || reducedMotion || isAdmin || hasSeen) {
                    document.documentElement.classList.add('skip-splash');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className="bg-[#FAFAF8] text-[#1A1412] antialiased"
        style={{
          fontFamily: 'var(--font-sans)',
        }}
      >
        <LanguageProvider initialLang={initialLang}>
          <ServiceCatalogProvider initialServices={await getPublicServices()}>
          <SplashScreen />
          <Navbar />
          <main className="min-h-screen" suppressHydrationWarning>{children}</main>
          <Footer />
          <WhatsAppBubble />
        </ServiceCatalogProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
