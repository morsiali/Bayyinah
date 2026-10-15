import type { Metadata } from 'next';
import { DocPage } from '@/components/site/doc-page';

export const metadata: Metadata = { title: 'Privacy notice (draft)' };

export default function PrivacyPage() {
  return (
    <DocPage title="Privacy notice" updated="October 2026">
      <section>
        <h2>Who is responsible</h2>
        <p>Bayyinah (working name) is operated by the business that deploys it. Each customer organization controls the business records it adds. Contact details for the operator must be added here before launch.</p>
      </section>
      <section>
        <h2>What we store</h2>
        <ul>
          <li>Account data: your name, email address, a one-way hash of your password, and sign-in times.</li>
          <li>Organization data: memberships and roles, supplier reference records and their version history.</li>
          <li>Case data: pasted text and uploaded PDF files, extracted fields and corrections, findings, verification records, review decisions and an audit trail of actions.</li>
          <li>Operational metadata: model call timing, status and token counts — never document content.</li>
        </ul>
      </section>
      <section>
        <h2>What is processed externally</h2>
        <p>If your deployment configures an AI provider, the text of a case’s source documents and a minimal supplier context (name, expected beneficiary, last four characters of the reference account, email domain, usual currency) are sent to that provider when a preparer runs analysis. The case page names the provider before analysis runs. Without a configured provider, analysis runs locally and nothing leaves the server.</p>
      </section>
      <section>
        <h2>What we never collect</h2>
        <ul>
          <li>Banking login credentials or one-time passcodes.</li>
          <li>Analytics that capture document content.</li>
        </ul>
      </section>
      <section>
        <h2>Who can see your data</h2>
        <p>Only active members of your organization, according to their role. Platform operators see organization names, service status and aggregate counts; they do not have default access to documents, bank details or case narratives.</p>
      </section>
      <section>
        <h2>Retention and deletion</h2>
        <p>Each organization sets a retention period (default 365 days). After a case has been closed for longer than that period, its stored files and document text are removed; the decision record and audit trail are kept. Contact the operator to request deletion of an account or organization.</p>
      </section>
      <section>
        <h2>Security</h2>
        <p>Passwords are hashed with bcrypt, sessions are signed, HTTP-only cookies, files are stored outside the public web root and served only to authorized members. No system is perfectly secure, and no claim of tamper-proof storage is made.</p>
      </section>
    </DocPage>
  );
}
