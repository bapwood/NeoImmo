import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NeoImmo | L\'investissement immobilier fractionné',
  description: 'Découvrez notre plateforme de tokenisation de biens immobiliers. Investissez facilement grâce à la blockchain.',
  keywords: ['immobilier', 'blockchain', 'tokenisation', 'investissement'],
  openGraph: {
    title: 'NeoImmo',
    description: 'L\'investissement immobilier fractionné',
    url: 'https://neoimmo.space',
    siteName: 'NeoImmo',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}