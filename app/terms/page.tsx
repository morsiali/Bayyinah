import type { Metadata } from 'next';
import { DocPage } from '@/components/site/doc-page';

export const metadata: Metadata = { title: 'Terms of use (draft)' };

export default function TermsPage() {
  return (
    <DocPage title="Terms of use" updated="October 2026">
      <section>
        <h2>What the service is</h2>
        <p>Bayyinah is a workflow tool that helps an organization document how it verified a payment-related request and who decided on it. It supports verification and decision documentation only.</p>
      </section>
      <section>
        <h2>What the service is not</h2>
        <ul>
          <li>It does not execute payments, authorize bank transfers or connect to banks.</li>
          <li>It does not prove who owns a bank account. A valid IBAN format does not establish ownership, and matching reference details do not prove authenticity.</li>
          <li>It does not guarantee that fraud will be detected. AI findings are indicators for a person to consider, not conclusions.</li>
          <li>An approval recorded in Bayyinah is a decision within your own workflow, made by your authorized reviewer.</li>
        </ul>
      </section>
      <section>
        <h2>Your responsibilities</h2>
        <ul>
          <li>Keep supplier reference records accurate and sourced from approved records.</li>
          <li>Perform independent verification through established channels and record outcomes truthfully.</li>
          <li>Give each person their own account; do not share logins.</li>
          <li>Upload only content you are entitled to process.</li>
        </ul>
      </section>
      <section>
        <h2>Pilot status</h2>
        <p>The service is offered as a pilot. Features, limits and these terms may change. Commercial terms, liability and governing law must be settled with legal counsel before commercial use.</p>
      </section>
    </DocPage>
  );
}
