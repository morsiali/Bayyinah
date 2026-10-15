import { createHash } from 'node:crypto';

export const sha256 = (b: Buffer) => createHash('sha256').update(b).digest('hex');

/** Identify by content, not by file name or extension. */
export function sniffType(b: Buffer): 'pdf' | 'png' | 'jpg' | null {
  if (b.length >= 5 && b.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  return null;
}

/** Text extraction for text-based PDFs only. Scanned PDFs return little or no text — no OCR is attempted. */
export async function extractPdfText(b: Buffer): Promise<{ ok: true; text: string; pages: number } | { ok: false; reason: string }> {
  try {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(b));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const t = (Array.isArray(text) ? text.join('\n') : text).replace(/\u0000/g, '').trim();
    if (t.replace(/\s/g, '').length < 30) {
      return { ok: false, reason: 'No selectable text was found. This looks like a scanned or image-only PDF. OCR is not supported — please paste the text of the request instead.' };
    }
    return { ok: true, text: t, pages: totalPages };
  } catch {
    return { ok: false, reason: 'The PDF could not be read. It may be encrypted or damaged. Please paste the text of the request instead.' };
  }
}
