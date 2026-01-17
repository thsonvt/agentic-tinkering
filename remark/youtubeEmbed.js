function isYouTubeUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    return (
      host === 'youtu.be' ||
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'youtube-nocookie.com'
    );
  } catch {
    return false;
  }
}

function extractStandaloneUrlFromParagraph(node) {
  if (!node || node.type !== 'paragraph' || !Array.isArray(node.children)) return null;

  const children = node.children.filter((child) => {
    if (child.type === 'text') return child.value.trim() !== '';
    return true;
  });

  if (children.length !== 1) return null;
  const only = children[0];

  if (only.type === 'link' && typeof only.url === 'string') {
    return only.url;
  }

  if (only.type === 'text' && typeof only.value === 'string') {
    const trimmed = only.value.trim();
    if (!trimmed) return null;
    if (/^https?:\/\/\S+$/.test(trimmed)) return trimmed;
  }

  return null;
}

function makeYouTubeEmbedNode(url) {
  return {
    type: 'mdxJsxFlowElement',
    name: 'YouTubeEmbed',
    attributes: [
      {
        type: 'mdxJsxAttribute',
        name: 'url',
        value: url,
      },
    ],
    children: [],
  };
}

function transform(tree) {
  function walk(node) {
    if (!node || typeof node !== 'object') return;
    const children = node.children;
    if (!Array.isArray(children)) return;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];

      if (child && child.type === 'paragraph') {
        const url = extractStandaloneUrlFromParagraph(child);
        if (url && isYouTubeUrl(url)) {
          children[i] = makeYouTubeEmbedNode(url);
          continue;
        }
      }

      walk(child);
    }
  }

  walk(tree);
}

module.exports = function remarkYouTubeEmbed() {
  return transform;
};

