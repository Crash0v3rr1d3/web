import { defineConfig } from "astro/config";
import { rehypeHeadingIds } from '@astrojs/markdown-remark'
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import UnoCSS from "@unocss/astro";
import icon from "astro-icon";
import solidJs from "@astrojs/solid-js";
import svelte from "@astrojs/svelte";
import mdx from '@astrojs/mdx';
import rehypePrettyCode from 'rehype-pretty-code'

import react from "@astrojs/react";
import {
  transformerNotationDiff,
  transformerMetaHighlight,
  transformerRenderWhitespace
} from '@shikijs/transformers'

import rehypeKatex from 'rehype-katex'
import rehypeExternalLinks from 'rehype-external-links'

import remarkEmoji from 'remark-emoji'
import remarkMath from 'remark-math'
import remarkToc from 'remark-toc'
import sectionize from '@hbsnow/rehype-sectionize'
import { transformerNotationSkip } from './src/lib/transformerNotationSkip'
import { transformerDiffHighlight } from './src/lib/transformerDiffHighlight'
import { NEWS_SOURCES } from './src/consts'

// Dev-server equivalent of the /feeds/* proxies in ../nginx.conf, so the
// /news/ live fetch also works under `astro dev`
const newsFeedProxy = Object.fromEntries(
  NEWS_SOURCES.map((source) => {
    const url = new URL(source.url)
    return [
      `/feeds/${source.id}`,
      {
        target: url.origin,
        changeOrigin: true,
        rewrite: () => url.pathname + url.search,
        headers: { 'User-Agent': 'crash0v3rr1d3-news/1.0' },
      },
    ]
  })
)


// https://astro.build/config
export default defineConfig({
  site: "https://crash0v3rr1d3.com",
  integrations: [
    sitemap(),
    robotsTxt({
      sitemap: [
        "https://crash0v3rr1d3.com/sitemap-index.xml",
        "https://crash0v3rr1d3.com/sitemap-0.xml",
      ],
    }),
    solidJs({
      include: ['**/solid/*.tsx', '**/solid/*.jsx']
    }),
    UnoCSS({
      injectReset: true,
    }),
    icon(),
    svelte(),
    mdx(),
    react(),
  ],
  markdown: {
    syntaxHighlight: false,
    // shikiConfig: {
    //   theme: 'everforest-dark',
    //   transformers: [
    //     transformerNotationDiff(),
    //     transformerNotationFocus(),
    //     transformerMetaHighlight(),
    //   ],
    //   wrap: true,
    // },
  
    rehypePlugins: [
      [
        rehypePrettyCode,
        {
          theme: {
            light: 'everforest-dark',
            dark: 'everforest-dark',
          },
          transformers: [
            transformerNotationDiff(),
            transformerMetaHighlight(),
            transformerRenderWhitespace(),
            transformerNotationSkip(),
            transformerDiffHighlight(),
          ],
        },
      ],
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['nofollow', 'noreferrer', 'noopener'],
        },
      ],
      rehypeHeadingIds,
      [
        rehypeKatex,
        {
          strict: false,
        },
      ],
      sectionize as any,
    ],
    remarkPlugins: [remarkToc, remarkMath, remarkEmoji],
  },
  output: "static",
  vite: {
    assetsInclude: "**/*.riv",
    server: {
      proxy: newsFeedProxy,
    },
    resolve: {
      alias: {
        "@": "/src",
        "@components": "/src/components",
        "@layouts": "/src/layouts",
        "@lib": "/src/lib",
      },
    },
  },
});
