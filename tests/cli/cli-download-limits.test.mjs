import { test } from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import { readZipResponse, withExtractedZip } from '../../cli/lib/install-archive.mjs';

test('download rejects a response above its Content-Length or streaming byte limit', async () => {
  await assert.rejects(readZipResponse(new Response('body', {
    headers: { 'Content-Length': '20' }
  }), 10), /download size limit/);
  await assert.rejects(readZipResponse(new Response('long body'), 5), /download size limit/);
});

test('ZIP extraction rejects non-regular entries and unpacked data above the budget', async () => {
  const zip = new AdmZip();
  zip.addFile('SKILL.md', Buffer.from('# Demo'));
  const link = zip.addFile('link-to-markdown', Buffer.from('SKILL.md'));
  link.attr = (0o120777 << 16) >>> 0;
  const useFiles = () => assert.fail('invalid archive must never reach installation');
  await assert.rejects(withExtractedZip(zip.toBuffer(), 1024, useFiles), /unsupported file type/);
  zip.deleteFile('link-to-markdown');
  await assert.rejects(withExtractedZip(zip.toBuffer(), 4, useFiles), /uncompressed size limit/);
});
