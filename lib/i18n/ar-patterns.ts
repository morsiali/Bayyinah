// Arabic renderings of server messages that contain values. Each pattern matches the full English text.
// `tr` translates an inner fragment (a label, a nested sentence) and falls back to the English fragment.
type Pattern = { re: RegExp; to: (m: RegExpMatchArray, tr: (s: string) => string) => string };

const NOUN: Record<string, string> = {
  Record: 'السجل',
  Case: 'الحالة',
  Attachment: 'المرفق',
  'Document file': 'ملف المستند',
  Invitation: 'الدعوة',
  Message: 'الرسالة',
  Member: 'العضو',
  Organization: 'المؤسسة',
  Supplier: 'المورّد',
  'Verification task': 'مهمة التحقق',
};

const FIELD_NAMES: Record<string, string> = {
  amount: 'Amount', currency: 'Currency', beneficiaryName: 'Beneficiary name', iban: 'IBAN', accountNumber: 'Account number', senderEmail: 'Sender email', requestedPaymentDate: 'Requested payment date', invoiceNumber: 'Invoice number',
};

const IBAN_PROBLEM = (p: string) => {
  if (p === 'does not have the structure of an IBAN') return 'لا يملك بنية الآيبان';
  if (p === 'fails the IBAN checksum') return 'لا يجتاز رقم التحقق الخاص بالآيبان';
  const m = /^has (\d+) characters; ([A-Z]{2}) IBANs have (\d+)$/.exec(p);
  if (m) return `يتكون من ${m[1]} حرفاً، بينما يتكون آيبان ${m[2]} من ${m[3]}`;
  return p;
};

const STATUS_WORDS: Record<string, string> = {
  draft: 'مسودة',
  analyzed: 'محلَّلة',
  'needs information': 'تحتاج معلومات',
  'independent check required': 'تحقق مستقل مطلوب',
  'ready for review': 'جاهزة للمراجعة',
  'closed approved': 'مغلقة · معتمدة',
  'closed rejected': 'مغلقة · مرفوضة',
  'closed inconclusive': 'مغلقة · غير حاسمة',
};

const list = (s: string, sep: RegExp, tr: (x: string) => string, join = '، ') => s.split(sep).map((x) => tr(x.trim())).join(join);

