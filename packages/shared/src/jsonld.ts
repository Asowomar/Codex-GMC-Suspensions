export function extractJsonLdObjects(html: string): unknown[] {
  const scripts = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  const results: unknown[] = [];
  for (const script of scripts) {
    const contentMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    if (!contentMatch?.[1]) continue;
    const raw = contentMatch[1].trim();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        results.push(...parsed);
      } else {
        results.push(parsed);
      }
    } catch {
      const cleaned = raw.replace(/\n|\t/g, " ");
      try {
        const parsed = JSON.parse(cleaned);
        results.push(parsed);
      } catch {
        continue;
      }
    }
  }
  return results;
}

export function findProductJsonLd(objs: unknown[]): Record<string, unknown>[] {
  const products: Record<string, unknown>[] = [];
  for (const obj of objs) {
    if (typeof obj !== "object" || obj === null) continue;
    const type = (obj as any)["@type"];
    if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) {
      products.push(obj as Record<string, unknown>);
      continue;
    }
    const graph = (obj as any)["@graph"];
    if (Array.isArray(graph)) {
      for (const item of graph) {
        if (item?.["@type"] === "Product") {
          products.push(item as Record<string, unknown>);
        }
      }
    }
  }
  return products;
}
