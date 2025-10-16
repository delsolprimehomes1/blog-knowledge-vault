// Prefetch utility for related articles and images
export const prefetchImage = (url: string) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'image';
  link.href = url;
  document.head.appendChild(link);
};

export const prefetchArticle = (slug: string) => {
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = `/blog/${slug}`;
  document.head.appendChild(link);
};

// DNS prefetch for external domains
export const dnsPrefetch = (domain: string) => {
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = domain;
  document.head.appendChild(link);
};
