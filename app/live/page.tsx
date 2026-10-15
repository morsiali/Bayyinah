import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Github, MonitorPlay, Server } from 'lucide-react';
import { DocPageShell } from '@/components/site/doc-page';
import { LinkButton, Notice, buttonClass } from '@/components/ui';
import { getT } from '@/lib/i18n/server';
import { CODESPACES_URL, IS_STATIC_SITE, REPO_URL } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Open the live workspace') };
}

export default async function LivePage() {
  // On a real server the live workspace exists — go straight to sign-in.
  if (!IS_STATIC_SITE) redirect('/login');
  const { t } = await getT();
  const cards = [
    { icon: Github, h: t('GitHub Codespaces'), d: t('Runs the complete app in your browser on GitHub. First start takes about 5 minutes.'), href: CODESPACES_URL, cta: t('Open in Codespaces'), primary: true },
    { icon: MonitorPlay, h: t('Your Windows PC'), d: t('Download the code, double-click setup.bat, then start.bat.'), href: `${REPO_URL}#run-it-on-windows-5-minutes`, cta: t('Setup instructions') },
    { icon: Server, h: t('A server'), d: t('For a pilot with real users: Railway, Render or any VPS, with HTTPS and backups.'), href: `${REPO_URL}/blob/main/docs/OPERATIONS.md`, cta: t('Deployment guide') },
  ];
  return (
    <DocPageShell title={t('Open the live workspace')} subtitle={t('This public preview runs the website, the request check and Demo Mode in your browser.')} eyebrow={t('Live mode')}>
      <Notice tone="info" title={t('Why you’re seeing this')}>
        {t('Signing in, organizations, cases, AI analysis and reports need Bayyinah’s server and database, which a static GitHub Pages site cannot run. Start the full product in one of these ways:')}
      </Notice>
      <div className="mt-8 grid gap-px border border-line bg-line md:grid-cols-3">
        {cards.map((c) => (
          <div key={c.h} className="flex flex-col bg-white p-6">
            <c.icon className="h-6 w-6 text-brand-600" aria-hidden />
            <h2 className="mt-4 text-[18px] font-semibold uppercase">{c.h}</h2>
            <p className="mt-1 flex-1 text-[14px] text-ink-muted">{c.d}</p>
            <a href={c.href} className={buttonClass(c.primary ? 'primary' : 'secondary', 'md', 'mt-5 self-start')}>{c.cta}</a>
          </div>
        ))}
      </div>
      <div className="mt-10">
        <LinkButton href="/demo" variant="secondary">{t('Try Demo Mode instead')}</LinkButton>
      </div>
    </DocPageShell>
  );
}
