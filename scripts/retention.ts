// Applies each organization's retention period. Schedule daily (Task Scheduler / cron): npm run retention
import './load-env';
import { prisma } from '../lib/db';
import { purgeExpiredEvidence } from '../lib/services/retention';

purgeExpiredEvidence()
  .then((r) => console.log(`Retention run complete: ${r.purged} document(s) purged.`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
