import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const names = ['privacy','terms','acceptableUse','appLicense','consumerHealth','security','deletion'];
const docs = Object.fromEntries(await Promise.all(names.map(async name =>
  [name, (await readFile(root + 'docs/legal/' + name + '.md', 'utf8')).trim()])));
const supplements = Object.fromEntries(await Promise.all(['us','international'].map(async region =>
  [region, (await readFile(root + 'docs/legal/privacy-' + region + '-supplement.md', 'utf8')).trim()])));
const moduleText = '/* Generated from docs/legal/*.md by generate-legal-assets.mjs. */\n' +
  "export const POLICY_DATE = '2026-10-04';\n" +
  'export const LEGAL_DOCUMENTS = ' + JSON.stringify(docs, null, 2) + ';\n' +
  'export const PRIVACY_SUPPLEMENTS = ' + JSON.stringify(supplements, null, 2) + ';\n';
await writeFile(root + 'shared/legal-content.js', moduleText);
const { getLegalDocument, legalIdentityComplete, POLICY_LINKS, POLICY_DATE } =
  await import('../shared/legal-documents.js?generate=' + Date.now());
const { LEGAL_CONFIG } = await import('../shared/legal-documents.js');
const safe = value => String(value).replace(/[&<>"']/g, c =>
  ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const files = { privacy:'privacypolicy', terms:'terms-of-service', acceptableUse:'acceptable-use',
  appLicense:'app-license', consumerHealth:'consumer-health-privacy', security:'privacy-security', deletion:'delete-account' };
await mkdir(root + 'public', { recursive: true });
for (const region of ['international','us']) {
  for (const link of POLICY_LINKS) {
    const suffix = region === 'us' ? '-us' : '';
    const markdown = getLegalDocument(link.id, region).replace(
      /\]\(\/(privacy|terms|acceptable-use|app-license|consumer-health-privacy|privacy-security|delete-account)\)/g,
      (all, path) => {
        const target = POLICY_LINKS.find(item => item.path === '/' + path);
        return target ? '](/' + files[target.id] + suffix + '.html)' : all;
      });
    const body = renderToStaticMarkup(createElement(ReactMarkdown, null, markdown));
    const html = '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<meta name="robots" content="' + (legalIdentityComplete() ? 'index,follow' : 'noindex,nofollow') + '">' +
      '<title>' + safe(link.title) + ' | HealthChain</title>' +
      '<style>body{font:16px/1.75 system-ui,sans-serif;color:#123;background:#f8fafb;margin:0;padding:24px 18px}main{max-width:840px;margin:auto}h1{font-size:32px;line-height:1.2}h2{font-size:23px;line-height:1.35;margin-top:32px}a{color:#0f766e;overflow-wrap:anywhere}p{overflow-wrap:anywhere}.draft{border:1px solid #d97706;padding:16px;border-radius:12px}.nav{display:flex;gap:14px;flex-wrap:wrap}@media print{body{background:white;padding:0}h2{break-after:avoid}}</style></head><body><main>' +
      '<nav class="nav"><a href="/">HealthChain</a><a href="/terms-policies">All policies</a>' +
      '<a href="/' + files[link.id] + (region === 'us' ? '' : '-us') + '.html">' +
      (region === 'us' ? 'International' : 'United States') + '</a></nav>' +
      (!legalIdentityComplete() ? '<p class="draft">Publication draft: operator details, eligibility, retention and launch markets await confirmation.</p>' : '') +
      '<h1>' + safe(link.title) + '</h1><p>Updated ' + safe(POLICY_DATE) +
      ' · ' + (region === 'us' ? 'United States' : 'International') + '</p>' + body +
      '<footer><p><a href="mailto:' + safe(LEGAL_CONFIG.privacyEmail) + '">Privacy and support contact</a>' +
      ' · <a href="/delete-account' + suffix + '.html">Account deletion</a></p></footer></main></body></html>';
    await writeFile(root + 'public/' + files[link.id] + suffix + '.html', html);
  }
}
console.log('Generated seven original policies in two regional editions, including script-free Health Connect pages.');
