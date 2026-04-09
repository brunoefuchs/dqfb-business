import type { Metadata, Viewport } from 'next';
import { fraunces, manrope, notoSerif } from '@/lib/fonts';
import './globals.css';

const title = 'DQFB Business — Controle DQFB';
const description =
  'Estratégia, gestão, comunicação e ferramentas integradas em um ecossistema de alta performance.';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.businessdqfb.francielecaleffi.com.br'),
  title: {
    default: title,
    template: '%s | DQFB Business',
  },
  description,
  applicationName: 'DQFB Business',
  authors: [{ name: 'DQFB Business' }],
  keywords: [
    'DQFB',
    'gestão empresarial',
    'transcrição',
    'financeiro',
    'business intelligence',
    'curadoria editorial',
  ],
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: '/',
    siteName: 'DQFB Business',
    title,
    description,
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'DQFB Business — Controle DQFB',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/icon',
    apple: '/apple-icon',
  },
};

export const viewport: Viewport = {
  themeColor: '#680114',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className={`${fraunces.variable} ${manrope.variable} ${notoSerif.variable}`}>
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-on-background min-h-screen flex flex-col overflow-x-hidden font-body">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-primary focus:text-white focus:px-4 focus:py-2"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
