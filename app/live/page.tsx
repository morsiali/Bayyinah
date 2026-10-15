import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Github, MonitorPlay, Server } from 'lucide-react';
import { DocPageShell } from '@/components/site/doc-page';
import { LinkButton, Notice } from '@/components/ui';
import { CODESPACES_URL, IS_STATIC_SITE, REPO_URL } from '@/lib/site';

export const metadata: Metadata = { title: 'Open the live workspace' };

export default function LivePage() {
  // On a real server the live workspace exists — go straight to sign-in.
  if (!IS_STATIC_SITE) redirect('/login');
  return (
    <DocPageShell title="Open the live workspace" subtitle="This public preview runs the website, the request check and Demo Mode in your browser.">
      <Notice tone="info" title="Why you’re seeing this">
        Signing in, organizations, cases, AI analysis and reports need Bayyinah’s server and database, which a static GitHub Pages site cannot run. Start the full product in one of these ways:
      </Notice>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <div className="card p-6">
          <Github className="h-6 w-6 text-brand-600" aria-hidden />
          <h2 className="mt-4 text-[18px] font-bold">GitHub Codespaces</h2>
          <p className="mt-1 text-[14px] text-ink-muted">Runs the complete app in your browser on GitHub. First start takes about 5 minutes.</p>
          <a href={CODESPACES_URL} className="mt-4 inline-flex h-10 items-center rounded-full bg-navy px-5 text-[14px] font-semibold text-white hover:bg-navy-800">Open in Codespaces</a>
        </div>
        <div className="card p-6">
          <MonitorPlay className="h-6 w-6 text-brand-600" aria-hidden />
          <h2 className="mt-4 text-[18px] font-bold">Your Windows PC</h2>
          <p className="mt-1 text-[14px] text-ink-muted">Download the code, double-click <code className="font-mono">setup.bat</code>, then <code className="font-mono">start.bat</code>.</p>
          <a href={`${REPO_URL}#run-it-on-windows-5-minutes`} className="mt-4 inline-flex h-10 items-center rounded-full border border-line bg-white px-5 text-[14px] font-semibold shadow-pill hover:bg-zinc-50">Setup instructions</a>
        </div>
        <div className="card p-6">
          <Server className="h-6 w-6 text-brand-600" aria-hidden />
          <h2 className="mt-4 text-[18px] font-bold">A server</h2>
          <p className="mt-1 text-[14px] text-ink-muted">For a pilot with real users: Railway, Render or any VPS, with HTTPS and backups.</p>
          <a href={`${REPO_URL}/blob/main/docs/OPERATIONS.md`} className="mt-4 inline-flex h-10 items-center rounded-full border border-line bg-white px-5 text-[14px] font-semibold shadow-pill hover:bg-zinc-50">Deployment guide</a>
        </div>
      </div>
      <div className="mt-10">
        <LinkButton href="/demo" variant="secondary">Try Demo Mode instead</LinkButton>
      </div>
    </DocPageShell>
  );
}
