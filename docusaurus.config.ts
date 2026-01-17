import dotenv from 'dotenv';
dotenv.config({path: '.env.local'});
import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Agentic Tinkering',
  tagline: 'Welcome to my learning journey with AI agents',
  favicon: 'img/favicon.ico',

  customFields: {
    convexUrl: process.env.CONVEX_URL,
  },

  future: {
    v4: true,
  },

  // TODO: Update with your production URL
  url: 'https://agentic-tinkering.netlify.app/',
  baseUrl: '/',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: 'content',
          sidebarPath: './sidebars.ts',
          remarkPlugins: [require('./remark/youtubeEmbed')],
          exclude: [
            '**/plans/**',
            '**/_*.{js,jsx,ts,tsx,md,mdx}',
            '**/_*/**',
            '**/*.test.{js,jsx,ts,tsx}',
            '**/__tests__/**',
          ],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themes: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexDocs: true,
        indexBlog: false,
        indexPages: false,
        language: ['en'],
      },
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    docs: {
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
    },
    navbar: {
      title: 'Agentic Tinkering',
      logo: {
        alt: 'Agentic Tinkering',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Content',
        },
        {to: '/posts', label: 'Posts', position: 'left'},
        {
          type: 'custom-draftsNavItem',
          position: 'left',
        },
        {
          type: 'custom-authButton',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()}. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
