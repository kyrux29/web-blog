import type { APIContext } from "astro";

export async function GET({ url }: APIContext) {
  const title = (url.searchParams.get("title") ?? "Kyrux Labs").slice(0, 90);
  const subtitle = (url.searchParams.get("subtitle") ?? "Web Exploitation & CTF Write-ups").slice(0, 120);

  const esc = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#f1eeeb"/>
      <stop offset="100%" stop-color="#d9d3d0"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.15" cy="0.05" r="0.7">
      <stop offset="0%" stop-color="#c7193f" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#c7193f" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.9" cy="0.12" r="0.55">
      <stop offset="0%" stop-color="#8f1028" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#8f1028" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="724" y="-60" width="620" height="780" fill="#c7193f" transform="rotate(8 1034 330)"/>
  <rect x="56" y="56" width="1088" height="518" fill="none" stroke="rgba(23,16,18,0.16)"/>
  <rect x="92" y="88" width="174" height="42" fill="#140d0f"/>
  <text x="110" y="116" fill="#fff9f7" font-size="18" font-family="'IBM Plex Mono',monospace" letter-spacing="2">KYRUX / LABS</text>
  <text x="92" y="235" fill="#140d0f" font-size="60" font-family="'Arial Black',sans-serif" font-weight="800">${esc(title)}</text>
  <text x="92" y="298" fill="#57474c" font-size="26" font-family="'IBM Plex Mono',monospace">${esc(subtitle)}</text>
  <rect x="92" y="470" width="294" height="44" fill="#140d0f"/>
  <text x="116" y="499" fill="#ef7780" font-size="19" font-family="'IBM Plex Mono',monospace">web / ctf / offensive</text>
  <text x="890" y="430" fill="#fff9f7" font-size="270" font-family="'Arial Black',sans-serif" font-weight="900" transform="rotate(-8 890 430)">K</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
