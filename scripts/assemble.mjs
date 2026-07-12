#!/usr/bin/env node
/* =========================================================
 * assemble.mjs — vendor shared/ into a single-dir deploy root
 * ---------------------------------------------------------
 * Each of the three landing pages (invite / kr / en) and the
 * admin dashboard is published as its OWN static root (one
 * Cloudflare Pages project per subdomain). Every page loads
 * its shared code with relative "../shared/..." paths.
 *
 * At the repo root that resolves fine (…/invite/index.html →
 * …/shared/…), so LOCAL DEV needs no assembly. But once a
 * single site directory is the publish root, "../shared/…"
 * clamps to "/shared/…" — which only exists if shared/ has
 * been copied in beside the page. This script does that copy.
 *
 * Usage:
 *   node scripts/assemble.mjs <invite|kr|en|admin|all>
 *
 * It removes <site>/shared then re-copies the canonical
 * repo-root shared/ into it, so it is fully idempotent. The
 * assembled copies are gitignored — shared/ at the repo root
 * stays the single source of truth.
 * ========================================================= */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITES = ['invite', 'kr', 'en', 'admin'];

// Resolve everything from THIS file's location, not the caller's
// cwd, so the script works no matter where it is invoked from.
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const sharedDir = path.join(repoRoot, 'shared');

function usage(msg) {
  if (msg) console.error('Error: ' + msg + '\n');
  console.error('Usage: node scripts/assemble.mjs <invite|kr|en|admin|all>');
  console.error('  invite | kr | en | admin   assemble one site');
  console.error('  all                        assemble every site');
}

function fmtBytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / (1024 * 1024)).toFixed(1) + ' MB';
}

// Recursively copy src → dst, invoking onFile(absPath, size) per
// regular file. Symlinks are recreated as links; everything else
// (dirs) is walked. mkdir -p on every directory encountered.
async function copyTree(src, dst, onFile) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const entry of entries) {
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      await copyTree(s, d, onFile);
    } else if (entry.isSymbolicLink()) {
      const target = await fs.readlink(s);
      await fs.symlink(target, d);
    } else if (entry.isFile()) {
      await fs.copyFile(s, d);
      const { size } = await fs.stat(d);
      onFile(d, size);
    }
    // sockets / fifos / devices are intentionally skipped
  }
}

async function assembleSite(site) {
  const siteDir = path.join(repoRoot, site);
  const target = path.join(siteDir, 'shared');

  // The site directory must exist (it holds the page's own HTML/JS).
  try {
    const st = await fs.stat(siteDir);
    if (!st.isDirectory()) throw new Error('not a directory');
  } catch {
    throw new Error(`site directory not found: ${siteDir}`);
  }

  // Idempotent: wipe any previous assembly first.
  await fs.rm(target, { recursive: true, force: true });

  let files = 0;
  let bytes = 0;
  await copyTree(sharedDir, target, (abs, size) => {
    files += 1;
    bytes += size;
    console.log('  + ' + path.relative(repoRoot, abs));
  });

  // The admin pages load defaults from sibling site dirs: ../invite/config.js
  // (모청 defaults — passcode + 청첩장 수정) and ../en|kr content files
  // (site defaults — 웹사이트 수정). In the assembled admin root those paths
  // clamp to /invite/…, /en/…, /kr/…, so vendor each file in beside the pages.
  if (site === 'admin') {
    const vendored = [
      ['invite', 'config.js'],
      ['en', 'content.en.js'],
      ['kr', 'content.ko.js'],
    ];
    for (const [dir, file] of vendored) {
      const dstDir = path.join(siteDir, dir);
      await fs.rm(dstDir, { recursive: true, force: true });
      await fs.mkdir(dstDir, { recursive: true });
      await fs.copyFile(path.join(repoRoot, dir, file), path.join(dstDir, file));
      const { size } = await fs.stat(path.join(dstDir, file));
      files += 1; bytes += size;
      console.log('  + ' + path.relative(repoRoot, path.join(dstDir, file)));
    }
  }

  console.log(
    `${site}: copied ${files} file${files === 1 ? '' : 's'} ` +
    `(${fmtBytes(bytes)}) → ${path.relative(repoRoot, target)}/\n`
  );
  return { site, files, bytes };
}

async function main() {
  const arg = (process.argv[2] || '').trim();
  if (!arg) { usage('missing <site> argument'); process.exit(1); }
  if (arg !== 'all' && !SITES.includes(arg)) {
    usage(`unknown site "${arg}"`); process.exit(1);
  }

  // Canonical shared/ must exist to copy from.
  try {
    const st = await fs.stat(sharedDir);
    if (!st.isDirectory()) throw new Error('not a directory');
  } catch {
    console.error(`Error: canonical shared/ not found at ${sharedDir}`);
    process.exit(1);
  }

  const targets = arg === 'all' ? SITES : [arg];
  console.log(`Assembling from ${path.relative(repoRoot, sharedDir)}/ …\n`);

  const results = [];
  for (const site of targets) {
    results.push(await assembleSite(site));
  }

  const totalFiles = results.reduce((s, r) => s + r.files, 0);
  const totalBytes = results.reduce((s, r) => s + r.bytes, 0);
  console.log(
    `Done: ${results.length} site${results.length === 1 ? '' : 's'}, ` +
    `${totalFiles} files, ${fmtBytes(totalBytes)} total.`
  );
}

main().catch((err) => {
  console.error('assemble failed:', err && err.message ? err.message : err);
  process.exit(1);
});
