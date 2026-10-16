// Arabic catalogue. English text is the key; see lib/i18n/core.ts.
import { SITE } from './ar/site';
import { ACCOUNT } from './ar/account';
import { CASE } from './ar/case';
import { ADMIN } from './ar/admin';
import { SERVER } from './ar/server';
import { EXTRA } from './ar/extra';
import { WORKFLOW } from './ar/workflow';
import { SMS } from './ar/sms';

export const AR: Record<string, string> = { ...SERVER, ...ADMIN, ...CASE, ...ACCOUNT, ...SITE, ...EXTRA, ...WORKFLOW, ...SMS };
