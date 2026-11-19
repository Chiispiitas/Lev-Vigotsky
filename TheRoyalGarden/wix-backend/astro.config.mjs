import tailwindcss from "@tailwindcss/vite";
// @ts-check
import { defineConfig } from 'astro/config';
import wix from "@wix/astro";
import wixPages from "@wix/astro-pages";

import react from "@astrojs/react";
import wixHostingAdapter from "@wix/astro-wix-hosting-adapter";

// https://astro.build/config
export default defineConfig({
  vite: { plugins: [tailwindcss()] },
  integrations: [wix(), wixPages(), react()],
  security: { checkOrigin: false },
  // A project-relative config also works on Windows, where drive-letter paths
  // would otherwise be interpreted as non-file URLs by the Cloudflare adapter.
  adapter: wixHostingAdapter({ configPath: './wrangler.json' }),

  image: {
    domains: ["static.wixstatic.com"],
  },

  output: "server",
});
