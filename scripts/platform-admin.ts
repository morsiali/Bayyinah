// Privileged provisioning of platform administrators. Run on the server only:
//   npm run platform-admin -- grant someone@example.com
//   npm run platform-admin -- revoke someone@example.com
import './load-env';
import os from 'node:os';
import { prisma } from '../lib/db';
import { provisionPlatformAdmin, revokePlatformAdmin } from '../lib/services/platform';

async function main() {
  const [cmd, email] = process.argv.slice(2);
  if (!['grant', 'revoke'].includes(cmd ?? '') || !email) {
    console.log('Usage: npm run platform-admin -- grant|revoke <email>');
    process.exit(1);
  }
  const by = `cli:${os.userInfo().username}@${os.hostname()}`;
  if (cmd === 'grant') {
    const u = await provisionPlatformAdmin(email, by);
    console.log(`Granted platform operations access to ${u.email}.`);
  } else {
    await revokePlatformAdmin(email, by);
    console.log(`Revoked platform operations access for ${email}.`);
  }
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
