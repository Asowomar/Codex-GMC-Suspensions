export function extractSitemapsFromRobots(robotsTxt: string): string[] {
  const lines = robotsTxt.split(/\r?\n/);
  const sitemaps: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*Sitemap:\s*(.+)\s*$/i);
    if (match?.[1]) {
      sitemaps.push(match[1].trim());
    }
  }
  return Array.from(new Set(sitemaps));
}
