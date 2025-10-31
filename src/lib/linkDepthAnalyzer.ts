// Link Depth Analyzer - BFS Algorithm to Calculate Click Distance from Homepage

export interface LinkDepthNode {
  url: string;
  depth: number;
  parentUrl: string | null;
}

export interface LinkDepthReport {
  nodeDepths: Map<string, number>; // url -> depth
  orphanArticles: string[]; // URLs not reachable from homepage
  maxDepth: number;
  averageDepth: number;
  pathMap: Map<string, string[]>; // url -> path from homepage
}

/**
 * Valid static routes in the application
 */
const STATIC_ROUTES = [
  '/',
  '/blog',
  '/about',
  '/faq',
  '/qa',
  '/case-studies',
  '/privacy-policy',
  '/terms-of-service',
];

/**
 * Calculate link depth for all pages using BFS
 * Starting from homepage, traverse all internal links
 */
export function calculateLinkDepth(
  articles: Array<{ slug: string; internal_links: any[] }>,
  categories: string[]
): LinkDepthReport {
  
  const nodeDepths = new Map<string, number>();
  const pathMap = new Map<string, string[]>();
  const visited = new Set<string>();
  const queue: LinkDepthNode[] = [];

  // Start from homepage (depth 0)
  const homepage = '/';
  queue.push({ url: homepage, depth: 0, parentUrl: null });
  nodeDepths.set(homepage, 0);
  pathMap.set(homepage, [homepage]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    
    if (visited.has(current.url)) continue;
    visited.add(current.url);

    const currentPath = pathMap.get(current.url) || [current.url];

    // Get all outgoing links from this page
    const outgoingLinks = getOutgoingLinks(current.url, articles, categories);

    for (const link of outgoingLinks) {
      if (!visited.has(link)) {
        const newDepth = current.depth + 1;
        
        // Only update if this is a shorter path
        if (!nodeDepths.has(link) || nodeDepths.get(link)! > newDepth) {
          nodeDepths.set(link, newDepth);
          pathMap.set(link, [...currentPath, link]);
          queue.push({ url: link, depth: newDepth, parentUrl: current.url });
        }
      }
    }
  }

  // Find orphan articles (articles not reached)
  const orphanArticles: string[] = [];
  for (const article of articles) {
    const articleUrl = `/blog/${article.slug}`;
    if (!nodeDepths.has(articleUrl)) {
      orphanArticles.push(articleUrl);
    }
  }

  // Calculate statistics
  const depths = Array.from(nodeDepths.values());
  const maxDepth = depths.length > 0 ? Math.max(...depths) : 0;
  const averageDepth = depths.length > 0 
    ? depths.reduce((a, b) => a + b, 0) / depths.length 
    : 0;

  return {
    nodeDepths,
    orphanArticles,
    maxDepth,
    averageDepth: Math.round(averageDepth * 10) / 10,
    pathMap,
  };
}

/**
 * Get all outgoing internal links from a given page
 */
function getOutgoingLinks(
  url: string,
  articles: Array<{ slug: string; internal_links: any[] }>,
  categories: string[]
): string[] {
  const links: string[] = [];

  // Homepage links to all static pages and blog index
  if (url === '/') {
    links.push('/blog', '/about', '/faq', '/qa', '/case-studies');
    return links;
  }

  // Blog index links to all articles and category pages
  if (url === '/blog') {
    for (const article of articles) {
      links.push(`/blog/${article.slug}`);
    }
    for (const category of categories) {
      links.push(`/blog/category/${category}`);
    }
    return links;
  }

  // Category pages link to articles in that category
  if (url.startsWith('/blog/category/')) {
    const categorySlug = url.replace('/blog/category/', '');
    for (const article of articles) {
      // Simplified: assume articles can link from category pages
      links.push(`/blog/${article.slug}`);
    }
    return links;
  }

  // Article pages link to other articles and static pages
  if (url.startsWith('/blog/')) {
    const articleSlug = url.replace('/blog/', '');
    const article = articles.find(a => a.slug === articleSlug);
    
    if (article && article.internal_links) {
      for (const link of article.internal_links) {
        if (link.url) {
          links.push(link.url);
        }
      }
    }
    
    // Articles also implicitly link to parent category
    links.push('/blog'); // Back to blog index
    return links;
  }

  // Static pages link back to homepage and each other
  if (STATIC_ROUTES.includes(url)) {
    links.push('/'); // All pages link to homepage
    if (url !== '/blog') links.push('/blog');
    return links;
  }

  return links;
}

/**
 * Get articles that exceed the maximum depth threshold
 */
export function getArticlesExceedingDepth(
  report: LinkDepthReport,
  maxDepthThreshold: number = 3
): Array<{ url: string; depth: number; path: string[] }> {
  
  const exceedingArticles: Array<{ url: string; depth: number; path: string[] }> = [];

  for (const [url, depth] of report.nodeDepths.entries()) {
    if (url.startsWith('/blog/') && depth > maxDepthThreshold) {
      exceedingArticles.push({
        url,
        depth,
        path: report.pathMap.get(url) || [],
      });
    }
  }

  return exceedingArticles.sort((a, b) => b.depth - a.depth);
}

/**
 * Generate recommendations for improving link depth
 */
export function generateDepthRecommendations(
  report: LinkDepthReport
): string[] {
  const recommendations: string[] = [];

  // Orphan articles
  if (report.orphanArticles.length > 0) {
    recommendations.push(
      `${report.orphanArticles.length} orphan article(s) are not reachable from the homepage. Add internal links to these articles.`
    );
  }

  // High average depth
  if (report.averageDepth > 2.5) {
    recommendations.push(
      `Average link depth is ${report.averageDepth} clicks. Consider adding more cross-linking between related articles.`
    );
  }

  // Articles too deep
  const deepArticles = getArticlesExceedingDepth(report, 3);
  if (deepArticles.length > 0) {
    recommendations.push(
      `${deepArticles.length} article(s) are more than 3 clicks from the homepage. Add direct links from blog index or category pages.`
    );
  }

  // Perfect state
  if (recommendations.length === 0) {
    recommendations.push('✓ All articles are optimally positioned within 3 clicks from homepage');
  }

  return recommendations;
}
