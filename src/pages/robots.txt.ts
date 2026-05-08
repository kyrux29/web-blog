// Dynamic robots.txt – allows all crawlers, points to the sitemap.
import type { APIContext } from "astro";

export async function GET({ site }: APIContext) {
  const base = (site ?? new URL("https://kyrux29.github.io")).origin;
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${base}/sitemap-index.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