export const AR_PATTERNS: Pattern[] = [
  // Generic errors
  { re: /^(.+) not found\.$/, to: (m) => `لم يُعثر على ${NOUN[m[1]] ?? m[1]}.` },
  { re: /^Something went wrong on our side\. Your saved work is unaffected\. Reference (\S+)\.$/, to: (m) => `حدث خطأ من جهتنا. عملك المحفوظ لم يتأثر. المرجع ${m[1]}.` },
  { re: /^Request failed \((\d+)\)\.$/, to: (m) => `فشل الطلب (${m[1]}).` },
  { re: /^(.+?) Your case and evidence are saved; you can retry\. Reference (\S+)\.$/, to: (m, tr) => `${tr(m[1])} الحالة والأدلة محفوظة ويمكنك إعادة المحاولة. المرجع ${m[2]}.` },
  { re: /^This action requires the (.+) role in this organization\.$/, to: (m, tr) => `يتطلب هذا الإجراء دور «${list(m[1], / or /, tr, '» أو «')}» في هذه المؤسسة.` },
  { re: /^A case cannot move from (.+) to (.+)\.$/, to: (m) => `لا يمكن نقل الحالة من «${STATUS_WORDS[m[1]] ?? m[1]}» إلى «${STATUS_WORDS[m[2]] ?? m[2]}».` },

  // Limits and validation
  { re: /^Daily analysis limit reached \((\d+) per organization\)\. Try again tomorrow or ask platform support to raise it\.$/, to: (m) => `تم بلوغ الحد اليومي للتحليل (${m[1]} لكل مؤسسة). حاول غداً أو اطلب من دعم المنصة رفعه.` },
  { re: /^This organization has reached its limit of (\d+) cases\.$/, to: (m) => `بلغت هذه المؤسسة حدها الأقصى من الحالات (${m[1]}).` },
  { re: /^The attachment is larger than (\d+) MB\.$/, to: (m) => `المرفق أكبر من ${m[1]} ميغابايت.` },
  { re: /^The file is larger than the (\d+) MB limit\.$/, to: (m) => `الملف أكبر من الحد المسموح ${m[1]} ميغابايت.` },
  { re: /^(.+) must be between (\d+) and (\d+)\.$/, to: (m, tr) => `يجب أن تكون قيمة «${tr(m[1])}» بين ${m[2]} و${m[3]}.` },
  { re: /^Unknown setting (.+)\.$/, to: (m) => `إعداد غير معروف: ${m[1]}.` },
  { re: /^The organization is already (active|suspended)\.$/, to: (m) => `المؤسسة ${m[1] === 'active' ? 'نشطة' : 'معلّقة'} بالفعل.` },
  { re: /^This invitation was issued to (\S+)\. Sign in with that email address to accept it\.$/, to: (m) => `صدرت هذه الدعوة إلى ${m[1]}. سجّل الدخول بهذا البريد لقبولها.` },
  { re: /^Task type (\S+) is not permitted for this case\.$/, to: (m) => `نوع المهمة ${m[1]} غير مسموح لهذه الحالة.` },
  { re: /^The reference IBAN (.+)\.$/, to: (m) => `الآيبان المرجعي ${IBAN_PROBLEM(m[1])}.` },
  { re: /^The model provider returned (\d+)\.$/, to: (m) => `أعاد مزوّد النموذج الرمز ${m[1]}.` },

  // Rules engine
  { re: /^The submitted IBAN (.+)\. Check the source for a typing error before any verification call\.$/, to: (m) => `الآيبان المُقدَّم ${IBAN_PROBLEM(m[1])}. راجع المصدر بحثاً عن خطأ كتابي قبل أي مكالمة تحقق.` },
  {
    re: /^Required information was not found in the source: (.+)\. It remains missing until a person adds evidence or corrects the extraction\.$/,
    to: (m, tr) => `لم يُعثر في المصدر على معلومات مطلوبة: ${list(m[1], /, (?![^()]*\))/, tr)}. وتبقى ناقصة حتى يضيف شخص أدلة أو يصحح البيانات المستخرجة.`,
  },
  { re: /^The request is in ([A-Z]{3}), while this supplier is usually paid in ([A-Z]{3})\.$/, to: (m) => `الطلب بعملة ${m[1]}، بينما يُدفع لهذا المورّد عادةً بعملة ${m[2]}.` },

  // Readiness requirements
  { re: /^(\d+) readable sources?\.$/, to: (m) => `مصادر مقروءة: ${m[1]}.` },
  { re: /^(\d+) verification tasks? (?:is|are) still open\.$/, to: (m) => `مهام تحقق لا تزال مفتوحة: ${m[1]}.` },
  { re: /^Missing: (.+)\.$/, to: (m, tr) => `ناقص: ${list(m[1], /, /, tr)}.` },
  { re: /^Approval requires a recorded outcome of “confirmed”\. (.+)$/, to: (m, tr) => `يتطلب الاعتماد نتيجة مسجّلة بـ «مؤكَّد». ${tr(m[1])}` },

  // Local analyzer
  { re: /^(.+) was not found in the source\.$/, to: (m, tr) => `لم يُعثر على «${tr(m[1])}» في المصدر.` },
  {
    // "<Type> request from a@b for AED 1,000.00 to Name (IBAN ending 1234). 2 language indicators found."
    re: /^(Invoice payment|Bank account change|New beneficiary) request|^Payment-related request/,
    to: (m, tr) => localSummary(m.input ?? '', tr),
  },

  // Preparation agent
  { re: /^The run stopped at its limit of (\d+) tool calls\. Run the agent again to continue\.$/, to: (m) => `توقف التشغيل عند حده الأقصى البالغ ${m[1]} استدعاءً للأدوات. شغّل الوكيل مرة أخرى للمتابعة.` },
  { re: /^Phone (.+)$/, to: (m) => `الهاتف ‎${m[1]}‎` },
  { re: /^Email (\S+@\S+)$/, to: (m) => `البريد ${m[1]}` },
  {
    re: /^Supplier reference v(\d+) — recorded (phone|email)(?: \((.+)\))?$/,
    to: (m, tr) => `السجل المرجعي للمورّد v${m[1]} — ${m[2] === 'phone' ? 'الهاتف المسجّل' : 'البريد المسجّل'}${m[3] ? ` (${tr(m[3])})` : ''}`,
  },
  { re: /^Confirm with the supplier that they requested this (bank account change|new beneficiary) and that the submitted account details are theirs\.$/, to: (m) => `تأكد مع المورّد أنه طلب ${m[1] === 'new beneficiary' ? 'إضافة المستفيد الجديد' : 'تغيير الحساب البنكي'} هذا، وأن بيانات الحساب المُقدَّمة تخصه.` },
  { re: /^(.+)\. Use only the reference channel below — never a phone number, email or link contained in the request\.$/, to: (m, tr) => `${tr(m[1])}. استخدم القناة المرجعية أدناه فقط — وليس أبداً رقماً أو بريداً أو رابطاً وارداً في الطلب.` },
  { re: /^(Invoice payment|Bank account change|New beneficiary) — (.*)$/, to: (m, tr) => `${tr(m[1])} — ${tr(m[2])}` },
  { re: /^(\d+) significant findings?: (.+)\.$/, to: (m, tr) => `ملاحظات جوهرية (${m[1]}): ${list(m[2], /, /, tr)}.` },
  {
    re: /^Independent verification: (\d+) of (\d+) tasks? recorded(?: \((.+)\))?\.$/,
    to: (m, tr) => `التحقق المستقل: سُجّلت ${m[1]} من ${m[2]} مهام${m[3] ? ` (${list(m[3], /, /, tr)})` : ''}.`,
  },
  { re: /^Outstanding: (.+)\.$/, to: (m, tr) => `متبقٍ: ${list(m[1], /; /, tr, '؛ ')}.` },

  // Case history
  { re: /^Material correction to (\w+)$/, to: (m, tr) => `تصحيح جوهري لحقل «${tr(FIELD_NAMES[m[1]] ?? m[1])}»` },
  { re: /^Reopened: (.+)$/s, to: (m) => `أُعيد فتحها: ${m[1]}` },
  { re: /^SMS from (\S+)$/, to: (m) => `رسالة نصية من ‎${m[1]}‎` },
  { re: /^Supplier reference updated to version (\d+)$/, to: (m) => `حُدّث السجل المرجعي للمورّد إلى النسخة ${m[1]}` },
];

/** The local analyzer's one-line summary, rebuilt in Arabic from its parts. */
function localSummary(s: string, tr: (x: string) => string): string {
  const m = /^(?:(Invoice payment|Bank account change|New beneficiary) request|Payment-related request)(?: from (\S+))?(?: for ((?:[A-Z]{3} )?[\d٠-٩][\d٠-٩.,\s]*?))?(?: to (.+?))?(?: \(IBAN ending (\w{4})\))?\. (?:(\d+) language indicators? found|No language indicators found)\.$/.exec(s);
  if (!m) return s;
  const type = m[1] ? `طلب ${tr(m[1])}` : 'طلب متعلق بالدفع';
  const parts = [type];
  if (m[2]) parts.push(`من ${m[2]}`);
  if (m[3]) parts.push(`بمبلغ ${m[3].trim()}`);
  if (m[4]) parts.push(`لصالح ${m[4]}`);
  if (m[5]) parts.push(`(آيبان ينتهي بـ ${m[5]})`);
  return `${parts.join(' ')}. ${m[6] ? `مؤشرات لغوية: ${m[6]}.` : 'لا توجد مؤشرات لغوية.'}`;
}
