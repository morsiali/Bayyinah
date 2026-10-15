import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/cairo';
import './globals.css';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: { default: 'Bayyinah | بيّنة — evidence-backed payment decisions', template: '%s · Bayyinah' },
  description: 'Bayyinah helps small businesses in the UAE verify invoice payments, bank account changes and new beneficiaries — and record an evidence-backed human decision.',
  icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.svg` },
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
};

export const viewport: Viewport = { themeColor: '#fbfbfa', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-navy focus:px-4 focus:py-2 focus:text-white">
          Skip to content
        </a>
        {children}
        <Toaster position="top-center" richColors closeButton toastOptions={{ style: { fontFamily: 'inherit' } }} />
      </body>
    </html>
  );
}
