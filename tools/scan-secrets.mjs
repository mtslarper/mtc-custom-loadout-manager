import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const patterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/g],
  ['openai-token', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{32,}\b/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['roblox-session', /_\|WARNING:-DO-NOT-SHARE-THIS[^\r\n"']+/g],
  ['credential-url', /https?:\/\/[^\s\/'"<>:]+:[^\s\/'"<>@]+@/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['private-server-link', /roblox\.com\/share\?code=[a-f0-9]{20,}/gi],
  ['literal-credential', /\b(?:password|passwd|api[_-]?key|api[_-]?secret|access[_-]?token|auth[_-]?token|client[_-]?secret)["']?\s*[:=]\s*["']([^"'\r\n]{8,})["']/gi],
];
export async function scanSecrets(root) {
  const findings = []; let scanned = 0;
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (['.git', 'node_modules', '.local', 'release', 'github-upload'].includes(entry.name)) continue;
      const filename = path.join(folder, entry.name);
      if (entry.isDirectory()) { await walk(filename); continue; }
      if (!entry.isFile() || /\.(png|webp|woff2?|ico|zip|rar)$/i.test(entry.name)) continue;
      const content = await readFile(filename, 'utf8'); scanned++;
      for (const [kind, pattern] of patterns) {
        pattern.lastIndex = 0;
        for (const match of content.matchAll(pattern)) {
          if (kind === 'literal-credential' && /^(?:example|placeholder|change[-_ ]?me|your[-_ ]|process\.env)/i.test(match[1])) continue;
          findings.push({ file: path.relative(root, filename).split(path.sep).join('/'), kind, line: content.slice(0, match.index).split('\n').length });
        }
      }
    }
  }
  await walk(root);
  return { scanned, findings };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
  const result = await scanSecrets(root);
  console.log(JSON.stringify(result, null, 2));
  if (result.findings.length) process.exitCode = 1;
}
