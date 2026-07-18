import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// IPQmedia SEO content site — static HTML output, LIVE at https://ipqmedia.com/resources/
// (moved off the resources.ipqmedia.com subdomain 2026-07-17; old URLs 301).
// ⚠ `site` below stays on the OLD subdomain ON PURPOSE: it is the build-time internal
// representation. ~/ipq-resources-deploy/publish.sh rewrites every URL to
// https://ipqmedia.com/resources at deploy (residue-gated). Do NOT set site to
// 'https://ipqmedia.com/resources' — new URL(pathname, site) DROPS subpaths and
// canonicals/sitemap would silently break.
export default defineConfig({
  site: 'https://resources.ipqmedia.com',
  integrations: [sitemap(), mdx()],
});
