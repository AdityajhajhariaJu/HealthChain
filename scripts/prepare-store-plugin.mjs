// The pinned SDK prints StoreKit purchase objects. Keep its native diagnostics
// in debug builds so receipts/account identifiers do not enter release logs.
import { readFile, writeFile, readdir } from 'node:fs/promises';
const root = new URL('../node_modules/@capgo/native-purchases/', import.meta.url);
const pkg = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
if (pkg.version !== '8.8.1') throw new Error('Review native purchase SDK logging before changing its pinned version.');
async function patchSwift(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory);
    if (entry.isDirectory()) await patchSwift(file);
    else if (entry.name.endsWith('.swift')) {
      const source = await readFile(file, 'utf8');
      const patched = source.replace(/^(\s*)print\((.*)\)\s*$/gm, (line, indent, args, offset) => {
        if (source.slice(Math.max(0, offset - 30), offset).trimEnd().endsWith('#if DEBUG')) return line;
        return `${indent}#if DEBUG\n${indent}print(${args})\n${indent}#endif`;
      });
      await writeFile(file, patched);
    }
  }
}
await patchSwift(new URL('ios/Sources/', root));
const javaFile = new URL('android/src/main/java/ee/forgr/nativepurchases/NativePurchasesPlugin.java', root);
const java = await readFile(javaFile, 'utf8');
// Guard the call's opening line, including calls spread over several lines.
await writeFile(javaFile, java.replace(/^([ \t]*)(Log\.[diewv]\()/gm,
  '$1if ((getContext().getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) != 0) $2'));
console.log('Native purchase SDK logging restricted to debug builds.');
