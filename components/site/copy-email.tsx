'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-3">
      <a href={`mailto:${email}`} className="border-b border-white/30 pb-0.5 text-[20px] font-semibold tracking-[-0.02em] text-white hover:border-white">
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
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
        aria-label={copied ? 'Email address copied' : 'Copy email address'}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </button>
      <span aria-live="polite" className="text-[13px] text-white/60">{copied ? 'Copied' : ''}</span>
    </div>
  );
}
