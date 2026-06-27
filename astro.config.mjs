import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';

// IPQmedia SEO content site — static HTML output (great for Google + AI crawlers),
// served at resources.ipqmedia.com. Funnel stays on Lovable; this is the content cluster.
export default defineConfig({
  site: 'https://resources.ipqmedia.com',
  integrations: [sitemap(), mdx()],
});
