'use client';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui';
import { useT } from '@/components/i18n';

export function PrintButton() {
  const t = useT();
  return (
    <Button onClick={() => window.print()}>
      <Printer className="h-4 w-4" aria-hidden /> {t('Print or save as PDF')}
    </Button>
  );
}
