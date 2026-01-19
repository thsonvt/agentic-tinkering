import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import YouTubeEmbed from '@site/src/components/YouTubeEmbed';

function withFocusBlock(Component: React.ElementType) {
  return function FocusBlockComponent(props: any) {
    return <Component data-focus-block="true" {...props} />;
  };
}

const DefaultP = (MDXComponents as any).p ?? 'p';
const DefaultLi = (MDXComponents as any).li ?? 'li';
const DefaultBlockquote = (MDXComponents as any).blockquote ?? 'blockquote';
const DefaultH1 = (MDXComponents as any).h1 ?? 'h1';
const DefaultH2 = (MDXComponents as any).h2 ?? 'h2';
const DefaultH3 = (MDXComponents as any).h3 ?? 'h3';
const DefaultH4 = (MDXComponents as any).h4 ?? 'h4';
const DefaultH5 = (MDXComponents as any).h5 ?? 'h5';
const DefaultH6 = (MDXComponents as any).h6 ?? 'h6';

export default {
  ...MDXComponents,
  p: withFocusBlock(DefaultP),
  li: withFocusBlock(DefaultLi),
  blockquote: withFocusBlock(DefaultBlockquote),
  h1: withFocusBlock(DefaultH1),
  h2: withFocusBlock(DefaultH2),
  h3: withFocusBlock(DefaultH3),
  h4: withFocusBlock(DefaultH4),
  h5: withFocusBlock(DefaultH5),
  h6: withFocusBlock(DefaultH6),
  YouTubeEmbed,
};
