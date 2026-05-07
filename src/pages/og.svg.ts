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
      <stop offset="0%" stop-color="#09090b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <radialGradient id="glow1" cx="0.15" cy="0.05" r="0.7">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="0.9" cy="0.12" r="0.55">
      <stop offset="0%" stop-color="#fb7185" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#fb7185" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow1)"/>
  <rect width="1200" height="630" fill="url(#glow2)"/>
  <rect x="56" y="56" width="1088" height="518" rx="24" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.12)"/>
  <text x="92" y="122" fill="#94a3b8" font-size="22" font-family="'JetBrains Mono','Fira Code',monospace" letter-spacing="2">KYRUX_LABS</text>
  <text x="92" y="214" fill="#e4e4e7" font-size="60" font-family="'Geist Sans','Inter',sans-serif" font-weight="700">${esc(title)}</text>
  <text x="92" y="272" fill="#a1a1aa" font-size="28" font-family="'JetBrains Mono','Fira Code',monospace">${esc(subtitle)}</text>
  <rect x="92" y="470" width="274" height="44" rx="22" fill="rgba(34,211,238,0.14)" stroke="rgba(34,211,238,0.35)"/>
  <text x="118" y="499" fill="#67e8f9" font-size="20" font-family="'JetBrains Mono','Fira Code',monospace">web • ctf • offensive</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600"
    }
  });
}

