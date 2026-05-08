// security.txt – vulnerability disclosure policy (RFC 9116).
// Served from /.well-known/security.txt
import type { APIContext } from "astro";

export async function GET({ site }: APIContext) {
  const base = (site ?? new URL("https://kyrux29.github.io")).origin;
  const body = [
    "Contact: mailto:kyrux@proton.me",
    "Expires: 2027-12-31T23:59:59Z",
    "Preferred-Languages: en, vi",
    "Canonical: " + base + "/.well-known/security.txt",
    "Policy: " + base + "/about/",
    "Acknowledgments: " + base + "/about/",
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
