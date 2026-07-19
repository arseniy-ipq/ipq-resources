import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// IPQmedia SEO content site — static HTML output, LIVE at https://ipqmedia.com/resources/
// (moved off the resources.ipqmedia.com subdomain 2026-07-17; old URLs 301).
// ⚠ `site` below stays on the OLD subdomain ON PURPOSE: it is the build-time internal
// representation. ~/ipq-resources-deploy/publish.sh rewrites every URL to
// https://ipqmedia.com/resources at deploy (residue-gated). Do NOT set site to
// 'https://ipqmedia.com/resources' — new URL(pathname, site) DROPS subpaths and
// canonicals/sitemap would silently break.

// Sitemap <lastmod> = each page's own byline date (`updated` || `published` consts),
// so the sitemap always agrees with the date visible on the page (council move A2:
// real edit dates, never bare bumps). The hub gets the newest page date (its cards
// change whenever a page ships or is retouched).
const pagesDir = fileURLToPath(new URL('./src/pages/', import.meta.url));
const pageDates = {};
for (const f of readdirSync(pagesDir)) {
  if (!f.endsWith('.astro')) continue;
  const src = readFileSync(pagesDir + f, 'utf8');
  const date =
    src.match(/const updated = '(\d{4}-\d{2}-\d{2})'/)?.[1] ??
    src.match(/const published = '(\d{4}-\d{2}-\d{2})'/)?.[1];
  if (date) pageDates['/' + f.replace(/\.astro$/, '')] = date;
}
pageDates['/index'] = Object.values(pageDates).sort().at(-1);

export default defineConfig({
  site: 'https://resources.ipqmedia.com',
  integrations: [
    sitemap({
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/\/$/, '') || '/index';
        const date = pageDates[path];
        if (date) item.lastmod = date;
        return item;
      },
    }),
    mdx(),
  ],
});
