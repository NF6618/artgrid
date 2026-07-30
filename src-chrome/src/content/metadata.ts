export function extractPageMetadata() {
  const metaTags = document.getElementsByTagName('meta');
  const metadata: Record<string, string> = {};

  for (let i = 0; i < metaTags.length; i++) {
    const property = metaTags[i].getAttribute('property') || metaTags[i].getAttribute('name');
    const content = metaTags[i].getAttribute('content');
    
    if (property && content) {
      if (property.startsWith('og:') || property === 'keywords' || property === 'description') {
        metadata[property] = content;
      }
    }
  }

  // Generate smart tags from keywords and title
  const tags: string[] = [];
  
  if (metadata['keywords']) {
    tags.push(...metadata['keywords'].split(',').map(k => k.trim()));
  }
  
  if (metadata['og:site_name']) {
    tags.push(metadata['og:site_name']);
  }

  return {
    title: metadata['og:title'] || document.title,
    description: metadata['og:description'] || metadata['description'] || '',
    siteName: metadata['og:site_name'] || window.location.hostname,
    tags: Array.from(new Set(tags)).filter(Boolean),
    raw: metadata,
  };
}
