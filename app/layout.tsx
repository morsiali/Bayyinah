import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/cairo';
import './globals.css';
import { Toaster } from 'sonner';
import { I18nProvider } from '@/components/i18n';
import { dirOf } from '@/lib/i18n/core';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: { default: t('Bayyinah | بيّنة — evidence-backed payment decisions'), template: t('%s · Bayyinah') },
    description: t('Bayyinah helps small businesses in the UAE verify invoice payments, bank account changes and new beneficiaries — and record an evidence-backed human decision.'),
    icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.svg` },
    metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  };
}

export const viewport: Viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getT();
  const dir = dirOf(locale);
  return (
    <html lang={locale} dir={dir}>
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:bg-navy focus:px-4 focus:py-2 focus:text-white">
          {t('Skip to content')}
        </a>
        <I18nProvider locale={locale}>
          {children}
          <Toaster position="top-center" dir={dir} richColors closeButton toastOptions={{ style: { fontFamily: 'inherit', borderRadius: 4 } }} />
        </I18nProvider>
      </body>
    </html>
  );
}
