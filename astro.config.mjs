import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// IPQmedia SEO content site — static HTML output, LIVE at https://ipqmedia.com/resources/
// (moved off the resources.ipqmedia.com subdomain 2026-07-17; old URLs 301).
// ⚠ `site` below stays on the OLD subdomain ON PURPOSE: it is the build-time internal
// representation. ~/ipq-resources-deploy/publish.sh rewrites every URL to
// https://ipqmedia.com/resources at deploy (residue-gated). Do NOT set site to
// 'https://ipqmedia.com/resources' — new URL(pathname, site) DROPS subpaths and
// canonicals/sitemap would silently break.

// ── Sitemap <lastmod> (rewritten 2026-08-21, see the note below) ──────────────
// lastmod = the date the page's own source file last really changed (its last git
// commit), NOT the byline date. The visible byline is untouched and still reads
// `updated` || `published`.
//
// Why they were split. Council move A2 tied lastmod to the byline so we could never
// bare-bump a date to farm crawls. That held, but it had a side effect nobody had
// measured until the 08-21 index sweep: the mechanical passes that DID change these
// documents (07-31 section anchors + on-this-page nav + FAQPage schema, 08-02
// exact-anchor internal links, 08-14 outbound citations, 08-15 stat-vintage fixes)
// correctly left the byline alone, so the sitemap kept telling Google the pages had
// not changed since 07-14. Eight pages sat frozen on a July canonical for a month
// because of it. lastmod is a file-change date by spec; the byline is an
// editorial date. Conflating them was the bug.
//
// ⛔ This is NOT a licence to bump. Every date emitted here comes from a real commit
// that really changed that file. Deliberately NOT folding in Base.astro's own commit
// date: a layout change would stamp all 32 pages with one identical date, which is
// exactly the bare-bump pattern A2 forbade and the pattern Google discounts.
const pagesDir = fileURLToPath(new URL('./src/pages/', import.meta.url));
const repoRoot = fileURLToPath(new URL('.', import.meta.url));

function gitLastChanged(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', `src/pages/${file}`], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : null;
  } catch {
    return null; // no git (clean tarball build) — fall back to the byline date
  }
}

// ── Held-for-approval deploy corrections (added 2026-08-29, weekly check #8) ──
// The 08-21 rewrite above moved lastmod from the byline to the commit date, which fixed
// the frozen-canonical problem. Check #8 found the remaining half of the same bug: a
// commit date is only the true change date when the commit deploys the same day. Visible
// copy waits for Arseniy's approval, so a page can be committed on the 19th and only
// reach the public web on the 27th — and lastmod then reports a date Google has already
// crawled past. Measured on 08-29: the pillar retrofit committed 08-19, went live 08-27,
// and Google's last crawl was 08-26 20:11Z against a sitemap claiming 08-19. No signal.
//
// So: for a commit that was held, lastmod is the date it actually went live. Each entry
// below names the held commit and the deploy that shipped it, so every date here still
// points at a real change to a real file on a real date. Same guardrail as above — this
// is NOT a bump table. An entry only belongs here if the file genuinely changed AND the
// change reached the web later than the commit date.
const heldUntilDeploy = {
  // approved in msg 432 and deployed 2026-08-27 (dpl_ATdc3wwoVQWJBJ5koMgg21XSHTFP)
  '/architecture-marketing': '2026-08-27',              // 575ecad, held from 08-19
  '/best-marketing-agencies-for-architects': '2026-08-27', // 1ced570 08-24 + 1f42b94 08-26
  '/meta-ads-for-architects': '2026-08-27',             // 46a1caf, held from 08-25
  '/marketing-for-landscape-architects': '2026-08-27',  // 46a1caf, held from 08-25
};

const pageDates = {};
for (const f of readdirSync(pagesDir)) {
  if (!f.endsWith('.astro')) continue;
  const src = readFileSync(pagesDir + f, 'utf8');
  const byline =
    src.match(/const updated = '(\d{4}-\d{2}-\d{2})'/)?.[1] ??
    src.match(/const published = '(\d{4}-\d{2}-\d{2})'/)?.[1];
  const path = '/' + f.replace(/\.astro$/, '');
  // never understate a byline the author bumped by hand, or a deploy that ran late
  const candidates = [gitLastChanged(f), byline, heldUntilDeploy[path]].filter(Boolean);
  if (!candidates.length) continue;
  pageDates[path] = candidates.sort().at(-1);
}
// the hub's cards change whenever any page ships or is retouched
pageDates['/index'] = Object.values(pageDates).sort().at(-1);

export default defineConfig({
  site: 'https://resources.ipqmedia.com',
  integrations: [
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/\/$/, '') || '/index';
        const date = pageDates[path];
        if (date) item.lastmod = date;
        // emit the non-slash URL so the sitemap matches rel=canonical exactly (see Base.astro)
        item.url = item.url.replace(/\/$/, '') || item.url;
        return item;
      },
    }),
    mdx(),
  ],
});
