import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, 'src/features/zen-garden/previews');
await mkdir(output, { recursive: true });
const server = await createServer({
  root,
  server: { host: '127.0.0.1', port: 4176, strictPort: true, hmr: false, watch: null },
});
let browser;
try {
  await server.listen();
  browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 512, height: 340 },
    deviceScaleFactor: 1,
  });
  page.on('pageerror', (error) => console.error(error.message));
  await page.goto('http://127.0.0.1:4176/scripts/island-thumbnail.html');
  await page.waitForFunction(() => typeof window.captureIsland === 'function');
  let bytes = 0;
  for (const theme of ['meadow', 'blossom', 'dusk']) {
    for (let level = 1; level <= 5; level++) {
      for (let flowers = 21; flowers <= 42; flowers++) {
        const url = await page.evaluate(
          ({ level, growth, theme }) => window.captureIsland(level, growth, theme),
          { level, growth: (flowers - 21) * 5, theme }
        );
        if (!url.startsWith('data:image/webp;base64,')) throw new Error('WebP capture failed');
        const image = Buffer.from(url.split(',')[1], 'base64');
        await writeFile(join(output, `island-${level}-${theme}-${flowers}.webp`), image);
        bytes += image.length;
      }
      console.log(`Captured ${theme}, stage ${level}.`);
    }
  }
  console.log(
    `330 matching island thumbnails: ${(bytes / 1024 / 1024).toFixed(2)} MB total. Only one is downloaded per appearance.`
  );
} finally {
  await browser?.close();
  await server.close();
}
