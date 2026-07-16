import type { Metadata } from 'next';
import { Source_Sans_3, Fraunces } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const sourceSans = Source_Sans_3({
  subsets: ['latin'],
  variable: '--font-source',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
});

export const metadata: Metadata = {
  title: 'CloserAI — AI Sales Call Closer',
  description: 'Outbound sales calling, qualification, and meeting booking powered by Retell AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sourceSans.variable} ${fraunces.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
