import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import config from '../../../capacitor.config';

it.each(['android/app/src/main/assets/capacitor.config.json', 'ios/App/App/capacitor.config.json'])(
  'keeps checked-in native configuration aligned with the source: %s',
  (file) => {
    const native = JSON.parse(readFileSync(file, 'utf8'));
    expect(native.appId).toBe(config.appId);
    expect(native.server).toEqual(config.server);
    expect(native.plugins).toEqual(config.plugins);
  }
);
it('uses portable relative paths for Swift packages built on macOS', () => {
  const source = readFileSync('ios/App/CapApp-SPM/Package.swift', 'utf8');
  const paths = [...source.matchAll(/\.package\([^\n]+path: "([^"]+)"/g)].map((match) => match[1]);
  expect(paths.length).toBeGreaterThan(0);
  expect(
    paths.every((path) => path.startsWith('../../../node_modules/') && !path.includes('\\'))
  ).toBe(true);
});
