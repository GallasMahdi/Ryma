import type { Metadata } from 'next';

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : undefined) ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
  'https://digitalclinica.pt';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'Acesso Admin — Digital Clínica',
  description: 'Painel de administração seguro da Digital Clínica. Acesso exclusivo para equipa autorizada.',
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_PT',
    url: `${siteUrl}/admin/login`,
    siteName: 'Digital Clínica — Admin',
    title: 'Digital Clínica — Acesso Admin',
    description: 'Painel de administração seguro. Acesso exclusivo para equipa autorizada.',
    images: [
      {
        url: `${siteUrl}/og-admin-login.jpg`,
        secureUrl: `${siteUrl}/og-admin-login.jpg`,
        width: 1200,
        height: 630,
        alt: 'Digital Clínica — Acesso Admin Seguro',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Digital Clínica — Acesso Admin',
    description: 'Painel de administração seguro. Acesso exclusivo para equipa autorizada.',
    images: [
      {
        url: `${siteUrl}/og-admin-login.jpg`,
        alt: 'Digital Clínica — Acesso Admin Seguro',
        width: 1200,
        height: 630,
      },
    ],
  },
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
