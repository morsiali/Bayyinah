import type { Metadata } from 'next';
import { DocPage } from '@/components/site/doc-page';
import { getT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t('Terms of use (draft)') };
}

export default async function TermsPage() {
  const { t } = await getT();
  return (
    <DocPage title={t('Terms of use')} updated={t('October 2026')}>
      <section>
        <h2>{t('What the service is')}</h2>
        <p>{t('Bayyinah is a workflow tool that helps an organization document how it verified a payment-related request and who decided on it. It supports verification and decision documentation only.')}</p>
      </section>
      <section>
        <h2>{t('What the service is not')}</h2>
        <ul>
          <li>{t('It does not execute payments, authorize bank transfers or connect to banks.')}</li>
          <li>{t('It does not prove who owns a bank account. A valid IBAN format does not establish ownership, and matching reference details do not prove authenticity.')}</li>
          <li>{t('It does not guarantee that fraud will be detected. AI findings are indicators for a person to consider, not conclusions.')}</li>
          <li>{t('An approval recorded in Bayyinah is a decision within your own workflow, made by your authorized reviewer.')}</li>
        </ul>
      </section>
      <section>
        <h2>{t('Your responsibilities')}</h2>
        <ul>
          <li>{t('Keep supplier reference records accurate and sourced from approved records.')}</li>
          <li>{t('Perform independent verification through established channels and record outcomes truthfully.')}</li>
          <li>{t('Give each person their own account; do not share logins.')}</li>
          <li>{t('Upload only content you are entitled to process.')}</li>
        </ul>
      </section>
      <section>
        <h2>{t('Pilot status')}</h2>
        <p>{t('The service is offered as a pilot. Features, limits and these terms may change. Commercial terms, liability and governing law must be settled with legal counsel before commercial use.')}</p>
      </section>
    </DocPage>
  );
}
