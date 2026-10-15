'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { useT } from '@/components/i18n';

export function CopyEmail({ email }: { email: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <a href={`mailto:${email}`} dir="ltr" className="border-b border-white/30 pb-0.5 font-mono text-[17px] text-white hover:border-white">
        {email}
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(email);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            setCopied(false);
          }
        }}
        className="flex h-9 w-9 items-center justify-center border border-white/20 text-white/80 hover:bg-white/10"
        aria-label={copied ? t('Email address copied') : t('Copy email address')}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <span aria-live="polite" className="text-[13px] text-white/60">{copied ? t('Copied') : ''}</span>
    </div>
  );
}
