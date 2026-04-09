import type { Metadata } from 'next';
import { fraunces, manrope, notoSerif } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'DQFB Business',
  description: 'Estratégia, gestão, comunicação e ferramentas integradas em um ecossistema de alta performance.',
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
        {children}
      </body>
    </html>
  );
}
